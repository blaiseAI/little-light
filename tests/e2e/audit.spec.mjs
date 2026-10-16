import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {writeFile} from 'node:fs/promises';
test.beforeEach(async({},info)=>test.skip(info.project.name!=='desktop','Detailed audit runs once; journeys run on six devices.'));
const record={};
const seed=async page=>page.addInitScript(()=>{sessionStorage.setItem('little-light-session-heard','yes');localStorage.setItem('little-light-install',JSON.stringify({dismissals:2}));});
test('collect axe, target sizes, keyboard modal behavior and invalid links',async({page})=>{
 test.setTimeout(180000); await seed(page);
 for(const state of ['landing','reader','quiz','sound','install']){
  await page.goto(state==='landing'||state==='install'?'/':'/play/?story=next');
  if(state==='quiz')await page.locator('#skip').click();
  if(state==='sound')await page.evaluate(()=>openHear(null));
  if(state==='install')await page.evaluate(()=>LL_install.open());
  const axe=await new AxeBuilder({page}).analyze();record[state]={axe:axe.violations.map(v=>({id:v.id,impact:v.impact,description:v.description,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})),smallTargets:await page.locator('button,a,summary').evaluateAll(els=>els.filter(e=>{const r=e.getBoundingClientRect();return r.width&&r.height&&(r.width<44||r.height<44)&&getComputedStyle(e).visibility!=='hidden'}).map(e=>({text:e.textContent.trim(),id:e.id,width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height})))};
  await page.screenshot({path:`qa/screenshots/audit-${state}.png`,fullPage:state==='landing'});
  if(state==='sound'||state==='install'){
   const selector=state==='sound'?'#hear':'.ll-install';let escaped=false;
   for(let i=0;i<12;i++){await page.keyboard.press('Tab');if(!await page.evaluate(s=>document.querySelector(s).contains(document.activeElement),selector)){escaped=true;break;}}
   record[state].focusEscapes=escaped;record[state].escapedTarget=await page.evaluate(()=>document.activeElement.outerHTML.slice(0,250));
   await page.screenshot({path:`qa/screenshots/focus-${state}.png`});
  }
 }
 for(const query of ['does-not-exist','next']){await page.goto('/play/?story='+query);if(query==='next')await page.keyboard.press('Escape');record[query]={text:(await page.locator('body').innerText()).slice(-1800),open:await page.locator('#lesson').evaluate(e=>e.classList.contains('open'))};await page.screenshot({path:`qa/screenshots/${query==='next'?'escape':'invalid'}.png`});}
 await writeFile('qa/audit-data.json',JSON.stringify(record,null,2));
});
test('saved states, stale resume, storage blocked and reduced motion',async({page})=>{
 await seed(page);await page.goto('/');const ids=await page.evaluate(()=>LL_WEEKS.flatMap(w=>w.stories.map(s=>s.id)));
 for(const count of [3,21]){
 await page.evaluate(({ids,count})=>localStorage.setItem('little-light',JSON.stringify({done:ids.slice(0,count),xp:count*10,streak:3})),{ids,count});await page.reload();await page.locator('#light-toggle').click();await expect(page.locator('#light-stories')).toHaveText(String(count));await expect(page.locator('#light-stars')).toHaveText(String(count*10));
 await page.locator('#light-continue').click();await page.screenshot({path:`qa/screenshots/progress-${count}.png`});
 record['progress'+count]={lessonOpen:await page.locator('#lesson').evaluate(e=>e.classList.contains('open')),body:(await page.locator('body').innerText()).slice(-1000)};await page.goto('/');
 }
 await page.evaluate(id=>{localStorage.removeItem('little-light');localStorage.setItem('little-light-resume',JSON.stringify({id,phase:'story',page:3,savedAt:Date.now()-8*864e5}));},ids[0]);await page.goto('/play/?story=next');await expect(page.locator('#reading-label')).toContainText('page 1');await expect(page.locator('#resume-note')).toBeHidden();
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');await expect(page.locator('body')).toHaveClass(/motion-off/);
 await page.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw new DOMException('blocked','SecurityError')}}));await page.reload();await page.locator('#light-toggle').click();await expect(page.locator('#light-message')).toContainText('couldn’t read');await page.screenshot({path:'qa/screenshots/storage-blocked.png'});await page.goto('/play/?story=next');await expect(page.locator('#reading-label')).toContainText('page 1');
 await writeFile('qa/states-data.json',JSON.stringify(record,null,2));
});
test('offline shell and all recordings download',async({page,context})=>{
 test.setTimeout(180000);await seed(page);await page.goto('/');await page.evaluate(()=>navigator.serviceWorker.ready);await page.reload();await context.setOffline(true);await page.reload();await page.locator('[data-od-id="start-adventure"]').click();await expect(page.locator('#reading-label')).toContainText('page 1');
 const first=await page.evaluate(async()=>{const r=await fetch(''+ROOT+'audio/'+L.story.id+'-1.mp3');return r.status;});record.offlineFirstClipStatus=first;await page.screenshot({path:'qa/screenshots/offline-first.png'});
 await context.setOffline(false);await page.goto('/');await page.locator('#light-toggle').click();await page.locator('#light-offline').click();await expect(page.locator('#light-offline-status')).toContainText('All 21 stories',{timeout:120000});
 const ids=await page.evaluate(()=>LL_WEEKS.flatMap(w=>w.stories.map(s=>s.id)));await page.evaluate(ids=>localStorage.setItem('little-light',JSON.stringify({done:ids.slice(0,14)})),ids);await context.setOffline(true);await page.goto('/play/?story='+ids[14]);await expect(page.locator('#reading-label')).toContainText('page 1');expect(await page.evaluate(async()=>{const r=await fetch(ROOT+'audio/'+L.story.id+'-1.mp3');return r.status;})).toBe(200);await page.locator('#skip').click();await expect(page.locator('#qplay')).toBeVisible();await page.screenshot({path:'qa/screenshots/offline-saved.png'});await context.setOffline(false);
 await writeFile('qa/offline-data.json',JSON.stringify({firstVisitAudioStatus:first,downloadAll:'passed',neverOpenedStory:ids[14]},null,2));
});
test('Slow 4G cold navigation measurements',async({browser})=>{
 test.setTimeout(120000);const out=[]; for(const url of ['/','/play/?story=next']){const context=await browser.newContext({serviceWorkers:'block'});const page=await context.newPage();const cdp=await context.newCDPSession(page);await cdp.send('Network.enable');await cdp.send('Network.setCacheDisabled',{cacheDisabled:true});await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:150,downloadThroughput:200000,uploadThroughput:93750});
 await page.goto('http://localhost:4183'+url);await page.waitForTimeout(1500);out.push(await page.evaluate(()=>({url:location.href,navigation:performance.getEntriesByType('navigation').map(n=>({domContentLoaded:n.domContentLoadedEventEnd,load:n.loadEventEnd,transferSize:n.transferSize})),resources:performance.getEntriesByType('resource').map(r=>({name:r.name,transferSize:r.transferSize,encodedBodySize:r.encodedBodySize,duration:r.duration}))})));await context.close();}await writeFile('qa/performance.json',JSON.stringify(out,null,2));
});

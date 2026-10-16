import {test,expect} from '@playwright/test';
import {quiet,solve} from './helpers.mjs';
import {writeFile} from 'node:fs/promises';
test.beforeEach(async({},info)=>test.skip(info.project.name!=='desktop'));
test('keyboard activation through all first-story exercises',async({page})=>{
 await quiet(page);await page.goto('/play/?story=next');await solve(page,true);await expect(page.locator('#stage')).toContainText('You lit a star');
});
test('complete offline after save-all, and inspect content and clip metadata',async({page,context})=>{
 test.setTimeout(120000);await quiet(page);await page.goto('/');await page.evaluate(()=>navigator.serviceWorker.ready);await page.reload();await page.locator('#light-toggle').click();await page.locator('#light-offline').click();await expect(page.locator('#light-offline-status')).toContainText('All 21 stories',{timeout:90000});await context.setOffline(true);await page.goto('/play/?story=next');await solve(page);await expect(page.locator('#stage')).toContainText('You lit a star');await page.locator('#check').click();await expect(page.locator('.is-done')).toHaveCount(1);await context.setOffline(false);
 const content=await page.evaluate(()=>LL_WEEKS.map(w=>({week:w.title,samples:w.stories.slice(0,2).map(s=>({id:s.id,text:s.pages[0].text,quote:s.pages[0].quote})),longVerses:w.stories.flatMap(s=>s.ex.filter(e=>e.type==='build'&&e.words.length>=10).map(e=>({story:s.title,words:e.words.length,verse:e.words.join(' ')})))})));
 await writeFile('qa/content-samples.json',JSON.stringify(content,null,2));
});

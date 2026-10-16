export async function quiet(page){await page.addInitScript(()=>{sessionStorage.setItem('little-light-session-heard','yes');localStorage.setItem('little-light-install',JSON.stringify({dismissals:2}));});}
export async function solve(page,keyboard=false){
 for(let guard=0;guard<40;guard++){
  const l=await page.evaluate(()=>({phase:L.phase,ex:L.current}));
  const hit=async selector=>{if(keyboard){await page.locator(selector).focus();await page.keyboard.press('Space');}else await page.locator(selector).click();};
  if(l.phase==='done')return;
  if(l.phase==='story'){await hit('#check');continue;}
  if(l.phase!=='answer'){await hit('#check');continue;}
  const e=l.ex;
  if(e.type==='choose'){await hit(`.choice[data-i="${e.answer}"]`);await hit('#check');}
  else if(e.type==='pairs'){for(let i=0;i<e.pairs.length;i++){await hit(`.pair[data-side="l"][data-i="${i}"]`);await hit(`.pair[data-side="r"][data-i="${i}"]`);}await page.waitForTimeout(850);}
  else {for(const w of e.words.slice(e.given||0)){const b=page.locator('#bank .tile:not(.ghost)').filter({hasText:new RegExp('^'+w.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'$')}).first();if(keyboard){await b.focus();await page.keyboard.press('Space');}else await b.click();}await hit('#check');}
  await hit('#check');
 }
 throw new Error('Story did not finish in 40 transitions');
}

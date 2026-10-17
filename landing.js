
const reduced=matchMedia('(prefers-reduced-motion: reduce)');let paused=reduced.matches;
const motion=document.getElementById('motion');function syncMotion(){document.body.classList.toggle('motion-off',paused);motion.setAttribute('aria-pressed',String(paused));motion.textContent=paused?'Enable playful motion':'Pause playful motion'}syncMotion();motion.onclick=()=>{paused=!paused;syncMotion()};reduced.addEventListener('change',e=>{paused=e.matches;syncMotion()});
const observer=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){if(!paused)e.target.classList.add('in');observer.unobserve(e.target)}}),{threshold:.12});document.querySelectorAll('.reveal, section h2').forEach(el=>{el.classList.add('reveal');observer.observe(el)});
const storyworld=document.querySelector('.storyworld');let sceneFrame=0;
function updateStoryworld(){sceneFrame=0;const rect=storyworld.getBoundingClientRect();const still=paused||reduced.matches||window.innerWidth<=920;const travel=still?0:Math.max(0,Math.min(-rect.top,rect.height));storyworld.style.setProperty('--scene-travel',Math.min(travel*.075,46)+'px');storyworld.style.setProperty('--copy-travel',Math.min(travel*.035,20)+'px')}
function queueStoryworld(){if(!sceneFrame)sceneFrame=requestAnimationFrame(updateStoryworld)}
window.addEventListener('scroll',queueStoryworld,{passive:true});window.addEventListener('resize',queueStoryworld,{passive:true});motion.addEventListener('click',queueStoryworld);reduced.addEventListener('change',queueStoryworld);updateStoryworld();
// Rest Pip while the hero is offscreen or the browser tab is hidden.
let pipVisible=true;function restPip(){storyworld.classList.toggle('pip-resting',!pipVisible||document.hidden)}
new IntersectionObserver(entries=>{pipVisible=entries[0].isIntersecting;restPip()},{threshold:0}).observe(storyworld);
document.addEventListener('visibilitychange',restPip);


document.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-filter]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));document.querySelectorAll('[data-category]').forEach(c=>c.hidden=b.dataset.filter!=='all'&&c.dataset.category!==b.dataset.filter)});
/* Verse demo: a small taste of the game. Words fill slots in order; wrong words wobble, and the answer is
   only named after a second miss. Sound and Heart narration follow the shared sound setting (sound.js). */
(()=>{
const answer=['The','Lord','is','my','shepherd'];
const game=document.querySelector('.verse-game'); if(!game) return;
const slots=document.getElementById('verse'), bank=document.getElementById('words'), status=document.getElementById('status'),
  cta=document.getElementById('verse-cta'), stars=[...document.querySelectorAll('.star-progress svg')];
let selected=[], misses=0;
const soundOn=()=>typeof Sound!=='undefined'&&Sound.isOn();
const sfx=(n)=>{ if(typeof Sound!=='undefined') Sound.play(n); };
const voice=new Audio(); voice.preload='none';
const say=(file)=>{ if(!soundOn()) return; try{ voice.pause(); voice.src='audio/'+file; const p=voice.play(); if(p&&p.catch) p.catch(()=>{}); }catch{} };
const shuffle=(list)=>{ let x; do { x=list.slice(); for(let i=x.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [x[i],x[j]]=[x[j],x[i]]; } } while(x.join()===list.join()); return x; };
function setup(){
  selected=[]; misses=0; game.classList.remove('complete'); cta.hidden=true;
  stars.forEach(st=>st.classList.remove('lit'));
  slots.innerHTML=answer.map(()=>'<span class="slot"></span>').join(''); slots.setAttribute('aria-label','Your verse: empty');
  status.textContent='Tap the words in order. Which word comes first?';
  bank.innerHTML='';
  shuffle(answer).forEach(word=>{
    const b=document.createElement('button'); b.type='button'; b.className='word'; b.textContent=word; b.dataset.odId='word-'+word.toLowerCase();
    b.onclick=()=>{
      if(b.disabled||selected.length===answer.length) return;
      const want=answer[selected.length];
      if(word!==want){
        misses++; sfx('miss');
        b.classList.remove('wobble'); void b.offsetWidth; b.classList.add('wobble');
        status.textContent=misses>=2?'Try “'+want+'” next.':'Not quite. Which word comes next?';
        return;
      }
      misses=0; selected.push(word); b.disabled=true; b.classList.add('used');
      const slot=slots.children[selected.length-1]; slot.textContent=word; slot.classList.add('filled');
      if(stars[selected.length-1]) stars[selected.length-1].classList.add('lit');
      slots.setAttribute('aria-label','Your verse: '+selected.join(' '));
      sfx('tap'); say('w/'+word.toLowerCase()+'.mp3');
      if(selected.length===answer.length){
        game.classList.add('complete'); status.textContent='You did it! A little verse to carry with you.';
        sfx('done'); setTimeout(()=>say('help/verse-psalm-23-1.mp3'),900);
        cta.hidden=false;
      } else status.textContent='Lovely! Which word comes next?';
    };
    bank.append(b);
  });
}
// The invitation matches where the child is: first story, or the next one
try{ const saved=JSON.parse(localStorage.getItem('little-light')||'{}'); if((saved.done||[]).length){ document.getElementById('verse-cta-label').textContent='Continue my journey'; document.getElementById('verse-cta-icon').innerHTML='<svg class="action-icon" data-icon="book" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M12 6.5C9 4.5 5.5 4.2 3 5v14c2.5-.8 6-.5 9 1.5 3-2 6.5-2.3 9-1.5V5c-2.5-.8-6-.5-9 1.5Zm0 0v14"/></svg>'; } }catch{}
setup();
document.getElementById('reset').onclick=setup;
})();

/* Weekly journey reads the existing app progress without creating completion records. */
(()=>{
const weeks=(window.LL_WEEKS||[]).map(w=>({id:w.id,title:w.title,stories:w.stories.map(st=>({id:st.id,title:st.title,verse:st.verse,ref:st.ref,intro:(st.pages&&st.pages[0]&&st.pages[0].text)||''}))}));
const all=weeks.flatMap(w=>w.stories);let completed=new Set(),connected=false,collectionData=null,collectionUnavailable=false;
function readProgress(){collectionData=null;collectionUnavailable=false;try{const raw=localStorage.getItem('little-light');const saved=raw?JSON.parse(raw):null;connected=!!saved&&Array.isArray(saved.done);if(raw&&!connected)collectionUnavailable=true;collectionData=connected?saved:null;completed=new Set(connected?saved.done.filter(id=>all.some(s=>s.id===id)):[])}catch{completed=new Set();connected=false;collectionUnavailable=true}}
function renderCollection(){const safe=v=>Number.isSafeInteger(v)&&v>=0?v:0;const stars=safe(collectionData?.xp),days=safe(collectionData?.streak);el('light-nav-count').textContent=collectionUnavailable?'—':stars;el('light-stars').textContent=collectionUnavailable?'—':stars;el('light-stories').textContent=collectionUnavailable?'—':completed.size;el('light-days').textContent=collectionUnavailable?'—':days;el('light-title').textContent=collectionUnavailable?'Your light is still yours.':stars||completed.size?'Look how your light grows.':'Every little star begins somewhere.';el('light-message').textContent=collectionUnavailable?'We couldn’t read saved progress in this browser.':connected?'Little discoveries, collected one story at a time.':'No saved collection on this site yet. Your first story is waiting.';const allLit=connected&&all.every(s=>completed.has(s.id));el('light-continue').textContent=allLit?'See all my stars':connected?'Continue my journey':'Start my first story';document.querySelectorAll('a[href="play/?story=next"],a[href="#stories"][data-next]').forEach(a=>{if(allLit){a.dataset.next='';a.setAttribute('href','#stories')}else if(a.hasAttribute('data-next')){a.setAttribute('href','play/?story=next');a.removeAttribute('data-next')}});el('light-device-note').textContent=collectionUnavailable?'Browser storage is unavailable or the saved data couldn’t be read. Nothing has been reset. Open the app to check your collection.':'Saved only in this browser, for this site. No cloud sync. Clearing site data removes progress.';}

readProgress();let first=all.findIndex(s=>!completed.has(s.id));let active=first<0?2:Math.floor(first/7),chosen=first<0?all[20].id:all[first].id;
const el=id=>document.getElementById(id);const escape=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const storyBook='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 6.5C9 4.5 5.5 4.2 3 5v14c2.5-.8 6-.5 9 1.5 3-2 6.5-2.3 9-1.5V5c-2.5-.8-6-.5-9 1.5Zm0 0v14"/></svg>';const storyLantern='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6V5a3 3 0 0 1 6 0v1M7 7h10M7 21h10M8 7 6 19h12L16 7M12 11v4M10 13h4"/></svg>';
const check='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>';
/* A story left halfway in the game (saved place, kept a week) */
const halfway=id=>{try{const r=JSON.parse(localStorage.getItem('little-light-resume')||'null');return !!r&&r.id===id&&!completed.has(id)&&Date.now()-r.savedAt<7*864e5}catch{return false}};
function state(story){return completed.has(story.id)?'done':all.findIndex(s=>s.id===story.id)===first?'current':'upcoming'}
function details(){const story=all.find(s=>s.id===chosen),kind=state(story);el('journey-status').textContent=halfway(story.id)?'Halfway there · pick up where you left off':kind==='done'?'Completed · revisit this story':kind==='current'?(connected?'Your next little step':'Start here · Your first little step'):'Coming up on your journey';el('journey-story-title').textContent=story.title;el('journey-intro').textContent=story.intro;el('journey-verse').textContent=story.verse;el('journey-ref').textContent=story.ref;el('journey-open').hidden=kind==='upcoming';el('journey-open').href='play/?story='+encodeURIComponent(story.id);el('journey-open-label').textContent=halfway(story.id)?'Keep going':'Read this story';el('journey-unlock').hidden=kind!=='upcoming';el('journey-unlock').textContent='Finish the earlier stories in the app to reach this stop.';document.querySelectorAll('.journey-node').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.story===chosen)))}
function render(){renderCollection();const week=weeks[active],count=week.stories.filter(s=>completed.has(s.id)).length;el('journey-total').textContent=connected?completed.size:21;el('journey-total-label').textContent=connected?'stories completed':'stories to discover';el('journey-tabs').innerHTML=weeks.map((w,i)=>`<button class="journey-tab" data-week="${i}" data-od-id="journey-week-${i+1}" aria-pressed="${i===active}"><span>Week ${i+1}</span><strong>${escape(w.title)}</strong><span class="chapter-progress">${w.stories.filter(st=>completed.has(st.id)).length===7?"Chapter complete":i===Math.floor(first/7)?"Your current chapter":"7 stories to discover"}</span></button>`).join('');el('journey-week-title').textContent=week.title;el('journey-guide-message').textContent=count===7?'A whole chapter of light.':active===Math.floor(first/7)?(completed.size===0?'Pip saved you a place.':'Welcome back, little explorer.'):'A new chapter is waiting.';el('journey-week-note').textContent=active===Math.floor(first/7)?'Here is where your next chapter begins.':'Seven stories to explore, in order.';el('journey-count').textContent=count+' of 7 completed';el('journey-progress').value=count;el('journey-path').innerHTML=week.stories.map((st,i)=>{const kind=state(st),label=kind==='done'?'Completed':halfway(st.id)?'Halfway there':kind==='current'?'You are here':'Coming up';return `<li class="journey-stop is-${kind}"><button class="journey-node" data-story="${st.id}" data-od-id="journey-story-${st.id}" aria-pressed="${chosen===st.id}" aria-label="Story ${i+1}: ${escape(st.title)}, ${label}${kind==='upcoming'?'':kind==='done'?'. Read it again':halfway(st.id)?'. Keep going':'. Start the story'}"><span class="stop-symbol" aria-hidden="true">${kind==='done'?check:kind==='current'?storyLantern:storyBook}<span class="stop-number">${i+1}</span></span>${kind==='current'?`<span class="start-flag">${halfway(st.id)?'Keep going':completed.size===0?'Start here':'You are here'}</span>`:''}<strong>${escape(st.title)}</strong><span class="stop-state">${label}</span></button></li>`}).join('');el('journey-storage').textContent=connected?'Showing saved progress available on this site. Finish stories in the app to move forward.':'Journey preview · Your app progress is not connected here. Open the app to start or continue your saved journey.';details();scheduleTrail()}

function drawTrail(){const host=el('journey-trail'),svg=el('journey-connections'),list=el('journey-path');if(!host.getBoundingClientRect||!list.querySelectorAll)return;const bounds=host.getBoundingClientRect();const nodes=[...list.querySelectorAll('.stop-symbol')];svg.setAttribute('viewBox',`0 0 ${bounds.width} ${bounds.height}`);svg.innerHTML=nodes.slice(1).map((node,i)=>{const a=nodes[i].getBoundingClientRect(),b=node.getBoundingClientRect();const x1=a.left+a.width/2-bounds.left,y1=a.top+a.height/2-bounds.top,x2=b.left+b.width/2-bounds.left,y2=b.top+b.height/2-bounds.top;const vertical=window.innerWidth<=920;const d=vertical?`M${x1} ${y1} C${x1} ${(y1+y2)/2},${x2} ${(y1+y2)/2},${x2} ${y2}`:`M${x1} ${y1} C${(x1+x2)/2} ${y1},${(x1+x2)/2} ${y2},${x2} ${y2}`;const done=nodes[i].closest('.journey-stop').classList.contains('is-done');return `<path class="trail-bed" d="${d}"/><path class="${done?'trail-complete':'trail-dashes'}" d="${d}"/>`}).join('')}
function scheduleTrail(){if(typeof requestAnimationFrame==='function')requestAnimationFrame(drawTrail)}
window.addEventListener('resize',scheduleTrail,{passive:true});if(typeof ResizeObserver==='function')new ResizeObserver(scheduleTrail).observe(el('journey-trail'));if(document.fonts&&document.fonts.ready)document.fonts.ready.then(scheduleTrail);
el('journey-tabs').addEventListener('click',e=>{const b=e.target.closest('[data-week]');if(!b)return;active=Number(b.dataset.week);chosen=(weeks[active].stories.find(s=>state(s)==='current')||weeks[active].stories[0]).id;render();el('journey-tabs').querySelector(`[data-week="${active}"]`).focus()});el('journey-path').addEventListener('click',e=>{const b=e.target.closest('[data-story]');if(!b)return;chosen=b.dataset.story;details();const i=all.findIndex(s=>s.id===chosen);if(state(all[i])!=='upcoming'){location.href='play/?story='+encodeURIComponent(chosen);return}nudge(b,all[i-1])});const nudgeTimers=new WeakMap();function nudge(b,before){if(typeof Sound!=='undefined')Sound.play('bonk');const note=b.querySelector('.stop-state'),msg='Finish “'+before.title+'” first';note.textContent=msg;el('journey-unlock').textContent=msg+' to reach this stop.';b.classList.remove('nudge');void b.offsetWidth;b.classList.add('nudge');clearTimeout(nudgeTimers.get(b));nudgeTimers.set(b,setTimeout(()=>{b.classList.remove('nudge');note.textContent='Coming up'},3000))}window.addEventListener('storage',e=>{if(e.key==='little-light'||e.key===null){readProgress();first=all.findIndex(s=>!completed.has(s.id));render()}});render();
const collection=el('light-collection');
function closeCollection(){collection.open=false;el('light-toggle').focus?.()}
el('light-close').addEventListener('click',closeCollection);
collection.addEventListener('toggle',()=>{if(collection.open){readProgress();first=all.findIndex(s=>!completed.has(s.id));render()}});
window.addEventListener('keydown',e=>{if(e.key==='Escape'&&collection.open)closeCollection()});
window.addEventListener('click',e=>{if(collection.open&&!collection.contains(e.target))collection.open=false});
window.addEventListener('focus',()=>{readProgress();first=all.findIndex(s=>!completed.has(s.id));render()});

})();

/* Sound On/Off for the game (the landing page itself makes no sound) */
(()=>{const b=document.getElementById('landing-sound');if(!b)return;const label=document.getElementById('sound-setting-label');
let on=true;try{on=localStorage.getItem('little-light-sound')!=='off'}catch{}
const paint=()=>{b.setAttribute('aria-pressed',String(on));label.textContent=on?'Sound: on':'Sound: off'};paint();
b.addEventListener('click',()=>{on=!on;if(typeof Sound!=='undefined'){Sound.set(on);if(on)Sound.play('tap')}else{try{localStorage.setItem('little-light-sound',on?'on':'off')}catch{}}paint()})})();

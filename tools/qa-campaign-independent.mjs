// Historical initial campaign-v3 panel checks. Current close-view UI: qa-close-view.mjs.
/** Independent v3 review: actual UI inputs; reads state, never writes progress or player state. */
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const url=process.argv[2]||'http://localhost:5183';
const out='playtest-output/campaign-independent';await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,channel:'chrome'});
const errors=[],checks=[],issues=[],metrics=[];
const inspected=new Set();
const read=p=>p.evaluate(()=>JSON.parse(window.render_game_to_text()));
const tick=(p,ms,draw=false)=>p.evaluate(({ms,draw})=>window.advanceTime(ms,draw),{ms,draw});
async function loaded(p){await p.waitForFunction(()=>window.render_game_to_text&&JSON.parse(window.render_game_to_text()).art==='loaded');await tick(p,0);}
async function capture(p,name){await tick(p,0,true);await p.screenshot({path:`${out}/${name}.png`,fullPage:true});await writeFile(`${out}/${name}.json`,JSON.stringify(await read(p),null,2));}
function candidates(s){const p=s.player.harness;return s.hooks.map(h=>({...h,d:Math.hypot(h.position.x-p.x,h.position.y-p.y,h.position.z-p.z)}));}
const correct=s=>candidates(s).find(h=>h.d<=s.ropeLength+1e-7);
async function hookContrast(p){
 const styles=await p.locator('.hook-target:visible').evaluateAll(els=>els.map(el=>({
  text:el.textContent,color:getComputedStyle(el.firstElementChild).color,background:getComputedStyle(el).backgroundColor,
  selected:el.classList.contains('selected'),pressed:el.getAttribute('aria-pressed'),
 })));
 const luminance=color=>{const channels=color.match(/[\d.]+/g).slice(0,3).map(Number).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;});return channels[0]*.2126+channels[1]*.7152+channels[2]*.0722;};
 for(const style of styles){const a=luminance(style.color),b=luminance(style.background),ratio=(Math.max(a,b)+.05)/(Math.min(a,b)+.05);
  assert.ok(ratio>=4.5,`hook number must have immediate contrast after selection: ${JSON.stringify({...style,ratio})}`);
  assert.equal(style.pressed,String(style.selected));
 }
 assert.equal(styles.filter(s=>s.selected).length,1);
}
async function inspect(p,id){await p.locator(`[data-hook="${id}"]`).click();await tick(p,0);await hookContrast(p);await diagramBounds(p,id);inspected.add(id);}
async function commit(p){await p.locator('#launch').focus();await p.keyboard.press('Space');}
async function diagramMetrics(p,label){
 const result=await p.locator('.flat-triangle text').evaluateAll(els=>els.filter(el=>el.textContent!=='P').map(el=>{
  const m=el.getScreenCTM(),font=parseFloat(getComputedStyle(el).fontSize);return{text:el.textContent,fontPixels:font*Math.hypot(m.a,m.b)};
 }));metrics.push({label,result});
 assert.ok(result.every(r=>r.fontPixels>=16-.01),`diagram labels must render at least16px: ${JSON.stringify({label,result})}`);
 const width=await p.evaluate(()=>[document.documentElement.scrollWidth,innerWidth]);assert.equal(width[0],width[1]);
}
async function diagramBounds(p,label){
 const bounds=await p.locator('.flat-triangle text').evaluateAll(els=>els.map(el=>{
  const t=el.getBoundingClientRect(),s=el.ownerSVGElement.getBoundingClientRect();
  return{text:el.textContent,inside:t.left>=s.left-.5&&t.right<=s.right+.5&&t.top>=s.top-.5&&t.bottom<=s.bottom+.5};
 }));
 assert.ok(bounds.every(b=>b.inside),`SVG text must stay inside its diagram column: ${JSON.stringify({label,bounds})}`);
}
try{
 const context=await browser.newContext({viewport:{width:1280,height:900}}),p=await context.newPage();
 p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await p.goto(url,{waitUntil:'networkidle'});await loaded(p);let s=await read(p);
 assert.equal(s.version,'campaign-v3');assert.equal(s.totalFlights,36);assert.equal(s.totalLevels,12);
 assert.match(await p.locator('.rope-spec').innerText(),/10/);assert.match(await p.locator('.rope-spec').innerText(),/אורך הכבל שלך/);
 const initial={...s.player.position};for(const h of s.hooks){await inspect(p,h.id);s=await read(p);assert.equal(s.mode,'ready');assert.equal(s.stageAttempts,0);assert.equal(s.launches,0);assert.deepEqual(s.player.position,initial);}
 checks.push('Prominent10m rope limit; all3 hook clicks inspect without attempting or moving');await diagramMetrics(p,'desktop-planar');
 await p.locator('#calc').click();s=await read(p);assert.equal(s.progress.resumeHinted,true);
 const starHint=await p.locator('#first-try').textContent();assert.ok(starHint.includes('ללא כוכב')&&!starHint.includes('בניסיון ראשון'));
 await diagramMetrics(p,'desktop-planar-solved');await diagramBounds(p,'desktop-planar-solved');
 await p.locator('#calc').click();
 const wrong=candidates(s).find(h=>h.d>s.ropeLength+1e-7);await inspect(p,wrong.id);await commit(p);s=await read(p);
 assert.equal(s.mode,'ready');assert.equal(s.mistakes,1);assert.deepEqual(s.player.position,initial);
 const feedback=await p.locator('#feedback').textContent();assert.ok(feedback.includes(s.rejection.distance.toFixed(2))&&feedback.includes(s.rejection.shortfall.toFixed(2)));
 const failure=structuredClone(s.rejection);await inspect(p,correct(s).id);assert.deepEqual((await read(p)).rejection,failure);
 checks.push('Space commits; failure gives measured diagonal/rope/shortfall and remains tied to attempted ring');await capture(p,'01-failure-recovery');
 await commit(p);await tick(p,200);assert.equal((await read(p)).mode,'flying');
 await p.locator('#help').click();assert.equal((await read(p)).mode,'paused');
 await p.locator('#map-pause').click();assert.equal((await read(p)).mapOpen,true);
 await p.locator('#close-map').click();s=await read(p);
 assert.equal(s.help,false);assert.equal(s.mode,'flying');assert.equal(await p.locator('.pause-panel').count(),0);
 checks.push('Help to map and back leaves no covering help overlay while flight resumes');
 if(await p.locator('#resume').isVisible())await p.locator('#resume').click();
 await tick(p,2000);s=await read(p);assert.equal(s.hop,1);assert.equal(s.landed,1);
 await p.reload({waitUntil:'networkidle'});await loaded(p);s=await read(p);assert.equal(s.hop,1);assert.equal(s.landed,1);assert.equal(s.mistakes,1);
 checks.push('Physical first landing persists; reload resumes second hop with mistake/hint history');
 let done=0;
 while(true){
  s=await read(p);
  if(s.mode==='finished'){
   done++;
   if(s.level===11)break;
   const before=s.level;await p.locator('#next-level').focus();await p.keyboard.press('Space');await tick(p,0);
   s=await read(p);assert.equal(s.level,before+1);assert.equal(s.hop,0);assert.equal(s.mode,'ready');
   if(s.level===1){await p.reload({waitUntil:'networkidle'});await loaded(p);assert.equal((await read(p)).level,1);}
   continue;
  }
  assert.equal(s.mode,'ready');
  const attempts=s.stageAttempts;
  for(const h of s.hooks)await inspect(p,h.id);
  assert.equal((await read(p)).stageAttempts,attempts);
  if(s.stage===17){
   const near=candidates(s).find(h=>h.d>s.ropeLength&&h.d-s.ropeLength<.04);await inspect(p,near.id);await commit(p);
   const text=await p.locator('#feedback').textContent();assert.ok(text.includes('17.03')&&text.includes('0.03'));checks.push('Near-boundary17.03m rejection exposes0.03m shortfall');
  }
  await inspect(p,correct(s).id);s=await read(p);
  if(s.stage===24){
   await diagramMetrics(p,'desktop-spatial');await capture(p,'02-spatial-desktop');
   await p.setViewportSize({width:390,height:844});await tick(p,0);await diagramMetrics(p,'phone-spatial');await capture(p,'03-spatial-phone');
   await p.locator('#calc').click();await diagramMetrics(p,'phone-spatial-solved');await diagramBounds(p,'phone-spatial-solved');await capture(p,'03b-spatial-phone-help');
   await p.setViewportSize({width:1280,height:900});await tick(p,0);
   await diagramMetrics(p,'desktop-spatial-solved');await diagramBounds(p,'desktop-spatial-solved');await p.locator('#calc').click();
  }
  await commit(p);assert.equal((await read(p)).mode,'flying');await tick(p,2200);
 }
 s=await read(p);assert.equal(done,12);assert.equal(s.progress.unlocked,11);assert.equal(s.progress.records.filter(r=>r.completed).length,12);
 assert.equal(inspected.size,108);checks.push('All108 hook options keep immediate number contrast and labels inside their SVG columns');
 await p.reload({waitUntil:'networkidle'});await loaded(p);s=await read(p);assert.equal(s.mode,'finished');assert.equal(s.level,11);
 checks.push('Normal select+Space inputs complete all36 flights;11Next transitions; final reload preserves all12 levels');
 await p.locator('#next-level').click();assert.equal((await read(p)).mapOpen,true);await capture(p,'04-complete-map');
 await p.locator('#close-map').click();assert.equal((await read(p)).level,11);
 assert.deepEqual(errors,[]);await context.close();
 const phone=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),t=await phone.newPage();
 t.on('pageerror',e=>errors.push(e.message));await t.goto(url,{waitUntil:'networkidle'});await loaded(t);s=await read(t);
 await diagramMetrics(t,'phone-planar');await t.locator('#calc').tap();await diagramMetrics(t,'phone-planar-solved');await diagramBounds(t,'phone-planar-solved');await t.locator('#calc').tap();
 await t.locator(`[data-hook="${correct(s).id}"]`).tap();assert.equal((await read(t)).launches,0);
 await t.locator('#launch').tap();await tick(t,2200);assert.equal((await read(t)).landed,1);
 checks.push('Touch hook tap only inspects; separate Launch tap reaches a saved landing');
 const checkpoint=await read(t);await t.locator('#journey').tap();await t.locator('#open-level').tap();
 assert.equal((await read(t)).hop,checkpoint.hop);assert.equal((await read(t)).landed,checkpoint.landed);
 checks.push('Current unfinished level map entry resumes its saved checkpoint');
 await phone.close();
 checks.push('Desktop and phone planar/spatial labels stay at least16px, before and after calculation help');
 const result={url,date:new Date().toISOString(),checks,issues,metrics,errors,humanFeelVerified:false};
 await writeFile(`${out}/results.json`,JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
}finally{await browser.close();}

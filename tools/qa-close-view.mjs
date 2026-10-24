/** Close-view acceptance. Only normal UI inputs and the public simulation clock.
 * Read-only render text supplies projection measurements; screenshots remain
 * necessary evidence because projected bounds alone cannot prove a good view.
 */
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';

const url=process.argv[2]||'http://localhost:5183';
const out='playtest-output/close-view';
const LIMITS={readyHeightRatio:.13,minReadyHeightPixels:90,hudClearance:12,
  compactHeightDesktop:110,compactHeightPhone:100,compactAreaRatio:.08,mathFontPixels:16};
const SIZES=[{name:'desktop',width:1280,height:900},{name:'short-desktop',width:1280,height:720},
  {name:'in-app',width:885,height:941},{name:'phone',width:390,height:844}];
const REPRESENTATIVE=new Set([0,3,9,18,24,33]);
const errors=[],checks=[],violations=[],samples=[],compactSamples=[],screenshots=[];
const covered=new Map();let browser,currentPage,lastLabel='initial';
const capturedFailures=new Set();
const read=p=>p.evaluate(()=>JSON.parse(window.render_game_to_text()));
const tick=(p,ms,draw=false)=>p.evaluate(({ms,draw})=>window.advanceTime(ms,draw),{ms,draw});
const frames=(p,ms)=>p.evaluate(ms=>{let left=ms;while(left>1e-7){const dt=Math.min(1000/60,left);window.advanceTime(dt,false);left-=dt;}},ms);
const near=(a,b,epsilon=1e-6)=>assert.ok(Math.abs(a-b)<=epsilon,`${a} should equal ${b}`);
const violation=(condition,kind,detail)=>{if(!condition)violations.push({kind,label:lastLabel,...detail});};
function validHook(s){const p=s.player.harness;return s.hooks.find(h=>Math.hypot(h.position.x-p.x,h.position.y-p.y,h.position.z-p.z)<=s.ropeLength+1e-7);}
async function loaded(p){await p.waitForFunction(()=>window.render_game_to_text&&JSON.parse(window.render_game_to_text()).art==='loaded');await tick(p,0);}
async function capture(p,name){await tick(p,0,true);await p.screenshot({path:`${out}/${name}.png`,fullPage:true});await writeFile(`${out}/${name}.json`,JSON.stringify(await read(p),null,2));screenshots.push(`${name}.png`);}
async function captureFailures(p,start){for(const item of violations.slice(start)){
 const key=`${item.kind}-${item.viewport}`;
 if(capturedFailures.size>=8||capturedFailures.has(key))continue;
 capturedFailures.add(key);await capture(p,`failure-${key}-stage${item.stage}`);
}}
async function visibleRect(p,selector){return p.locator(selector).first().evaluate(el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return{x:r.x,y:r.y,left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height,visible:r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden'};});}
async function opaqueHUD(p){return p.evaluate(()=>{
 const selectors=['.rope-spec','#inspection','.action-dock','#help','.journey button','.brand','#feedback','.hook-target','#world-measure g'];
 return [...new Set(selectors.flatMap(s=>[...document.querySelectorAll(s)]))].flatMap(el=>{
  const r=el.getBoundingClientRect(),s=getComputedStyle(el);
  if(!r.width||!r.height||s.display==='none'||s.visibility==='hidden'||Number(s.opacity)<.5)return[];
  const name=typeof el.className==='string'?el.className:el.className.baseVal;
  return[{selector:el.id?`#${el.id}`:name||`${el.tagName}(${el.textContent.trim().slice(0,30)})`,left:r.left,top:r.top,right:r.right,bottom:r.bottom}];
 });});}
async function playerView(p,size,phase='ready'){
 const failuresBefore=violations.length;
 const s=await read(p),layout=s.layout;
 assert.ok(layout?.player&&layout?.head,'render text needs projected feet and head');
 const feet=layout.player,head=layout.head;
 const mesh=layout.athleteBounds;
 assert.ok(mesh&&Number.isFinite(mesh.height),'render text needs actual projected athlete bounds');
 const projectedHeight=Math.abs(feet.y-head.y),height=mesh.height;
 const hud=await opaqueHUD(p);
 const pad=LIMITS.hudClearance;
 const hiddenBy=(point)=>hud.filter(r=>point.x>=r.left-pad&&point.x<=r.right+pad&&point.y>=r.top-pad&&point.y<=r.bottom+pad).map(r=>r.selector);
 const headHUD=hiddenBy(head),feetHUD=hiddenBy(feet);
 const minimum=Math.max(LIMITS.minReadyHeightPixels,size.height*LIMITS.readyHeightRatio);
 if(phase==='ready')violation(height>=minimum,'player-too-small',{stage:s.stage,viewport:size.name,height,projectedHeight,minimum});
 if(phase==='ready'){
  assert.ok(layout.destination,'render text needs the projected landing marker');
  const destination=layout.destination,eyeGap=s.camera.position.y-s.destination.y;
  violation(eyeGap>=.7,'landing-top-below-eye',{stage:s.stage,viewport:size.name,eyeGap});
  violation(destination.x>=16&&destination.x<=size.width-16&&destination.y>=16&&destination.y<=size.height-16,
   'landing-marker-offscreen',{stage:s.stage,viewport:size.name,destination});
  violation(hiddenBy(destination).length===0,'landing-marker-covered-by-hud',{stage:s.stage,viewport:size.name,destination,coveredBy:hiddenBy(destination)});
 }
 violation([feet,head].every(q=>Number.isFinite(q.x)&&Number.isFinite(q.y)&&q.x>=8&&q.x<=size.width-8&&q.y>=8&&q.y<=size.height-8),
  'player-endpoint-outside-viewport',{stage:s.stage,viewport:size.name,phase,feet,head});
 violation(!headHUD.length&&!feetHUD.length,'player-covered-by-hud',{stage:s.stage,viewport:size.name,phase,feet,head,headHUD,feetHUD});
 if(mesh)violation(mesh.left>=4&&mesh.right<=size.width-4&&mesh.top>=4&&mesh.bottom<=size.height-4,
  'athlete-mesh-clipped',{stage:s.stage,viewport:size.name,phase,mesh});
 const sample={stage:s.stage,viewport:size.name,phase,height,projectedHeight,heightRatio:height/size.height,minimum,feet,head,mesh:mesh??null,headHUD,feetHUD};
 samples.push(sample);await captureFailures(p,failuresBefore);return sample;
}
async function compactView(p,size){
 const failuresBefore=violations.length;
 const s=await read(p),r=await visibleRect(p,'#inspection');
 const dock=await visibleRect(p,'.action-dock');
 compactSamples.push({stage:s.stage,viewport:size.name,height:r.height,width:r.width,areaRatio:r.width*r.height/(size.width*size.height),wholeDock:dock});
 violation(r.visible,'missing-compact-inspection',{stage:s.stage,viewport:size.name});
 violation(r.height<=(size.name==='phone'?LIMITS.compactHeightPhone:LIMITS.compactHeightDesktop),
  'default-inspection-too-tall',{stage:s.stage,viewport:size.name,rect:r});
 violation(r.width*r.height/(size.width*size.height)<=LIMITS.compactAreaRatio,
  'default-inspection-too-large',{stage:s.stage,viewport:size.name,areaRatio:r.width*r.height/(size.width*size.height)});
 const diagrams=await p.locator('.flat-triangle:visible').count();
 violation(diagrams===0,'permanent-full-diagram',{stage:s.stage,viewport:size.name,diagrams});
 const dimensions=await p.locator('#inspection').innerText();
 const measured=s.hooks.find(h=>h.id===s.selected);
 for(const leg of [measured.dx,measured.dy,...(Math.abs(measured.dz)>.001?[measured.dz]:[])]){
  const value=String(Number(Math.abs(leg).toFixed(2)));
  violation(dimensions.includes(value),'compact-dimension-missing',{stage:s.stage,viewport:size.name,value,dimensions});
 }
 violation(!/d\s*=\s*√/.test(dimensions),'permanent-calculation',{stage:s.stage,viewport:size.name,dimensions});
 const width=await p.evaluate(()=>[document.documentElement.scrollWidth,innerWidth]);assert.equal(width[0],width[1]);
 const rope=await p.locator('.rope-spec').innerText();assert.ok(rope.includes(String(s.ropeLength))&&rope.includes('אורך הכבל'));
 await captureFailures(p,failuresBefore);
}
async function requestedMath(p,size,spatial){
 const before=await read(p);await p.locator('#calc').click();await tick(p,0);
 const unsolved=await read(p);assert.equal(unsolved.mathOpen,true);assert.equal(unsolved.mode,'paused');
 assert.equal(unsolved.progress.resumeHinted,before.progress.resumeHinted,'opening the diagram alone must preserve eligibility');
 const labels=await p.locator('.flat-triangle:visible text').evaluateAll(els=>els.filter(t=>t.textContent!=='P').map(t=>{
  const m=t.getScreenCTM(),r=t.getBoundingClientRect(),svg=t.ownerSVGElement.getBoundingClientRect();
  return{text:t.textContent,fontPixels:parseFloat(getComputedStyle(t).fontSize)*Math.hypot(m.a,m.b),
   inside:r.left>=svg.left-.5&&r.right<=svg.right+.5&&r.top>=svg.top-.5&&r.bottom<=svg.bottom+.5,
   inViewport:r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight};
 }));
 violation(labels.length>0,'requested-math-missing',{stage:before.stage,viewport:size.name});
 violation(labels.every(t=>t.fontPixels>=LIMITS.mathFontPixels-.01&&t.inside&&t.inViewport),
  'requested-math-unreadable',{stage:before.stage,viewport:size.name,labels});
 if(spatial)violation(await p.locator('.flat-triangle:visible').count()===2,'spatial-two-triangles-missing',{stage:before.stage,viewport:size.name});
 await capture(p,`${size.name}-stage${before.stage}-requested-diagram`);
 await p.keyboard.press('Escape');await tick(p,0);
 assert.equal((await read(p)).mathOpen,false);assert.equal((await read(p)).mode,before.mode);
 await p.locator('#calc').click();await tick(p,0);assert.equal((await read(p)).mathOpen,true);
 await p.locator('#solve').focus();await p.keyboard.press('Space');await tick(p,0);
 assert.equal((await read(p)).progress.resumeHinted,true,'explicit Solve must forfeit only the current first-try star');
 const formula=await p.locator('#calculation:visible bdi').evaluateAll(els=>els.map(el=>({text:el.textContent,fontPixels:parseFloat(getComputedStyle(el).fontSize)})));
 violation(formula.length>0&&formula.every(f=>f.fontPixels>=16),'requested-formula-too-small',{stage:before.stage,viewport:size.name,formula});
 const after=await read(p);assert.equal(after.launches,before.launches);assert.deepEqual(after.player.position,before.player.position);
 await capture(p,`${size.name}-stage${before.stage}-requested-math`);
 await p.locator('#close-math').click();await tick(p,0);const closed=await read(p);
 assert.equal(closed.mathOpen,false);assert.equal(closed.mode,before.mode);
 assert.deepEqual(closed.player.position,before.player.position);await compactView(p,size);
}
async function pauseAndMap(p,size){
 const before=await read(p);await p.locator('#pause').click();const frozen=await read(p);assert.equal(frozen.mode,'paused');await frames(p,600);
 assert.deepEqual((await read(p)).player,frozen.player);near((await read(p)).elapsed,frozen.elapsed);
 await p.locator('#resume').click();await tick(p,0);assert.equal((await read(p)).mode,'ready');
 await p.locator('#help').click();assert.equal((await read(p)).mode,'paused');await p.locator('#map-pause').click();assert.equal((await read(p)).mapOpen,true);
 await p.locator('#close-map').click();await tick(p,0);let after=await read(p);assert.equal(after.help,false);assert.equal(after.mode,'ready');
 assert.deepEqual(after.player.position,before.player.position);assert.equal(after.stage,before.stage);await playerView(p,size);
 checks.push(`${size.name}: pause freezes; help/map close restores visible current play`);
}
async function run(size,touch=false){
 const context=await browser.newContext({viewport:{width:size.width,height:size.height},isMobile:touch,hasTouch:touch}),p=await context.newPage();currentPage=p;
 p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await p.goto(url,{waitUntil:'networkidle'});await loaded(p);let completed=0;
 while(true){
  let s=await read(p);lastLabel=`${size.name}-stage${s.stage}`;
  if(s.mode==='finished'){
   completed++;if(s.level===11)break;
   await p.locator('#next-level').click();await tick(p,0);
   if(completed%3===0)console.log(`${size.name}: ${completed}/12 levels completed`);
   continue;
  }
  assert.equal(s.mode,'ready');covered.set(size.name,(covered.get(size.name)||new Set()).add(s.stage));
  const before=structuredClone(s.player.position),attempts=s.stageAttempts;
  const fixedCamera=structuredClone(s.camera.position),fixedFeet=structuredClone(s.layout.player),fixedHead=structuredClone(s.layout.head);
  for(const h of s.hooks){const target=p.locator(`[data-hook="${h.id}"]`);if(touch)await target.tap();else await target.click();
   const selectedState=await read(p);for(const k of ['x','y','z'])near(selectedState.camera.position[k],fixedCamera[k]);
   for(const k of ['x','y']){near(selectedState.layout.player[k],fixedFeet[k]);near(selectedState.layout.head[k],fixedHead[k]);}
  }
  s=await read(p);assert.equal(s.stageAttempts,attempts);assert.deepEqual(s.player.position,before);
  const h=validHook(s);assert.ok(h);const selected=p.locator(`[data-hook="${h.id}"]`);if(touch)await selected.tap();else await selected.click();await tick(p,0);
  await playerView(p,size);await compactView(p,size);
  if(size.name==='desktop')for(const alternate of SIZES.filter(v=>v.name==='short-desktop'||v.name==='in-app')){
   await p.setViewportSize({width:alternate.width,height:alternate.height});await tick(p,0);lastLabel=`${alternate.name}-stage${s.stage}`;
   covered.set(alternate.name,(covered.get(alternate.name)||new Set()).add(s.stage));await playerView(p,alternate);await compactView(p,alternate);
   if(s.stage===0||s.stage===24)await capture(p,`${alternate.name}-stage${s.stage}-ready`);
  }
  if(size.name==='desktop'){await p.setViewportSize({width:size.width,height:size.height});await tick(p,0);lastLabel=`${size.name}-stage${s.stage}`;}
  if(REPRESENTATIVE.has(s.stage))await capture(p,`${size.name}-stage${s.stage}-ready`);
  if(s.stage===0){
   await pauseAndMap(p,size);
   const beforeAttempt=await read(p),origin=beforeAttempt.player.harness;
   const wrong=beforeAttempt.hooks.find(h=>Math.hypot(h.position.x-origin.x,h.position.y-origin.y,h.position.z-origin.z)>beforeAttempt.ropeLength+1e-7);
   const wrongTarget=p.locator(`[data-hook="${wrong.id}"]`);if(touch)await wrongTarget.tap();else await wrongTarget.click();
   if(touch)await p.locator('#launch').tap();else{await p.locator('#launch').focus();await p.keyboard.press('Space');}
   const rejected=await read(p);assert.equal(rejected.mode,'ready');assert.deepEqual(rejected.player.position,beforeAttempt.player.position);
   assert.equal(rejected.mistakes,beforeAttempt.mistakes+1);assert.ok((await p.locator('#feedback').innerText()).includes(rejected.rejection.distance.toFixed(2)));
   await playerView(p,size);await compactView(p,size);await capture(p,`${size.name}-stage0-rejected`);
   if(touch)await selected.tap();else await selected.click();await requestedMath(p,size,false);
  }
  if(s.stage===24)await requestedMath(p,size,true);
  const launchButton=p.locator('#launch');if(touch)await launchButton.tap();else{await launchButton.focus();await p.keyboard.press('Space');}
  assert.equal((await read(p)).mode,'flying');
  for(const [ms,phase]of [[200,'pull'],[400,'released'],[700,'approach']]){
   await frames(p,ms);lastLabel=`${size.name}-stage${s.stage}-${phase}`;await playerView(p,size,phase);
   if((s.stage===0||s.stage===24)&&phase==='released')await capture(p,`${size.name}-stage${s.stage}-airborne`);
  }
  await frames(p,900);const landed=await read(p);assert.equal(landed.landed,s.hop+1);
 }
 assert.equal(completed,12);const final=await read(p);assert.equal(final.progress.records.filter(r=>r.completed).length,12);
 await p.reload({waitUntil:'networkidle'});await loaded(p);assert.equal((await read(p)).level,11);assert.equal((await read(p)).mode,'finished');
 checks.push(`${size.name}: all36 stages physically completed; all12 levels survive reload`);await context.close();currentPage=undefined;
}
await mkdir(out,{recursive:true});
try{
 browser=await chromium.launch({headless:true,channel:'chrome'});
 await run(SIZES[0]);await run(SIZES[3],true);
 for(const size of SIZES)assert.equal(covered.get(size.name)?.size,36,`${size.name} must cover all36 ready layouts`);
 assert.deepEqual(errors,[]);
}catch(error){errors.push(String(error.stack||error));if(currentPage){try{await capture(currentPage,'fatal-'+lastLabel);}catch{}}}
finally{
 if(browser)await browser.close();
 const minima=SIZES.map(size=>{const ready=samples.filter(s=>s.viewport===size.name&&s.phase==='ready');return{viewport:size.name,stages:covered.get(size.name)?.size||0,minHeight:Math.min(...ready.map(s=>s.height)),minHeightRatio:Math.min(...ready.map(s=>s.heightRatio))};});
 const result={url,date:new Date().toISOString(),limits:LIMITS,checks,minima,violations,errors,screenshots,samples,compactSamples,humanFeelVerified:false};
 await writeFile(`${out}/results.json`,JSON.stringify(result,null,2));console.log(JSON.stringify({checks,minima,violationCount:violations.length,errors,screenshots},null,2));
 if(violations.length||errors.length)process.exitCode=1;
}

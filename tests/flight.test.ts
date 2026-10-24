import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FLIGHT,HARNESS_HEIGHT,LEVELS,STAGES,advanceFlight,chooseHook,createFlightState,
  flightHarness,inspectFlightHook,launchSelected,performTrick,restartFlight,
  retryFlight,selectHook,toggleFlightPause,nextLevel,loadLevel,recordHint,
  normalizeProgress,serializeProgress,type FlightState,type Vec,
} from '../src/flight.ts';
const close=(a:number,b:number,eps=1e-8)=>assert.ok(Math.abs(a-b)<=eps,`${a} should equal ${b}`);
const closeVec=(a:Vec,b:Vec)=>{for(const k of ['x','y','z'] as const)close(a[k],b[k]);};
const distance=(p:Vec,q:Vec)=>Math.hypot(q.x-p.x,q.y-p.y-HARNESS_HEIGHT,q.z-p.z);
const good=(s:FlightState)=>STAGES[s.stage].hooks.find(h=>distance(s.p,h.position)<=STAGES[s.stage].reach+FLIGHT.reachEpsilon)!;
const bad=(s:FlightState)=>STAGES[s.stage].hooks.find(h=>distance(s.p,h.position)>STAGES[s.stage].reach+FLIGHT.reachEpsilon)!;
const launch=(s:FlightState)=>{assert.equal(chooseHook(s,good(s).id),true);assert.equal(launchSelected(s),true);};
const hop=(s:FlightState)=>{launch(s);advanceFlight(s,2150);};
const finish=(s:FlightState)=>{while(s.mode!=='finished')hop(s);};
const snapshot=(s:FlightState)=>({p:{...s.p},v:{...s.v},elapsed:s.elapsed,phaseTime:s.phaseTime,
  accumulator:s.accumulator,stage:s.stage,level:s.level,hop:s.hop,landed:s.landed,launches:s.launches,
  mistakes:s.mistakes,selected:s.selected,attached:s.attached,message:s.message,messageTime:s.messageTime,
  trickTime:s.trickTime,firstTry:s.firstTry,stageAttempts:s.stageAttempts,progress:serializeProgress(s.progress)});

test('12 levels author 36 neutral three-way choices, balanced valid slots and six terrain shapes',()=>{
  assert.equal(LEVELS.length,12);assert.equal(STAGES.length,36);
  const slots=[0,0,0],shapes=new Set<string>();
  STAGES.forEach((stage,i)=>{
    assert.equal(stage.level,Math.floor(i/3));assert.equal(stage.hop,i%3);assert.equal(stage.region,Math.floor(i/9));
    assert.equal(stage.hooks.length,3);assert.equal(stage.showMeasurements,true);
    const valid=stage.hooks.filter(h=>distance(stage.origin,h.position)<=stage.reach+1e-10);
    assert.equal(valid.length,1,`stage ${i} needs exactly one valid hook`);slots[stage.hooks.indexOf(valid[0])]++;
    assert.equal(new Set(stage.hooks.map(h=>h.id)).size,3);
    stage.hooks.forEach(h=>assert.deepEqual(Object.keys(h).sort(),['id','label','position']));
    if(stage.hop)assert.deepEqual(stage.origin,STAGES[i-1].landing);
    assert.ok(stage.platformHalfSize!.x>=FLIGHT.landingHalfWidth&&stage.platformHalfSize!.z>=FLIGHT.landingHalfDepth);
    shapes.add(JSON.stringify(stage.hooks.map(h=>[h.position.x-stage.origin.x,h.position.y-stage.origin.y-HARNESS_HEIGHT,h.position.z-stage.origin.z].map(n=>Math.round(n*1e9)/1e9)).sort()));
  });
  assert.deepEqual(slots,[12,12,12]);assert.equal(shapes.size,36);
  assert.equal(new Set(STAGES.map(s=>s.terrain)).size,6);assert.equal(new Set(LEVELS.map(l=>l.region)).size,4);
  LEVELS.forEach((l,i)=>{assert.equal(l.startStage,i*3);assert.equal(l.stages.length,3);assert.equal(l.stages[0],STAGES[i*3]);});
});

test('all 36 accepted choices reach actual downward contacts and unlock all twelve levels',()=>{
  const s=createFlightState();let contacts=0;
  for(let level=0;level<12;level++){
    assert.equal(s.level,level);assert.equal(s.stage,level*3);assert.equal(s.landed,0);
    for(let h=0;h<3;h++){
      const stage=STAGES[s.stage],origin={...s.p};closeVec(origin,stage.origin);launch(s);
      assert.deepEqual(s.p,origin,'commit applies an impulse, not a position teleport');
      assert.ok(s.v.y>=0,`stage ${s.stage} must not initially dip through its launch floor`);
      advanceFlight(s,1490,level%2?-1:1);assert.equal(s.mode,'flying');assert.equal(s.landed,h);
      advanceFlight(s,10);assert.equal(s.mode,'landing');assert.equal(s.landed,h+1);closeVec(s.p,stage.landing);
      const contact=s.events.filter(e=>e.type==='land').at(-1)!;assert.ok((contact.approachVelocity as Vec).y<0);
      assert.equal(contact.firstTry,true);contacts++;const p={...s.p};advanceFlight(s,650);
      assert.deepEqual(s.p,p,'changing stage does not snap to an authored origin');
      assert.equal(s.mode,h===2?'finished':'ready');
    }
    assert.equal(s.firstTry,3);assert.equal(s.launches,3);close(s.elapsed,6.45);
    assert.equal(s.progress.records[level].completed,true);assert.equal(s.progress.records[level].stars,3);
    close(s.progress.records[level].bestTime!,s.elapsed);
    if(level<11)assert.equal(nextLevel(s),true);
  }
  assert.equal(contacts,36);assert.equal(s.progress.unlocked,11);assert.ok(s.progress.records.every(r=>r.completed));
  const end=snapshot(s);assert.equal(nextLevel(s),false);advanceFlight(s,5000);assert.deepEqual(snapshot(s),end);
});

test('clicking every hook only inspects: no attempt, movement, failure, launch or star',()=>{
  const s=createFlightState(),p={...s.p};
  for(let repeat=0;repeat<4;repeat++)for(const h of STAGES[0].hooks){assert.equal(chooseHook(s,h.id),true);assert.equal(s.selected,h.id);}
  assert.equal(s.mode,'ready');assert.deepEqual(s.p,p);assert.equal(s.stageAttempts,0);assert.equal(s.launches,0);
  assert.equal(s.mistakes,0);assert.equal(s.firstTry,0);assert.equal(s.rejection,null);
  assert.equal(s.events.filter(e=>e.type==='attempt').length,0);assert.equal(chooseHook(s,'unknown'),false);
});

test('reach uses the actual harness with inclusive boundary, translation and a separate numeric epsilon',()=>{
  const s=createFlightState(),h=flightHarness(s);assert.deepEqual(h,{x:0,y:1.05,z:0});
  const valid=inspectFlightHook(s,good(s));close(valid.dx,8);close(valid.dy,6);close(valid.distance,10);close(valid.squared,100);
  const wrong=inspectFlightHook(s,bad(s));close(wrong.dx,6);close(wrong.dy,9);close(wrong.distance,Math.sqrt(117));
  close(wrong.shortfall,Math.sqrt(117)-10);assert.equal(wrong.reachable,false);
  const hook=(d:number)=>({id:'?',label:'?',position:{x:d,y:h.y,z:0}});
  assert.equal(inspectFlightHook(s,hook(10)).reachable,true);
  assert.equal(inspectFlightHook(s,hook(10+FLIGHT.reachEpsilon/2)).reachable,true);
  assert.equal(inspectFlightHook(s,hook(10+FLIGHT.reachEpsilon*2)).reachable,false);
  const shifted={p:{x:90,y:-7,z:88},stage:0},q=flightHarness(shifted);
  const target={id:'?',label:'?',position:{x:q.x+8,y:q.y+6,z:q.z}};
  close(inspectFlightHook(shifted,target).distance,10);
  assert.equal(inspectFlightHook({...shifted,p:{...shifted.p,x:89}},target).reachable,false);
});

test('spatial choices use both triangles and signed depth; (6,15,8) is not seventeen',()=>{
  const stage=STAGES[24],state={p:stage.origin,stage:24};
  const valid=stage.hooks.find(h=>distance(stage.origin,h.position)<=13)!;
  const info=inspectFlightHook(state,valid);close(info.dx,3);close(info.dy,12);close(info.dz,4);
  close(info.face,5);close(info.squared,169);close(info.distance,13);
  const wrong=stage.hooks.find(h=>h.position.z-stage.origin.z===5)!;
  const incorrect=inspectFlightHook(state,wrong);assert.ok(Math.hypot(incorrect.dx,incorrect.dy)<13);assert.equal(incorrect.reachable,false);
  const reverse=STAGES[25],reverseHook=reverse.hooks.find(h=>distance(reverse.origin,h.position)<=13)!;
  const negative=inspectFlightHook({p:reverse.origin,stage:25},reverseHook);close(negative.dz,-3);close(negative.face,5);close(negative.distance,13);
  const summit=STAGES[33],counter=summit.hooks.find(h=>h.position.x===summit.origin.x+6)!;
  const result=inspectFlightHook({p:summit.origin,stage:33},counter);close(result.squared,325);close(result.distance,Math.sqrt(325));assert.equal(result.reachable,false);
});

test('near-boundary rejection explains 17.03 versus 17 with a nonzero 0.03 shortfall',()=>{
  const stage=STAGES[17],hook=stage.hooks.find(h=>h.position.x-stage.origin.x===13)!;
  const info=inspectFlightHook({p:stage.origin,stage:17},hook);assert.equal(info.reachable,false);close(info.squared,290);
  assert.equal(info.distance.toFixed(2),'17.03');assert.equal(info.shortfall.toFixed(2),'0.03');
});

test('wrong commitment snapshots the failed geometry and allows immediate safe recovery',()=>{
  const s=createFlightState();hop(s);const wrong=bad(s),valid=good(s),p={...s.p};
  chooseHook(s,wrong.id);assert.equal(launchSelected(s),false);assert.equal(s.mode,'ready');assert.deepEqual(s.p,p);
  assert.equal(s.stageAttempts,1);assert.equal(s.mistakes,1);assert.equal(s.launches,1);assert.equal(s.landed,1);
  const failure=structuredClone(s.rejection!);assert.equal(failure.hookId,wrong.id);assert.equal(failure.label,wrong.label);
  closeVec(failure.origin,flightHarness(s));close(failure.shortfall,failure.distance-failure.reach);
  chooseHook(s,valid.id);assert.deepEqual(s.rejection,failure,'inspection must not redirect failure feedback');
  assert.equal(launchSelected(s),true);assert.equal(s.rejection,null);assert.equal(s.stageAttempts,2);
  advanceFlight(s,2150);assert.equal(s.landed,2);assert.equal(s.firstTry,1);
});

test('first-try stars and flow reward contact; hints or mistakes never lock completion',()=>{
  const s=createFlightState();launch(s);assert.equal(s.firstTry,0);advanceFlight(s,1500);assert.equal(s.firstTry,1);assert.equal(s.flow,1);advanceFlight(s,650);
  chooseHook(s,bad(s).id);launchSelected(s);assert.equal(s.flow,0);hop(s);assert.equal(s.firstTry,1);
  recordHint(s);recordHint(s);assert.equal(s.stageHinted,true);assert.equal(s.stageAttempts,0);
  assert.equal(s.events.filter(e=>e.type==='hint').length,1);hop(s);
  assert.equal(s.mode,'finished');assert.equal(s.firstTry,1);assert.equal(s.progress.records[0].stars,1);assert.equal(s.progress.unlocked,1);
  nextLevel(s);assert.equal(s.firstTry,0);assert.equal(s.stageHinted,false);hop(s);assert.equal(s.firstTry,1);
});

test('three brute-force recoveries finish and unlock but earn zero first-try stars',()=>{
  const s=createFlightState();for(let i=0;i<3;i++){chooseHook(s,bad(s).id);assert.equal(launchSelected(s),false);hop(s);}
  assert.equal(s.mode,'finished');assert.equal(s.mistakes,3);assert.equal(s.firstTry,0);assert.equal(s.progress.records[0].stars,0);assert.equal(s.progress.unlocked,1);
});

test('midlevel contact saves the next pad, earned stars and pending celebration clock cost',()=>{
  const s=createFlightState();launch(s);advanceFlight(s,1500);assert.equal(s.mode,'landing');assert.equal(s.progress.resumeStage,1);
  const restored=createFlightState({progress:serializeProgress(s.progress)});
  assert.equal(restored.mode,'ready');assert.equal(restored.stage,1);assert.equal(restored.hop,1);assert.equal(restored.landed,1);
  assert.equal(restored.firstTry,1);closeVec(restored.p,STAGES[1].origin);close(restored.elapsed,2.15);
  hop(restored);hop(restored);assert.equal(restored.mode,'finished');assert.equal(restored.progress.records[0].stars,3);close(restored.elapsed,6.45);
});

test('restore retains current-choice mistakes and answer-help history',()=>{
  const s=createFlightState();hop(s);chooseHook(s,bad(s).id);launchSelected(s);recordHint(s);
  const restored=createFlightState({progress:serializeProgress(s.progress)});
  assert.equal(restored.stage,1);assert.equal(restored.stageAttempts,1);assert.equal(restored.stageHinted,true);assert.equal(restored.mistakes,1);
  hop(restored);hop(restored);assert.equal(restored.firstTry,2);assert.equal(restored.progress.records[0].stars,2);
});

test('last contact restores level-complete instead of replaying; Next saves the new level',()=>{
  const s=createFlightState();hop(s);hop(s);launch(s);advanceFlight(s,1500);assert.equal(s.progress.records[0].completed,true);
  const restored=createFlightState({progress:serializeProgress(s.progress)});assert.equal(restored.mode,'finished');assert.equal(restored.landed,3);
  assert.equal(restored.stage,2);assert.equal(restored.progress.unlocked,1);assert.equal(nextLevel(restored),true);
  const next=createFlightState({progress:serializeProgress(restored.progress)});
  assert.equal(next.level,1);assert.equal(next.stage,3);assert.equal(next.hop,0);assert.equal(next.mode,'ready');assert.equal(next.progress.records[0].stars,3);
});

test('malformed storage and false unlock indexes cannot break or skip progression',()=>{
  const cases=[null,undefined,'{broken',[],1,'null',{version:2,unlocked:99},
    {version:3,unlocked:999,currentLevel:999,resumeStage:999,records:[]},
    {version:3,currentLevel:-3,records:[{completed:true,stars:9,bestTime:-1}]},
    {version:3,records:[{completed:true,stars:3,bestTime:Infinity}]}];
  for(const raw of cases){const n=normalizeProgress(raw);assert.equal(n.unlocked,0);assert.equal(n.currentLevel,0);assert.equal(n.resumeStage,0);assert.equal(n.records.length,12);
    const s=createFlightState({progress:raw,level:11});assert.equal(s.level,0);assert.equal(s.stage,0);assert.equal(s.mode,'ready');}
  const s=createFlightState();finish(s);const raw=JSON.parse(serializeProgress(s.progress));raw.unlocked=999;raw.currentLevel=999;raw.resumeStage=999;
  const n=normalizeProgress(raw);assert.equal(n.unlocked,1);assert.equal(n.currentLevel,1);assert.equal(n.resumeStage,3);
  n.records[0].stars=0;assert.equal(s.progress.records[0].stars,3,'normalization must not alias live records');
});

test('load/restart preserve campaign records and reset only the chosen unlocked level',()=>{
  const s=createFlightState(),initial=JSON.stringify(s);for(const i of [-1,1,12,NaN,.5])assert.equal(loadLevel(s,i),false);
  assert.equal(nextLevel(s),false);assert.equal(JSON.stringify(s),initial);finish(s);nextLevel(s);hop(s);toggleFlightPause(s);restartFlight(s,true);
  assert.equal(s.mode,'ready');assert.equal(s.level,1);assert.equal(s.stage,3);assert.equal(s.landed,0);assert.equal(s.firstTry,0);assert.equal(s.timed,true);
  assert.equal(s.progress.records[0].stars,3);assert.equal(loadLevel(s,0),true);assert.equal(s.level,0);assert.equal(s.progress.records[0].stars,3);assert.equal(s.progress.unlocked,1);
});

test('records retain best stars and best observed completion time independently',()=>{
  const s=createFlightState();finish(s);const time=s.progress.records[0].bestTime!;restartFlight(s);
  for(let i=0;i<3;i++){recordHint(s);advanceFlight(s,500);hop(s);}assert.equal(s.firstTry,0);
  assert.equal(s.progress.records[0].stars,3);close(s.progress.records[0].bestTime!,time);assert.ok(s.elapsed>time);
});

test('pull integrates constant acceleration and release keeps velocity before gravity',()=>{
  const s=createFlightState();launch(s);const v={...s.v};advanceFlight(s,100);
  closeVec(s.p,{x:v.x*.1+.5*22.4*.1**2,y:v.y*.1+.5*16.8*.1**2,z:0});advanceFlight(s,350);
  assert.equal(s.attached,null);close(s.phaseTime,.45);closeVec(s.v,{x:v.x+22.4*.45,y:v.y+16.8*.45,z:0});
  const p={...s.p},release={...s.v};closeVec(s.events.find(e=>e.type==='release')!.velocity as Vec,release);
  advanceFlight(s,100);closeVec(s.p,{x:p.x+release.x*.1,y:p.y+release.y*.1-.5*FLIGHT.gravity*.1**2,z:0});
  closeVec(s.v,{x:release.x,y:release.y-FLIGHT.gravity*.1,z:0});
});

test('busy commitments cannot replace a flight or queue the next stage',()=>{
  const s=createFlightState(),stale=bad(s).id;launch(s);for(let i=0;i<100;i++){assert.equal(launchSelected(s),false);assert.equal(chooseHook(s,stale),false);advanceFlight(s,16);}
  assert.equal(s.mode,'landing');assert.equal(s.launches,1);assert.equal(s.mistakes,0);advanceFlight(s,5000);
  assert.equal(s.stage,1);assert.equal(s.mode,'ready');assert.equal(s.launches,1);assert.equal(s.stageAttempts,0);
});

test('keyboard selection wraps three hooks and commits only the selected inspection',()=>{
  const s=createFlightState(),hooks=STAGES[0].hooks;assert.equal(selectHook(s,-1),hooks[2].id);assert.equal(selectHook(s,1),hooks[0].id);
  assert.equal(selectHook(s,1),hooks[1].id);assert.equal(s.stageAttempts,0);assert.equal(launchSelected(s),true);assert.equal(selectHook(s,1),null);
});

test('pause freezes ready/pull/coast/landing, including checkpoints and stars',()=>{
  for(const ms of [0,200,800,1600]){const s=createFlightState();if(ms){launch(s);advanceFlight(s,ms);}const mode=s.mode,before=snapshot(s);
    toggleFlightPause(s);advanceFlight(s,5000);assert.equal(launchSelected(s),false);assert.equal(selectHook(s,1),null);assert.equal(performTrick(s),false);recordHint(s);
    assert.deepEqual(snapshot(s),before);toggleFlightPause(s);assert.equal(s.mode,mode);assert.deepEqual(snapshot(s),before);
    if(ms){advanceFlight(s,2150-ms);assert.equal(s.stage,1);}}
});

test('30/144Hz and irregular chunks preserve all 36 contacts, medals and records',()=>{
  const run=(chunks:number[])=>{const s=createFlightState();for(let l=0;l<12;l++){for(let h=0;h<3;h++){
    launch(s);let left=2150,i=0;while(left>0){const ms=Math.min(left,chunks[i++%chunks.length]);advanceFlight(s,ms);left-=ms;}}
    if(l<11)nextLevel(s);}return s;};
  const expected=run([2150]);for(const chunks of [[1000/30],[1000/144],[1,237,16,41,3,97]]){
    const actual=run(chunks);assert.equal(actual.mode,'finished');assert.equal(actual.level,11);closeVec(actual.p,expected.p);close(actual.elapsed,expected.elapsed);
    assert.deepEqual(actual.progress.records.map(r=>[r.completed,r.stars]),expected.progress.records.map(r=>[r.completed,r.stars]));
    actual.progress.records.forEach((r,i)=>close(r.bestTime!,expected.progress.records[i].bestTime!));}
});

test('optional trick, expiry, retry and invalid time cannot alter the required trajectory',()=>{
  const s=createFlightState(),baseline=createFlightState();chooseHook(s,bad(s).id);launchSelected(s);const p={...s.p};advanceFlight(s,4000);
  assert.equal(s.message,'choose-hook');assert.equal(s.messageTime,0);assert.deepEqual(s.p,p);assert.equal(retryFlight(s),true);assert.equal(s.stageAttempts,1);
  launch(s);launch(baseline);assert.equal(performTrick(s),true);assert.equal(performTrick(s),false);const before=snapshot(s);
  for(const ms of [0,-1,NaN,Infinity])advanceFlight(s,ms);assert.deepEqual(snapshot(s),before);
  advanceFlight(s,2150);advanceFlight(baseline,2150);closeVec(s.p,baseline.p);closeVec(s.v,baseline.v);close(s.elapsed,baseline.elapsed);
  assert.equal(s.tricks,1);assert.equal(s.trickTime,0);assert.equal(s.rings,0);
});

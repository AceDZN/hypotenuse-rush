import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const url=process.argv[2]||'http://localhost:4183';
const out='docs/evidence';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,channel:'chrome'});
const page=await browser.newPage({viewport:{width:1672,height:941},deviceScaleFactor:1});
const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
const read=()=>page.evaluate(()=>JSON.parse(window.render_game_to_text()));
const advance=ms=>page.evaluate(ms=>window.advanceTime(ms,false),ms);
const held=new Set();
async function keys(list){for(const k of [...held])if(!list.includes(k)){await page.keyboard.up(k);held.delete(k);}for(const k of list)if(!held.has(k)){await page.keyboard.down(k);held.add(k);}}
async function select(id){for(let n=0;n<30;n++){if((await read()).selected===id)return;await page.keyboard.press('e');}throw Error(`Could not select ${id}`);}
async function shot(name){await page.evaluate(()=>window.advanceTime(0));await page.screenshot({path:`${out}/${name}.png`});await fs.writeFile(`${out}/${name}.json`,JSON.stringify(await read(),null,2));}
try{
await page.goto(url,{waitUntil:'networkidle',timeout:60000});await page.waitForSelector('#start-btn');await page.click('#start-btn');await advance(0);await page.mouse.move(40,780);
await select('B');await advance(100);await advance(100);await page.mouse.down();await advance(50);await page.mouse.up();assert.equal((await read()).reason,'overreach');await shot('overreach');
await page.keyboard.press('r');await advance(300);await select('A');await page.keyboard.press('Tab');for(let i=0;i<8;i++)await advance(100);await shot('survey-opening');await page.keyboard.press('h');await advance(100);assert.equal((await read()).hints,1);await page.keyboard.press('h');await page.keyboard.press('Tab');
// Pause also freezes cooldown, assists and all fixed-step motion.
await page.keyboard.press('Escape');const paused=await read();await advance(1000);assert.equal((await read()).time,paused.time);await page.keyboard.press('Escape');
const route=[{id:'A',x:0,z:0},{id:'C',x:28.4,z:-3},{id:'H',x:91,z:4},{id:'I',x:126,z:-3},{id:'E',x:166,z:-2},{id:'J',x:205,z:3},{id:'G',x:240,z:-2},{id:'K',x:271,z:5},{id:'L',x:310,z:-1},{id:null,x:351,z:4}];
const trace=[];
for(let leg=0;leg<route.length;leg++){
 const target=route[leg];let reached=false,pathStage=0;
 for(let n=0;n<2400;n++){
  const s=await read();if(s.mode==='finished'){reached=true;break;}
  const p=s.player.position,v=s.player.velocity;let tx=target.x,tz=target.z;if(target.id==='H'){if(pathStage===0&&p.x>47.5)pathStage=1;if(pathStage===1&&p.x>55.5&&p.z< -7.5)pathStage=2;if(pathStage===2&&p.x>72.5)pathStage=3;if(pathStage===0){tx=48;tz=-3;}else if(pathStage===1){tx=56;tz=-8;}else if(pathStage===2){tx=73;tz=-8;}}const dx=tx-p.x,dz=tz-p.z;
  if(target.id&&tx===target.x&&s.player.grounded&&Math.abs(dx)<.35&&Math.abs(dz)<.3){
   await keys([]);await advance(150);await select(target.id);await advance(160);
   const scan=await read(),w=scan.anchors.find(a=>a.id===target.id);
   if(w&&w.distance>scan.reach+1e-7&&w.distance<scan.reach+.4&&scan.player.grounded){await keys(['w']);await advance(50);continue;}
   if(w&&w.distance<=scan.reach+1e-7&&w.reason!=='obstructed'){
    await keys(['w','Shift']);await page.mouse.down();await advance(350);
    const mid=await read();assert.equal(mid.attached,target.id,`grab failed ${target.id}: ${JSON.stringify(mid)}`);
    if(['A','G'].includes(target.id))await shot(`grapple-${target.id}`);
    await advance(350);await page.mouse.up();reached=true;trace.push({anchor:target.id,time:mid.time,position:mid.player.position});break;
   }
  }
  const near=Math.hypot(dx,dz)<2.5;
  const lead=near?.16:.13;
  const ax=dx-v.x*lead,az=dz-v.z*lead;
  const buttons=[];if(ax>.12)buttons.push('w');else if(ax<-.12)buttons.push('s');if(az>.12)buttons.push('d');else if(az<-.12)buttons.push('a');if(!near)buttons.push('Shift');await keys(buttons);await advance(near?1000/60:100);
  if(n%200===199)console.log(`leg${target.id} ${JSON.stringify((await read()).player.position)}`);
 }
 assert.ok(reached,`could not reach ${target.id}: ${JSON.stringify(await read())}`);
 console.log(`passed ${target.id??'finish'}`);
}
await keys([]);const end=await read();assert.equal(end.mode,'finished');assert.equal(end.checkpoints,3);assert.ok(end.grabs>=9);await shot('finish');
await page.keyboard.press('r');await advance(100); // local retry keeps a finished result, full restart is explicit.
await page.keyboard.down('Shift');await page.keyboard.press('r');await page.keyboard.up('Shift');await advance(100);assert.equal((await read()).checkpoints,0);assert.equal((await read()).falls,0);
await page.setViewportSize({width:900,height:650});await advance(0);await shot('resize');await page.keyboard.press('Escape');
await fs.writeFile(`${out}/browser-results.json`,JSON.stringify({url,viewport:{width:1672,height:941},trace,finish:end,errors},null,2));assert.deepEqual(errors,[]);
console.log(JSON.stringify({passed:true,time:end.time,falls:end.falls,grabs:end.grabs,errors}));
}finally{await browser.close();}

// HISTORICAL V1 TOOL: active flow-v2 verification is tools/qa-flow.mjs.
import { chromium } from 'playwright';
import fs from 'node:fs/promises';
const browser=await chromium.launch({headless:true,channel:'chrome'});
try{
 const page=await browser.newPage({viewport:{width:1728,height:780},deviceScaleFactor:2});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto('http://localhost:4183',{waitUntil:'networkidle'});
 await page.click('#start-btn');
 // Real elapsed time; deliberately do not invoke advanceTime or modify state.
 await page.keyboard.down('w');await page.keyboard.down('Shift');await page.mouse.move(40,600);await page.mouse.down();
 await page.waitForTimeout(700);await page.mouse.up();await page.waitForTimeout(1200);await page.keyboard.up('w');await page.keyboard.up('Shift');
 await page.waitForTimeout(12000);
 const state=await page.evaluate(()=>JSON.parse(window.render_game_to_text()));
 const gl=await page.evaluate(()=>{const c=document.querySelector('canvas').getContext('webgl2');const d=c.getExtension('WEBGL_debug_renderer_info');return d?c.getParameter(d.UNMASKED_RENDERER_WEBGL):'unavailable';});
 const canvasRatio=await page.evaluate(()=>document.querySelector('canvas').width/innerWidth);
 const result={canvasRatio,date:new Date().toISOString(),environment:'Headless installed Chrome, 1728x780 display DPR2, canvas DPR capped at1; shared loaded macOS host. Real-time animation loop, no manual hook. Final rolling up-to-240 frame intervals; not a device-wide FPS guarantee.',renderer:gl,mode:state.mode,simulationTime:state.time,performance:state.performance,approxRenderLoopHz:1000/state.performance.meanFrameMs,assets:{arch:state.archLoaded,helmet:state.helmetLoaded},errors};
 await fs.writeFile('docs/evidence/performance.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{await browser.close();}

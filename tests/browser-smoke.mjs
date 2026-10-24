/** Supplemental UI checks: the installed action client cannot express Shift/Tab/resize/multi-touch. */
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const url = process.argv[2] || 'http://localhost:4183';
const out = 'playtest-output/independent';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader'] });
const errors = [], results = [];
const state = p => p.evaluate(() => JSON.parse(window.render_game_to_text()));
const tick = async (p, ms) => { for (let left = ms; left > 0; left -= 100) await p.evaluate(n => window.advanceTime(n), Math.min(100, left)); if (!ms) await p.evaluate(() => window.advanceTime(0)); };
const capture = async (p, name) => { await tick(p, 0); const s = await state(p); await writeFile(`${out}/${name}.json`, JSON.stringify(s, null, 2)); await p.screenshot({ path: `${out}/${name}.png`, fullPage: true, timeout: 60000 }); return s; };
const center = async (p, selector) => { const b = await p.locator(selector).boundingBox(); assert.ok(b, `${selector} visible`); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; };
const attachErrors = p => { p.on('pageerror', e => errors.push(String(e))); p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); }); };
try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  await context.addInitScript(() => { localStorage.setItem('rush-records-course350-v2', '{broken'); });
  const p = await context.newPage(); attachErrors(p);
  await p.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
  await p.waitForFunction(() => typeof window.render_game_to_text === 'function');
  await tick(p, 0); await p.keyboard.press('Enter'); await tick(p, 0);
  let s = await state(p); assert.equal(s.mode, 'playing'); assert.deepEqual(s.records, { assisted: null, unassisted: null });
  assert.equal(await p.locator('html').getAttribute('lang'), 'he');
  assert.equal(await p.locator('html').getAttribute('dir'), 'rtl');
  results.push('Hebrew/RTL document and malformed local records');

  let at = await center(p, '[data-anchor="B"]');
  await p.mouse.move(at.x, at.y); await p.mouse.down(); await tick(p, 17);
  s = await capture(p, '01-overreach');
  assert.equal(s.reason, 'overreach'); assert.equal(s.overreaches, 1); assert.equal(s.attached, null);
  await p.mouse.up(); await p.keyboard.press('KeyR'); await tick(p, 300);
  results.push('B overreach and local retry through normal controls');

  at = await center(p, '[data-anchor="A"]');
  await p.mouse.move(at.x, at.y); await p.keyboard.down('ArrowUp'); await p.keyboard.down('Shift'); await p.mouse.down();
  await tick(p, 700); s = await capture(p, '02-grapple'); assert.equal(s.attached, 'A');
  await p.mouse.up(); await tick(p, 1500); await p.keyboard.up('ArrowUp'); await p.keyboard.up('Shift');
  await tick(p, 300); s = await capture(p, '03-landing');
  assert.equal(s.checkpoints, 1); assert.equal(s.player.grounded, true); assert.ok(s.grabs >= 1 && s.releases >= 1);
  results.push('A launch, retained momentum release, landing and physical checkpoint 1');

  await p.keyboard.press('Escape'); await tick(p, 0); const frozen = await state(p);
  await tick(p, 1000); s = await state(p);
  assert.equal(s.mode, 'paused'); assert.equal(s.time, frozen.time); assert.deepEqual(s.player, frozen.player);
  await p.keyboard.press('Escape'); await tick(p, 0);
  const beforeRetry = await state(p); await p.keyboard.press('KeyR'); await tick(p, 0); s = await state(p);
  assert.equal(s.checkpoints, 1); assert.equal(s.time, beforeRetry.time); assert.ok(Math.abs(s.player.position.x - 20) < 0.01);
  results.push('Pause freezes state; checkpoint retry keeps run time');

  await p.keyboard.press('Tab'); await tick(p, 0); const beforeSurvey = await state(p);
  await tick(p, 1000); s = await state(p);
  assert.ok(Math.abs((s.time - beforeSurvey.time) - 0.2) < 0.0002); assert.equal(s.assisted, true);
  await p.keyboard.press('KeyH'); await tick(p, 0); s = await capture(p, '04-survey-hint'); assert.equal(s.hints, 1);
  await p.keyboard.press('Tab'); await tick(p, 0);
  results.push('Survey slows clock/physics to 20%; optional calculation records assistance');

  const beforeCamera = await state(p);
  await p.mouse.move(760, 430); await p.mouse.down({ button: 'right' }); await p.mouse.move(850, 400, { steps: 3 }); await p.mouse.up({ button: 'right' });
  await tick(p, 0); s = await state(p);
  assert.notEqual(s.camera.yaw, beforeCamera.camera.yaw);
  assert.deepEqual(s.player.position, beforeCamera.player.position);
  for (const a of s.anchors) { const old = beforeCamera.anchors.find(b => b.id === a.id); if (old) assert.ok(Math.abs(a.distance - old.distance) < 1e-7); }
  const yaw = s.camera.yaw;
  await p.setViewportSize({ width: 800, height: 600 }); await tick(p, 0); s = await capture(p, '05-resize');
  assert.equal(s.checkpoints, 1); assert.equal(s.camera.yaw, yaw);
  results.push('Camera orbit preserves geometry; resize preserves checkpoint and orbit');
  await p.keyboard.press('KeyF'); await tick(p, 0);
  const fullscreen = await p.evaluate(() => !!document.fullscreenElement);
  results.push(`Fullscreen request ${fullscreen ? 'entered' : 'unavailable in this headless context'}`);
  if (fullscreen) { await p.keyboard.press('KeyF'); await tick(p, 0); }
  await context.close();

  const touchContext = await browser.newContext({ viewport: { width: 1024, height: 768 }, hasTouch: true, isMobile: true });
  const mobile = await touchContext.newPage(); attachErrors(mobile);
  await mobile.goto(url, { waitUntil: 'networkidle', timeout: 60000 }); await mobile.waitForFunction(() => typeof window.render_game_to_text === 'function');
  await tick(mobile, 0);
  at = await center(mobile, '#start-btn'); await mobile.touchscreen.tap(at.x, at.y); await tick(mobile, 0);
  at = await center(mobile, '[data-anchor="A"]'); await mobile.touchscreen.tap(at.x, at.y); await tick(mobile, 0);
  s = await state(mobile); assert.equal(s.grabs, 0, 'touch badge should select without attaching');
  const cable = await center(mobile, '#grapple'), stick = await center(mobile, '#stick');
  const finger = { x: cable.x, y: cable.y, id: 1 };
  const cdp = await touchContext.newCDPSession(mobile);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [finger] }); await tick(mobile, 100);
  const movingFinger = { x: stick.x, y: stick.y - 35, id: 2 };
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [finger, movingFinger] }); await tick(mobile, 100);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [finger] }); await tick(mobile, 20);
  s = await state(mobile); assert.equal(s.attached, 'A', 'lifting movement finger must preserve held grapple');
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await tick(mobile, 20);
  s = await capture(mobile, '06-touch'); assert.equal(s.attached, null); assert.equal(s.releases, 1);
  results.push('Touch badge selection, move/grapple multi-pointer hold and independent release');
  await touchContext.close();
  assert.deepEqual(errors, [], 'browser console/runtime errors');
  await writeFile(`${out}/results.json`, JSON.stringify({ url, results, errors, status: 'passed' }, null, 2));
  console.log(JSON.stringify({ status: 'passed', results }, null, 2));
} catch (error) {
  await writeFile(`${out}/results.json`, JSON.stringify({ url, results, errors, status: 'failed', failure: String(error) }, null, 2));
  throw error;
} finally {
  await browser.close();
}

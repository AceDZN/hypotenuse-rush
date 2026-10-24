/** v2 UI acceptance checks, all through actual controls; no position/win injection. */
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const url = process.argv[2] || 'http://localhost:4183';
const out = 'playtest-output/flow-v2';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const errors = [], checks = [];
const read = p => p.evaluate(() => JSON.parse(window.render_game_to_text()));
const tick = (p, ms, draw = true) => p.evaluate(({ ms, draw }) => window.advanceTime(ms, draw), { ms, draw });
async function capture(p, name) {
  await tick(p, 0);
  await p.screenshot({ path: `${out}/${name}.png`, fullPage: true });
  await writeFile(`${out}/${name}.json`, JSON.stringify(await read(p), null, 2));
}
async function loaded(p) {
  p.on('pageerror', e => errors.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await p.goto(url, { waitUntil: 'networkidle' });
  await p.waitForFunction(() => window.render_game_to_text && JSON.parse(window.render_game_to_text()).art === 'loaded');
  await tick(p, 0);
}
async function visibleTargets(p) {
  const rects = await p.locator('.hook-target:visible').evaluateAll(els => els.map(el => {
    const r = el.getBoundingClientRect();
    const part = el.querySelector('.hook-parts').getBoundingClientRect();
    return { x: r.x, y: r.y, right: r.right, bottom: r.bottom, text: el.textContent,
      part: { x: part.x, y: part.y, right: part.right, bottom: part.bottom }, width: innerWidth, height: innerHeight };
  }));
  for (const r of rects) {
    assert.ok(r.x >= 0 && r.y > 85 && r.right <= r.width && r.bottom < r.height - 130, `target inside action area ${JSON.stringify(r)}`);
    assert.ok(!r.text.includes('0000000'), 'UI rounds only display values');
    if (r.part.right) assert.ok(r.part.x >= 0 && r.part.right <= r.width, 'measurement badge inside viewport');
  }
  for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) {
    const a = rects[i], b = rects[j];
    assert.ok(a.right <= b.x || b.right <= a.x || a.bottom <= b.y || b.bottom <= a.y, 'hook touch targets must not overlap');
  }
  const dims = await p.evaluate(() => [document.documentElement.scrollWidth, innerWidth]);
  assert.equal(dims[0], dims[1]);
}
try {
  const context = await browser.newContext({ viewport: { width: 1672, height: 941 } });
  await context.addInitScript(() => localStorage.setItem('rush-flow-v2', '{broken'));
  const p = await context.newPage(); await loaded(p);
  let s = await read(p); assert.equal(s.mode, 'ready'); assert.equal(s.stage, 0); assert.equal(s.best, null);
  assert.equal(await p.locator('#overlay').textContent(), ''); assert.equal(await p.locator('#timer').textContent(), '');
  await visibleTargets(p); await capture(p, '01-ready');
  checks.push('Starts directly in a playable world; one target; untimed; corrupt records tolerated; both Tripo GLBs loaded');
  await p.keyboard.down('Space'); await tick(p, 300); s = await read(p);
  assert.equal(s.mode, 'flying'); assert.equal(s.attached, 'intro-1'); await capture(p, '02-flight');
  await p.keyboard.up('Space'); await p.keyboard.press('Space'); await tick(p, 100); assert.equal((await read(p)).tricks, 1);
  await capture(p, '03-trick');
  await p.keyboard.press('Escape'); const paused = await read(p); await tick(p, 1500);
  assert.deepEqual((await read(p)).player, paused.player); assert.equal((await read(p)).elapsed, paused.elapsed);
  await p.keyboard.press('Escape'); await tick(p, 1150); assert.equal((await read(p)).mode, 'landing');
  await capture(p, '04-landed'); await tick(p, 700); s = await read(p);
  assert.equal(s.mode, 'ready'); assert.equal(s.stage, 1); assert.equal(s.landed, 1); assert.equal(s.launches, 1);
  checks.push('One press launches; optional air trick; pause freezes; actual landing and next choice without movement/release input');
  await visibleTargets(p); await capture(p, '05-choice');
  const position = s.player.position;
  await p.locator('[data-hook="fork-1"]').click(); s = await read(p);
  assert.equal(s.message, 'overreach'); assert.equal(s.mistakes, 1); assert.equal(s.mode, 'ready');
  assert.deepEqual(s.player.position, position); assert.equal(s.landed, 1); await capture(p, '06-rejected');
  await p.locator('[data-hook="fork-2"]').hover(); await tick(p, 0);
  assert.equal((await read(p)).selected, 'fork-2'); assert.equal((await read(p)).recoilTarget, 'fork-1', 'recoil remains on rejected hook after selection changes');
  await p.locator('#calc').click(); assert.equal((await read(p)).hint, true);
  await p.locator('#calc').click();
  await p.locator('[data-hook="fork-2"]').click(); await tick(p, 2200); s = await read(p);
  assert.equal(s.stage, 2); assert.equal(s.landed, 2); assert.equal(s.reach, 13);
  checks.push('Wrong hook leaves progress/position safe; immediate correct retry; optional calculation; explicit reach change');
  await visibleTargets(p); await capture(p, '07-high-choice');
  await p.setViewportSize({ width: 390, height: 844 }); await tick(p, 0); await visibleTargets(p); await capture(p, '08-phone-choice');
  assert.equal((await read(p)).stage, 2);
  await p.setViewportSize({ width: 1672, height: 941 }); await tick(p, 0);
  await p.keyboard.press('ArrowRight'); assert.equal((await read(p)).selected, 'rise-2');
  await p.keyboard.press('ArrowLeft'); assert.equal((await read(p)).selected, 'rise-1');
  await p.keyboard.press('Space'); await tick(p, 2200); s = await read(p);
  assert.equal(s.mode, 'finished'); assert.equal(s.landed, 3); assert.equal(s.launches, 3); await capture(p, '09-finish');
  checks.push('Phone resize retains stage and usable targets; keyboard selection and launch; all three flights finish');
  await p.locator('#timed-replay').click(); await tick(p, 0); s = await read(p);
  assert.equal(s.timed, true); assert.equal(s.stage, 0); assert.equal(s.mistakes, 0); assert.equal(s.tricks, 0);
  for (const id of ['intro-1', 'fork-2', 'rise-1']) { await p.locator(`[data-hook="${id}"]`).click(); await tick(p, 2200); }
  s = await read(p); assert.equal(s.mode, 'finished'); assert.ok(s.best > 0);
  checks.push('Timed replay is opt-in; counters reset; best saved after actual finish');
  const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const touch = await phone.newPage(); await loaded(touch); await visibleTargets(touch); await capture(touch, '10-phone-opening');
  for (const id of ['intro-1', 'fork-2', 'rise-1']) { await touch.locator(`[data-hook="${id}"]`).tap(); await tick(touch, 2200); }
  assert.equal((await read(touch)).mode, 'finished');
  checks.push('Touch-only three-flight run finishes with one tap per valid hook');
  assert.deepEqual(errors, []);
  await writeFile(`${out}/results.json`, JSON.stringify({ url, date: new Date().toISOString(), checks, errors, humanFeelVerified: false }, null, 2));
  console.log(JSON.stringify({ checks, errors }));
} finally { await browser.close(); }

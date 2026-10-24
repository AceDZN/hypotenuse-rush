/** Campaign UI/evidence run: normal inputs and deterministic time, no win/position writes. */
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const url = process.argv[2] || 'http://localhost:4183';
const out = 'playtest-output/campaign-v3'; await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const errors = [], results = [];
const read = p => p.evaluate(() => JSON.parse(window.render_game_to_text()));
const tick = (p, ms, draw = true) => p.evaluate(a => window.advanceTime(a.ms, a.draw), { ms, draw });
async function shot(p, name) { await tick(p, 0); await p.screenshot({ path: `${out}/${name}.png`, fullPage: true }); await fs.writeFile(`${out}/${name}.json`, JSON.stringify(await read(p), null, 2)); }
async function targets(p) {
  const rects = await p.locator('.hook-target:visible').evaluateAll(els => els.map(el => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, right: r.right, bottom: r.bottom, width: innerWidth, height: innerHeight }; }));
  assert.equal(rects.length, 3);
  for (const r of rects) assert.ok(r.x >= 0 && r.right <= r.width && r.y >= 140 && r.bottom < r.height - 240, `hook control fits ${JSON.stringify(r)}`);
  for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) { const a = rects[i], b = rects[j]; assert.ok(a.right <= b.x || b.right <= a.x || a.bottom <= b.y || b.bottom <= a.y, 'hook buttons separate'); }
  const rope = await p.locator('.rope-spec').boundingBox(); const vp = p.viewportSize();
  assert.ok(rope && rope.x >= 0 && rope.x + rope.width <= vp.width && rope.y >= 0, 'whole rope specification visible');
  assert.equal(await p.evaluate(() => document.documentElement.scrollWidth), vp.width, 'no page overflow');
}
try {
  const context = await browser.newContext({ viewport: { width: 1672, height: 941 } });
  const p = await context.newPage(); p.on('pageerror', e => errors.push(e.message)); p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await p.goto(url, { waitUntil: 'networkidle' }); await p.waitForFunction(() => window.render_game_to_text && JSON.parse(window.render_game_to_text()).art === 'loaded'); await tick(p, 0);
  assert.equal((await read(p)).totalFlights, 36); await targets(p);
  const first = await read(p), bad = first.hooks.find(h => !h.reachable);
  await p.locator(`[data-hook="${bad.id}"]`).click(); assert.equal((await read(p)).mistakes, 0);
  await p.locator('#launch').click(); assert.equal((await read(p)).mistakes, 1); await shot(p, '02-rejection');
  assert.match(await p.locator('#feedback').textContent(), /10.82/); assert.match(await p.locator('#feedback').textContent(), /0.82/);
  results.push('Selection is not an attempt; rejected shot exposes rope, diagonal and 0.82m shortfall');
  for (let l = 0; l < 12; l++) {
    for (let hop = 0; hop < 3; hop++) {
      const before = await read(p); assert.equal(before.level, l); assert.equal(before.hop, hop); assert.equal(before.mode, 'ready');
      const good = before.hooks.find(h => h.reachable); await p.locator(`[data-hook="${good.id}"]`).click();
      assert.equal((await read(p)).launches, before.launches); await targets(p);
      if (hop === 0 && l % 3 === 0) {
        await shot(p, `region-${l / 3}-ready`);
        await p.setViewportSize({ width: 390, height: 844 }); await tick(p, 0); await targets(p); await shot(p, `region-${l / 3}-phone`);
        await p.setViewportSize({ width: 1672, height: 941 }); await tick(p, 0);
      }
      await p.keyboard.press('Space'); await tick(p, 350, false);
      assert.equal((await read(p)).mode, 'flying');
      if (hop === 0 && l % 3 === 0) { await tick(p, 0); await shot(p, `region-${l / 3}-cable`); await tick(p, 400, false); await p.keyboard.press('Space'); await tick(p, 100); await shot(p, `region-${l / 3}-flight`); await tick(p, 1350, false); }
      else await tick(p, 1850, false);
      const after = await read(p); assert.equal(after.landed, hop + 1);
    }
    assert.equal((await read(p)).mode, 'finished');
    if (l === 0) { await shot(p, '03-level-complete'); await p.reload({ waitUntil: 'networkidle' }); await tick(p, 0); assert.equal((await read(p)).mode, 'finished'); assert.equal((await read(p)).level, 0); }
    if (l < 11) { await p.locator('#next-level').click(); await tick(p, 0); assert.equal((await read(p)).level, l + 1); }
  }
  const finished = await read(p); assert.equal(finished.progress.records.filter(r => r.completed).length, 12); await shot(p, '04-campaign-complete');
  await p.locator('#map-finish').click(); await shot(p, '05-complete-map');
  await p.reload({ waitUntil: 'networkidle' }); await tick(p, 0); assert.equal((await read(p)).level, 11); assert.equal((await read(p)).mode, 'finished');
  results.push('All36 physical crossings, 11 Next Level transitions, 12 completed saves and final reload retained');
  // Replay comes from a real completed save produced above, never an injected unlock.
  await p.locator('#map-finish').click(); await p.locator('[data-level="0"]').click(); await p.locator('#open-level').click(); await tick(p, 0);
  await p.locator('#journey').click(); await shot(p, '01-map'); await p.locator('#close-map').click();
  await p.locator('[data-hook="l1-h1-2"]').click(); await tick(p, 0); await shot(p, '01-opening');
  assert.deepEqual(errors, []); results.push('Four region ready/flight/phone captures; rope and controls fit, no overlapping targets, no console errors');
  await fs.writeFile(`${out}/results.json`, JSON.stringify({ date: new Date().toISOString(), url, results, errors, humanEnjoymentVerified: false }, null, 2)); console.log(JSON.stringify({ results, errors }));
} finally { await browser.close(); }

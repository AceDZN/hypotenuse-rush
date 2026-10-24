import test from 'node:test';
import assert from 'node:assert/strict';
import { runRoute } from './course-witness.ts';

test('authored broad route is traversable through nine grapples and three ordered gates by continuous inputs', t => {
  const s = runRoute();
  t.diagnostic(`Numerical broad route: ${s.finishedTime.toFixed(3)} simulation seconds, ${s.grabs} grapples, ${s.falls} falls. This does not establish human fun or play duration.`);
});


test('narrow route with S release and a sprint jump reaches the merge and finish', t => {
  const s = runRoute(true);
  assert.ok(s.events.some(e => e.type === 'jump'));
  assert.ok(s.events.some(e => e.type === 'grab' && e.anchor === 'S' && e.reason === 'ready'));
  t.diagnostic(`Numerical shortcut route: ${s.finishedTime.toFixed(3)} simulation seconds, ${s.grabs} grapples, ${s.falls} falls.`);
});

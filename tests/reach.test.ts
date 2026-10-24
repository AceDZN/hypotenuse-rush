import test from 'node:test';
import assert from 'node:assert/strict';
import { inspectReach, segmentBox, sweepCapsule, type V, type Box } from '../src/rules.ts';

const O: V = { x: 0, y: 0, z: 0 };
const close = (actual: number, expected: number, epsilon = 1e-9) =>
  assert.ok(Math.abs(actual - expected) <= epsilon, `${actual} should equal ${expected}`);
const add = (a: V, b: V): V => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
const wall: Box = { id: 'line-of-sight-rock', min: { x: 3, y: 2, z: -1 }, max: { x: 4, y: 5, z: 1 } };

test('opening witnesses: 8–6–10 is in range; horizontally closer 6–9 is not', () => {
  const a = inspectReach(O, { x: 8, y: 6, z: 0 }, 10);
  assert.equal(a.reachable, true);
  assert.equal(a.reason, 'ready');
  close(a.squared, 100);
  close(a.distance, 10);
  const b = inspectReach(O, { x: 6, y: 9, z: 0 }, 10);
  assert.equal(b.reachable, false);
  assert.equal(b.reason, 'overreach');
  close(b.squared, 117);
  close(b.distance, Math.sqrt(117));
  assert.ok(b.dx < a.dx && b.distance > a.distance);
});

test('spatial witness includes lateral displacement and two perpendicular triangles', () => {
  const a = { x: 3, y: 12, z: 4 };
  const full = inspectReach(O, a, 13);
  assert.equal(full.reachable, true);
  close(full.face, 5);
  close(full.squared, 169);
  close(full.distance, 13);
  assert.equal(inspectReach(O, a, 10).reason, 'overreach');
  assert.ok(full.distance > Math.sqrt(3 ** 2 + 12 ** 2), 'lateral offset must participate');
  assert.notEqual(full.distance, 3 + 12 + 4, 'sum of legs is not the diagonal');
  assert.notEqual(full.distance, full.squared, 'squared metres are not metres');
});

test('high shelf 5–12–13 and a new 2–3–6 witness transfer beyond the opening', () => {
  close(inspectReach(O, { x: 5, y: 12, z: 0 }, 13).distance, 13);
  assert.equal(inspectReach(O, { x: 5, y: 12, z: 0 }, 10).reachable, false);
  const changed = inspectReach(O, { x: 2, y: 6, z: 3 }, 7);
  close(changed.distance, 7);
  assert.equal(changed.reachable, true);
  assert.equal(inspectReach(O, { x: 2, y: 6, z: 3 }, 6.9).reachable, false);
});

test('common translation and axis signs preserve reach without a camera argument', () => {
  const p = { x: 8, y: 6, z: 0 };
  const t = { x: 120, y: -7, z: 88 };
  const translated = inspectReach(t, add(t, p), 10);
  close(translated.distance, 10);
  assert.equal(translated.reachable, true);
  assert.equal(inspectReach(O, { x: -8, y: -6, z: 0 }, 10).reachable, true);
  // The rule's input is world geometry. Rotating an independent camera supplies no new origin.
  for (const _cameraYaw of [0, Math.PI / 2, Math.PI, -Math.PI / 3]) {
    close(inspectReach(O, p, 10).distance, 10);
  }
});

test('moving the actual harness changes the decision immediately', () => {
  const hook = { x: 8, y: 6, z: 0 };
  assert.equal(inspectReach(O, hook, 10).reachable, true);
  assert.equal(inspectReach({ x: -1, y: 0, z: 0 }, hook, 10).reason, 'overreach');
  const nearer = inspectReach({ x: 1, y: 0, z: 0 }, hook, 10);
  close(nearer.distance, Math.sqrt(85));
  assert.equal(nearer.reachable, true);
});

test('obstruction and aim are distinct from reach; overreach is not mislabeled obstruction', () => {
  assert.equal(inspectReach(O, { x: 8, y: 6, z: 0 }, 10, [wall]).reason, 'obstructed');
  assert.equal(inspectReach(O, { x: 8, y: 6, z: 0 }, 9, [wall]).reason, 'overreach');
  assert.equal(inspectReach(O, { x: 8, y: 6, z: 0 }, 10, [], false).reason, 'not-aimed');
  const offPath: Box = { id: 'off-path', min: { x: 3, y: 2, z: 2 }, max: { x: 4, y: 5, z: 3 } };
  assert.equal(inspectReach(O, { x: 8, y: 6, z: 0 }, 10, [offPath]).reason, 'ready');
});

test('segment obstruction is bounded by the endpoints rather than an infinite ray', () => {
  assert.ok(segmentBox(O, { x: 8, y: 6, z: 0 }, wall));
  assert.ok(!segmentBox(O, { x: 2, y: 1.5, z: 0 }, wall));
  assert.ok(!segmentBox(O, { x: -8, y: -6, z: 0 }, wall));
});

test('swept player collision stops a high-speed crossing of a narrow wall', () => {
  const blocker: Box = { id: 'thin-wall', min: { x: 0, y: -2, z: -10 }, max: { x: 0.25, y: 5, z: 10 } };
  const hit = sweepCapsule({ x: -5, y: 0, z: 0 }, { x: 20, y: 0, z: 0 }, [blocker]);
  assert.ok(hit.hit);
  assert.ok(hit.position.x < 0, `crossed thin wall at x=${hit.position.x}`);
});

test('swept landing cannot tunnel through a floor in one large movement', () => {
  const floor: Box = { id: 'floor', min: { x: -10, y: -1, z: -10 }, max: { x: 10, y: 0, z: 10 } };
  const hit = sweepCapsule({ x: 0, y: 4, z: 0 }, { x: 0, y: -20, z: 0 }, [floor]);
  assert.ok(hit.grounded);
  assert.ok(hit.position.y >= -1e-6, `feet penetrated floor at y=${hit.position.y}`);
  assert.ok(hit.position.y < 0.1, 'landing should stop at the actual collision surface');
});

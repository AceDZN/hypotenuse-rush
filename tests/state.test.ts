import test from 'node:test';
import assert from 'node:assert/strict';
import {
  COURSE, FIXED, REACH_EPS, SKIN, HEIGHT, RADIUS,
  createState, start, retry, restart, togglePause, setSurvey, hint,
  harness, inspectReach, tryAttach, release, step, advance,
  type Input,
} from '../src/rules.ts';

const idle: Input = { x: 0, z: 0, jump: false, sprint: false, grapple: false, anchor: null };
const moving: Input = { ...idle, x: 1, sprint: true };
const play = () => { const s = createState(); start(s); return s; };
const near = (a: number, b: number, e = 1e-8) => assert.ok(Math.abs(a - b) < e, `${a} should equal ${b}`);

test('reach epsilon is numerical and independent from capsule geometry/collision skin', () => {
  assert.equal(FIXED, 1 / 120);
  assert.ok(REACH_EPS < SKIN / 1000);
  assert.ok(HEIGHT > RADIUS * 2);
  const o = { x: 0, y: 0, z: 0 };
  assert.equal(inspectReach(o, { x: 10 + REACH_EPS / 2, y: 0, z: 0 }, 10).reachable, true);
  assert.equal(inspectReach(o, { x: 10 + REACH_EPS * 2, y: 0, z: 0 }, 10).reachable, false);
});


test('marked actual harness stances match their advertised exact witness components', () => {
  const s = play();
  const a = COURSE.anchors.find(a => a.id === 'A')!;
  const first = inspectReach(harness(s), a.p, 10);
  near(first.dx, 8, REACH_EPS); near(first.dy, 6, REACH_EPS); near(first.dz, 0, REACH_EPS);
  s.p = { ...COURSE.stances[3], y: COURSE.stances[3].y + SKIN };
  const g = COURSE.anchors.find(a => a.id === 'G')!;
  const spatial = inspectReach(harness(s), g.p, 13);
  near(spatial.dx, 3, REACH_EPS); near(spatial.dy, 12, REACH_EPS); near(spatial.dz, 4, REACH_EPS);
});

test('grapple samples actual moving harness, not initial/checkpoint coordinates', () => {
  const s = play();
  const oldOrigin = harness(s);
  assert.equal(tryAttach(s, 'B'), false);
  assert.equal(s.overreaches, 1);
  s.p.x = 3;
  const hook = COURSE.anchors.find(a => a.id === 'B')!;
  assert.equal(inspectReach(harness(s), hook.p, s.reach, COURSE.boxes).reachable, true);
  assert.equal(tryAttach(s, 'B'), true);
  const grab = s.events.filter(e => e.type === 'grab').at(-1)!;
  assert.deepEqual(grab.origin, harness(s));
  assert.notDeepEqual(grab.origin, oldOrigin);
});

test('successful attach starts at current position and pull integrates without teleporting', () => {
  const s = play();
  const initial = { ...s.p };
  assert.equal(tryAttach(s, 'A'), true);
  assert.deepEqual(s.p, initial);
  step(s, { ...idle, grapple: true, anchor: 'A' });
  assert.ok(Math.hypot(s.p.x - initial.x, s.p.y - initial.y, s.p.z - initial.z) < 0.1);
  assert.ok(s.v.x > 0 && s.v.y > 0);
});

test('release retains velocity; reattachment cooldown is a separate gate', () => {
  const s = play();
  assert.equal(tryAttach(s, 'A'), true);
  s.v = { x: 7, y: 4, z: -2 };
  const velocity = { ...s.v };
  release(s);
  assert.equal(s.attached, null);
  assert.deepEqual(s.v, velocity);
  near(s.cooldown, 0.25);
  assert.equal(tryAttach(s, 'A'), false);
  advance(s, idle, 260);
  assert.equal(s.cooldown, 0);
  assert.equal(tryAttach(s, 'A'), true);
  assert.equal(s.releases, 1);
});

test('hold expires and attached speed is bounded; no perpetual climb', () => {
  const s = play();
  assert.equal(tryAttach(s, 'A'), true);
  for (let i = 0; i < 160 && s.attached; i++) {
    step(s, { ...idle, grapple: true, anchor: 'A' });
    assert.ok(Math.hypot(s.v.x, s.v.y, s.v.z) <= 18 + 1e-8);
  }
  assert.equal(s.attached, null);
  assert.ok(s.releases > 0);
});

test('a newly obstructed attached cable detaches and records the distinct reason', () => {
  const s = play();
  assert.equal(tryAttach(s, 'A'), true);
  // Pure rule fixture moves an attached cable across the exact authored blocker.
  s.p = { x: 30, y: 2, z: 3 };
  s.attached = 'D';
  step(s, { ...idle, grapple: true, anchor: 'D' });
  assert.equal(s.attached, null);
  assert.equal(s.reason, 'cable-blocked');
  assert.equal(s.obstructions, 1);
});

test('equal total time with different render partitions gives identical fixed-step motion', () => {
  const a = play(), b = play(), c = play();
  for (let i = 0; i < 120; i++) advance(a, moving, 1000 / 120);
  for (let i = 0; i < 30; i++) advance(b, moving, 1000 / 30);
  for (const ms of [17, 71, 19, 103, 79, 211, 500]) advance(c, moving, ms);
  for (const s of [b, c]) {
    near(s.time, a.time);
    near(s.p.x, a.p.x); near(s.p.y, a.p.y); near(s.p.z, a.p.z);
    near(s.v.x, a.v.x); near(s.v.y, a.v.y); near(s.v.z, a.v.z);
  }
});

test('pause freezes simulation, run time, position and cooldown; resume does not catch up', () => {
  const s = play();
  advance(s, moving, 400);
  s.cooldown = 0.25;
  togglePause(s);
  const frozen = { time: s.time, p: { ...s.p }, v: { ...s.v }, cooldown: s.cooldown };
  advance(s, moving, 1000);
  assert.deepEqual({ time: s.time, p: s.p, v: s.v, cooldown: s.cooldown }, frozen);
  togglePause(s);
  advance(s, moving, 100);
  near(s.time - frozen.time, 0.1);
});

test('survey slows physics and run clock together to 20% and records assistance', () => {
  const s = play(); setSurvey(s, true);
  advance(s, moving, 1000);
  near(s.time, 0.2);
  assert.equal(s.assisted, true);
  assert.ok(s.events.some(e => e.type === 'survey'));
  hint(s);
  assert.equal(s.hints, 1);
  setSurvey(s, false);
  advance(s, idle, 1000);
  near(s.time, 1.2);
});

test('checkpoint order is physical and finish cannot bypass it', () => {
  const s = play();
  const later = COURSE.checkpoints[1].p;
  s.p = { ...later, y: later.y + SKIN };
  step(s, idle);
  assert.equal(s.cp, 0);
  s.p = { ...COURSE.finish, y: COURSE.finish.y + SKIN };
  step(s, idle);
  assert.equal(s.mode, 'playing');
  for (let i = 0; i < 3; i++) {
    const p = COURSE.checkpoints[i].p;
    s.p = { ...p, y: p.y + SKIN }; s.v = { x: 0, y: 0, z: 0 };
    step(s, idle);
    assert.equal(s.cp, i + 1);
    assert.equal(s.reach, i >= 1 ? 13 : 10);
  }
  s.p = { ...COURSE.finish, y: COURSE.finish.y + SKIN }; s.v = { x: 0, y: 0, z: 0 };
  step(s, idle);
  assert.equal(s.mode, 'finished');
  assert.ok(s.events.some(e => e.type === 'finish'));
});

test('checkpoint retry retains run clock and statistics; full restart begins a fresh run', () => {
  const s = play();
  advance(s, idle, 700);
  s.cp = 2; s.reach = 13; s.falls = 3; s.hints = 1; s.assisted = true;
  const time = s.time;
  retry(s);
  near(s.p.x, COURSE.checkpoints[1].p.x);
  near(s.p.y, COURSE.checkpoints[1].p.y + SKIN);
  near(s.time, time);
  assert.equal(s.falls, 3); assert.equal(s.hints, 1); assert.equal(s.cp, 2);
  restart(s);
  assert.equal(s.time, 0); assert.equal(s.cp, 0); assert.equal(s.falls, 0);
  assert.equal(s.hints, 0); assert.equal(s.assisted, false); assert.equal(s.reach, 10);
  assert.equal(s.mode, 'playing');
});

test('fall event returns to latest checkpoint within one simulation second', () => {
  const s = play(); s.cp = 1; s.p.y = -15; s.grounded = false;
  step(s, idle);
  assert.equal(s.falls, 1);
  const fellAt = s.time;
  advance(s, idle, 500);
  assert.equal(s.respawnTime, 0);
  assert.ok(s.time - fellAt < 1);
  near(s.p.x, COURSE.checkpoints[0].p.x);
  assert.equal(s.cp, 1);
});

test('grounded lateral motion keeps a stable harness height at exact reach stances', () => {
  const s = play(); s.p.x = -10;
  for (let i = 0; i < 90; i++) {
    step(s, moving);
    assert.equal(s.grounded, true);
    assert.ok(Math.abs(s.p.y - SKIN) <= 1e-5, `grounded feet drifted to ${s.p.y}; expected ${SKIN}`);
  }
});

test('authored alternative hooks counter height-only and distance-only judgments at their marked stances', () => {
  const s = play();
  const stance = (i: number) => { s.p = { ...COURSE.stances[i], y: COURSE.stances[i].y + SKIN }; };
  const witness = (id: string, reach: number) => inspectReach(harness(s), COURSE.anchors.find(a => a.id === id)!.p, reach, COURSE.boxes);
  stance(1);
  const blocked = witness('D', 10);
  assert.ok(blocked.distance < 10);
  assert.equal(blocked.reason, 'obstructed');
  assert.equal(witness('C', 10).reason, 'ready');
  stance(2);
  const good = witness('E', 13), tooHigh = witness('F', 13);
  near(good.distance, 13, REACH_EPS);
  assert.equal(good.reason, 'ready');
  assert.ok(Math.abs(tooHigh.dx) < Math.abs(good.dx));
  assert.ok(tooHigh.distance > good.distance);
  assert.equal(tooHigh.reason, 'overreach');
});

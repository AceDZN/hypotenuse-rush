import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FLIGHT, HARNESS_HEIGHT, STAGES, advanceFlight, chooseHook, createFlightState,
  flightHarness, inspectFlightHook, launchSelected, performTrick, restartFlight,
  retryFlight, selectHook, toggleFlightPause, type FlightState, type Vec,
} from '../src/flight.ts';

const close = (actual: number, expected: number, epsilon = 1e-9) =>
  assert.ok(Math.abs(actual - expected) <= epsilon, `${actual} should equal ${expected}`);
const closeVec = (actual: Vec, expected: Vec) => {
  for (const axis of ['x', 'y', 'z'] as const) close(actual[axis], expected[axis]);
};
const launchIds = ['intro-1', 'fork-2', 'rise-1'];
const finishHop = (s: FlightState, lean = 0) => {
  assert.equal(chooseHook(s, launchIds[s.stage]), true);
  advanceFlight(s, 2150, lean);
};
const movingSnapshot = (s: FlightState) => ({
  p: { ...s.p }, v: { ...s.v }, elapsed: s.elapsed, phaseTime: s.phaseTime,
  accumulator: s.accumulator, stage: s.stage, landed: s.landed, launches: s.launches,
  mistakes: s.mistakes, selected: s.selected, attached: s.attached,
  message: s.message, messageTime: s.messageTime, trickTime: s.trickTime,
});

test('current fork witnesses use the physical harness and do not reward one fixed button', () => {
  const s = createFlightState();
  assert.deepEqual(flightHarness(s), { x: 0, y: HARNESS_HEIGHT, z: 0 });
  assert.equal(STAGES[0].hooks.length, 1);
  assert.equal(STAGES[0].showMeasurements, false);
  const guided = inspectFlightHook(s, 'intro-1');
  close(guided.dx, 8); close(guided.dy, 6); close(guided.distance, 10);
  assert.equal(guided.reachable, true);

  finishHop(s);
  assert.equal(STAGES[1].showMeasurements, true);
  const bad = inspectFlightHook(s, 'fork-1'), good = inspectFlightHook(s, 'fork-2');
  close(bad.dx, 6); close(bad.dy, 9); close(bad.squared, 117);
  close(bad.distance, Math.sqrt(117));
  assert.equal(bad.reachable, false);
  close(good.dx, 8); close(good.dy, 6); close(good.distance, 10);
  assert.equal(good.reachable, true);
  assert.ok(bad.dx < good.dx && bad.distance > good.distance);

  finishHop(s);
  const higher = inspectFlightHook(s, 'rise-1'), tooHigh = inspectFlightHook(s, 'rise-2');
  close(higher.dx, 5); close(higher.dy, 12); close(higher.distance, 13);
  assert.equal(higher.reachable, true);
  close(tooHigh.distance, Math.sqrt(178));
  assert.equal(tooHigh.reachable, false);
  assert.deepEqual(STAGES.slice(1).map((stage, index) =>
    stage.hooks.findIndex(h => h.id === launchIds[index + 1])), [1, 0]);
});

test('exact reach is inclusive; the small numeric tolerance is not an extra metre', () => {
  const s = createFlightState(), h = flightHarness(s);
  const hook = (length: number) => ({ id: 'boundary', label: '?',
    position: { x: h.x + length, y: h.y, z: h.z } });
  assert.equal(inspectFlightHook(s, hook(10)).reachable, true);
  assert.equal(inspectFlightHook(s, hook(10 + FLIGHT.reachEpsilon / 2)).reachable, true);
  assert.equal(inspectFlightHook(s, hook(10 + FLIGHT.reachEpsilon * 2)).reachable, false);
  assert.equal(inspectFlightHook(s, hook(10.001)).reason, 'overreach');
});

test('translation, lateral displacement and the actual moving harness govern distance', () => {
  const s = createFlightState();
  const shift = { x: 120, y: -7, z: 88 };
  const translated = { p: shift, stage: 0 };
  const h = flightHarness(translated);
  const hook = { id: 'translated', label: '?', position: { x: h.x + 8, y: h.y + 6, z: h.z } };
  close(inspectFlightHook(translated, hook).distance, 10);
  assert.equal(inspectFlightHook(translated, hook).reachable, true);
  assert.equal(inspectFlightHook({ p: { ...shift, x: shift.x - 1 }, stage: 0 }, hook).reachable, false);
  const lateral = { id: 'lateral', label: '?', position: { x: 6, y: 9.05, z: 1 } };
  close(inspectFlightHook(s, lateral).distance, Math.sqrt(101));
  assert.equal(inspectFlightHook(s, lateral).reachable, false);
  // No camera argument or screen coordinates enter either inspection.
});

test('one click supplies the whole first flight and stops at the next choice', () => {
  const s = createFlightState(), origin = { ...s.p };
  assert.equal(chooseHook(s, 'intro-1'), true);
  assert.equal(s.mode, 'flying');
  assert.deepEqual(s.p, origin, 'a launch impulse is not a position teleport');
  assert.equal(s.attached, 'intro-1');
  advanceFlight(s, 10_000);
  assert.equal(s.mode, 'ready'); assert.equal(s.stage, 1);
  assert.equal(s.launches, 1); assert.equal(s.landed, 1);
  closeVec(s.p, STAGES[0].landing);
  assert.deepEqual(s.v, { x: 0, y: 0, z: 0 });
  assert.equal(s.events.filter(e => e.type === 'launch').length, 1);
  assert.equal(s.events.filter(e => e.type === 'land').length, 1);
});

test('pull uses constant acceleration; release retains velocity and then gravity acts', () => {
  const s = createFlightState();
  chooseHook(s, 'intro-1');
  const initial = { ...s.v };
  advanceFlight(s, 100);
  closeVec(s.p, {
    x: initial.x * .1 + .5 * 22.4 * .1 ** 2,
    y: initial.y * .1 + .5 * 16.8 * .1 ** 2, z: 0,
  });
  closeVec(s.v, { x: initial.x + 22.4 * .1, y: initial.y + 16.8 * .1, z: 0 });
  advanceFlight(s, 350);
  assert.equal(s.attached, null);
  close(s.phaseTime, .45);
  closeVec(s.p, { x: 2.9124, y: 2.74755, z: 0 });
  closeVec(s.v, { x: initial.x + 22.4 * .45, y: initial.y + 16.8 * .45, z: 0 });
  const releaseP = { ...s.p }, releaseV = { ...s.v };
  const releaseEvent = s.events.find(e => e.type === 'release')!;
  closeVec(releaseEvent.velocity as Vec, releaseV);
  advanceFlight(s, 100);
  closeVec(s.p, { x: releaseP.x + releaseV.x * .1,
    y: releaseP.y + releaseV.y * .1 - .5 * FLIGHT.gravity * .1 ** 2, z: 0 });
  closeVec(s.v, { x: releaseV.x, y: releaseV.y - FLIGHT.gravity * .1, z: 0 });
});

test('physical downward contact precedes progress and the landing celebration', () => {
  const s = createFlightState();
  chooseHook(s, 'intro-1');
  advanceFlight(s, 1490);
  assert.equal(s.mode, 'flying'); assert.equal(s.landed, 0); assert.equal(s.stage, 0);
  assert.ok(s.p.y > STAGES[0].landing.y);
  advanceFlight(s, 10);
  assert.equal(s.mode, 'landing'); assert.equal(s.landed, 1); assert.equal(s.stage, 0);
  closeVec(s.p, STAGES[0].landing);
  const contact = s.events.find(e => e.type === 'land')!;
  assert.ok((contact.approachVelocity as Vec).y < 0);
  close(contact.time, 1.5);
  const physicalContact = { ...s.p };
  advanceFlight(s, 640);
  assert.equal(s.mode, 'landing'); assert.equal(s.stage, 0);
  advanceFlight(s, 10);
  assert.equal(s.mode, 'ready'); assert.equal(s.stage, 1);
  assert.deepEqual(s.p, physicalContact, 'changing stage must not snap to an authored origin');
});

test('three accepted choices finish without steering, hold timing or camera input', () => {
  for (const lean of [-1, 0, 1]) {
    const s = createFlightState();
    finishHop(s, lean); finishHop(s, lean); finishHop(s, lean);
    assert.equal(s.mode, 'finished'); assert.equal(s.stage, 2);
    assert.equal(s.landed, 3); assert.equal(s.launches, 3); assert.equal(s.mistakes, 0);
    assert.equal(s.rings, 0, 'the pilot has no invented ring-collection mechanic');
    closeVec(s.p, STAGES[2].landing); close(s.elapsed, 6.45);
    const contacts = s.events.filter(e => e.type === 'land');
    assert.deepEqual(contacts.map(e => e.stage), [0, 1, 2]);
    assert.ok(contacts.every(e => (e.approachVelocity as Vec).y < 0));
    const final = movingSnapshot(s);
    advanceFlight(s, 5000);
    assert.deepEqual(movingSnapshot(s), final);
    assert.equal(chooseHook(s, 'rise-1'), false);
  }
});

test('an incorrect choice preserves the completed flight and allows immediate recovery', () => {
  const s = createFlightState(); finishHop(s);
  const origin = { ...s.p }, v = { ...s.v }, clock = s.elapsed;
  assert.equal(chooseHook(s, 'fork-1'), false);
  assert.equal(s.mode, 'ready'); assert.equal(s.selected, 'fork-1');
  assert.equal(s.mistakes, 1); assert.equal(s.launches, 1); assert.equal(s.landed, 1);
  assert.equal(s.stage, 1); assert.equal(s.attached, null);
  assert.deepEqual(s.p, origin); assert.deepEqual(s.v, v); assert.equal(s.elapsed, clock);
  assert.equal(s.message, 'overreach'); assert.ok(s.messageTime > 0);
  assert.equal(chooseHook(s, 'fork-2'), true, 'feedback expiry must not gate the next click');
  assert.equal(s.mistakes, 1); assert.equal(s.launches, 2); assert.equal(s.mode, 'flying');
  advanceFlight(s, 2150);
  assert.equal(s.stage, 2); assert.equal(s.landed, 2);
});

test('nonblocking rejection feedback expires and retry does not clear progress', () => {
  const s = createFlightState(); finishHop(s);
  chooseHook(s, 'fork-1');
  const p = { ...s.p };
  advanceFlight(s, 1100);
  assert.equal(s.messageTime, 0); assert.equal(s.message, 'choose-hook');
  assert.equal(s.mode, 'ready'); assert.equal(s.mistakes, 1);
  assert.deepEqual(s.p, p); assert.equal(s.landed, 1);
  chooseHook(s, 'fork-1');
  assert.equal(retryFlight(s), true);
  assert.equal(s.message, 'choose-hook'); assert.equal(s.messageTime, 0);
  assert.equal(s.mistakes, 2); assert.equal(s.landed, 1); assert.deepEqual(s.p, p);
});

test('keyboard selection wraps, never launches by itself, and launches the selected hook', () => {
  const s = createFlightState();
  assert.equal(selectHook(s, -1), 'intro-1');
  assert.equal(s.launches, 0);
  assert.equal(launchSelected(s), true);
  assert.equal(selectHook(s, 1), null);
  advanceFlight(s, 2150);
  assert.equal(s.selected, 'fork-1');
  assert.equal(selectHook(s, -1), 'fork-2');
  assert.equal(selectHook(s, 1), 'fork-1');
  assert.equal(s.mistakes, 0); assert.equal(s.launches, 1);
  assert.equal(launchSelected(s), false); assert.equal(s.mistakes, 1);
  selectHook(s, 1);
  assert.equal(launchSelected(s), true); assert.equal(s.launches, 2);
});

test('busy launch attempts cannot replace a flight or queue another stage', () => {
  const s = createFlightState(); chooseHook(s, 'intro-1');
  for (let i = 0; i < 100; i++) {
    assert.equal(chooseHook(s, 'fork-1'), false);
    assert.equal(launchSelected(s), false);
    advanceFlight(s, 16);
  }
  assert.equal(s.mode, 'landing'); assert.equal(s.launches, 1); assert.equal(s.mistakes, 0);
  assert.equal(chooseHook(s, 'intro-1'), false);
  advanceFlight(s, 5000);
  assert.equal(s.mode, 'ready'); assert.equal(s.stage, 1); assert.equal(s.launches, 1);
  assert.equal(chooseHook(s, 'intro-1'), false, 'stale old hook IDs do not launch a new stage');
  assert.equal(chooseHook(s, 'missing'), false); assert.equal(s.mistakes, 0);
});

test('irregular render chunks preserve release, contact, stage and finish results', () => {
  const run = (chunks: number[]) => {
    const s = createFlightState();
    for (let stage = 0; stage < 3; stage++) {
      assert.equal(chooseHook(s, launchIds[stage]), true);
      let left = 2150, index = 0;
      while (left > 0) {
        const ms = Math.min(left, chunks[index++ % chunks.length]);
        advanceFlight(s, ms); left -= ms;
      }
    }
    return s;
  };
  const expected = run([2150]);
  for (const chunks of [[1000 / 30], [1000 / 144], [1, 237, 16, 41, 3, 97]]) {
    const s = run(chunks);
    assert.equal(s.mode, expected.mode); assert.equal(s.landed, 3);
    closeVec(s.p, expected.p); closeVec(s.v, expected.v);
    close(s.elapsed, expected.elapsed); close(s.phaseTime, expected.phaseTime);
    assert.deepEqual(s.events.map(e => [e.type, e.stage]), expected.events.map(e => [e.type, e.stage]));
    s.events.forEach((e, index) => close(e.time, expected.events[index].time));
  }
});

test('pause freezes ready, pull, coast and landing without queued catch-up time', () => {
  for (const ms of [0, 200, 800, 1600]) {
    const s = createFlightState();
    if (ms > 0) { chooseHook(s, 'intro-1'); advanceFlight(s, ms); }
    const originalMode = s.mode, before = movingSnapshot(s);
    toggleFlightPause(s);
    assert.equal(s.mode, 'paused'); assert.equal(s.resumeMode, originalMode);
    advanceFlight(s, 5000);
    assert.equal(chooseHook(s, 'intro-1'), false);
    assert.equal(selectHook(s, 1), null); assert.equal(performTrick(s), false);
    assert.deepEqual(movingSnapshot(s), before);
    toggleFlightPause(s);
    assert.equal(s.mode, originalMode);
    assert.deepEqual(movingSnapshot(s), before);
    if (ms > 0) { advanceFlight(s, 2150 - ms); assert.equal(s.stage, 1); }
  }
});

test('one optional trick per flight leaves the entire landing trajectory unchanged', () => {
  const baseline = createFlightState(), tricking = createFlightState();
  assert.equal(performTrick(tricking), false);
  for (let stage = 0; stage < 3; stage++) {
    chooseHook(baseline, launchIds[stage]); chooseHook(tricking, launchIds[stage]);
    advanceFlight(baseline, 200); advanceFlight(tricking, 200);
    assert.equal(performTrick(tricking), true);
    assert.equal(performTrick(tricking), false);
    advanceFlight(baseline, 1950); advanceFlight(tricking, 1950);
    closeVec(tricking.p, baseline.p); closeVec(tricking.v, baseline.v);
    close(tricking.elapsed, baseline.elapsed);
    assert.equal(tricking.landed, baseline.landed);
  }
  assert.equal(tricking.mode, 'finished'); assert.equal(tricking.tricks, 3);
  assert.equal(baseline.tricks, 0); assert.equal(tricking.trickTime, 0);
});

test('restart clears the run, exits pause, and makes timed replay an explicit option', () => {
  const s = createFlightState(); finishHop(s); chooseHook(s, 'fork-1');
  toggleFlightPause(s); restartFlight(s, true);
  assert.deepEqual(s, createFlightState({ timed: true }));
  finishHop(s); restartFlight(s);
  assert.equal(s.timed, true); assert.equal(s.stage, 0); assert.equal(s.landed, 0);
  restartFlight(s, false);
  assert.deepEqual(s, createFlightState());
});

test('the clock starts with the first accepted launch; invalid time cannot corrupt it', () => {
  const s = createFlightState(); advanceFlight(s, 5000);
  assert.equal(s.elapsed, 0); assert.equal(s.mode, 'ready');
  assert.equal(chooseHook(s, 'invalid-id'), false);
  assert.equal(s.mistakes, 0); assert.equal(s.launches, 0);
  chooseHook(s, 'intro-1'); advanceFlight(s, 10);
  const before = movingSnapshot(s);
  for (const dt of [0, -1, NaN, Infinity, -Infinity]) advanceFlight(s, dt);
  assert.deepEqual(movingSnapshot(s), before);
  advanceFlight(s, 2140); const landedTime = s.elapsed;
  advanceFlight(s, 1000);
  close(s.elapsed - landedTime, 1, 1e-8);
});

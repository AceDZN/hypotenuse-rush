import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, start, advance, COURSE, harness, inspectReach, type Input } from '../src/rules.ts';

test('authored broad route is traversable through ordered gates by continuous world inputs', () => {
  const s = createState(); start(s);
  type Phase = 'A' | 'ridge' | 'C' | 'merge' | 'E' | 'shelf' | 'G' | 'finish';
  let phase: Phase = 'A', age = 0;
  const targets = { ridge: { x: 28.4, z: -3 }, merge: { x: 64, z: -2 }, shelf: { x: 85, z: -2 }, finish: { x: 107, z: 4 } };
  const after = { A: 'ridge', C: 'merge', E: 'shelf', G: 'finish' } as const;
  const nextAnchor = { ridge: 'C', merge: 'E', shelf: 'G' } as const;
  const clamp = (n: number) => Math.max(-1, Math.min(1, n));
  // This is a numerical feasibility witness. It cannot establish usable camera/aim controls.
  // After create/start, only public input/advance functions change the state.
  for (let frame = 0; frame < 120 * 90 && s.mode !== 'finished'; frame++) {
    const input: Input = { x: 0, z: 0, jump: false, sprint: true, grapple: false, anchor: null };
    age += 1 / 120;
    if (phase === 'A' || phase === 'C' || phase === 'E' || phase === 'G') {
      input.anchor = phase; input.grapple = age < 0.7; input.x = 1;
      if (age >= 0.7) { phase = after[phase]; age = 0; }
    } else {
      const target = targets[phase];
      input.x = clamp((target.x - s.p.x) * 0.7);
      input.z = clamp((target.z - s.p.z) * 0.7);
      if (phase !== 'finish') {
        const id = nextAnchor[phase];
        const anchor = COURSE.anchors.find(a => a.id === id)!;
        if (s.grounded && Math.abs(target.x - s.p.x) < 0.5 && Math.abs(target.z - s.p.z) < 0.35 &&
            inspectReach(harness(s), anchor.p, s.reach, COURSE.boxes).reachable) {
          phase = id; age = 0;
        }
      }
    }
    advance(s, input, 1000 / 120);
  }
  assert.equal(s.mode, 'finished', `route stalled in ${phase} at ${JSON.stringify(s.p)}, cp=${s.cp}, reason=${s.reason}`);
  assert.equal(s.cp, 3);
  assert.equal(s.falls, 0);
  assert.ok(s.grabs >= 4);
  assert.deepEqual(s.events.filter(e => e.type === 'checkpoint').map(e => e.cp), [1, 2, 3]);
  assert.ok(s.finishedTime > 0 && s.finishedTime < 90);
});

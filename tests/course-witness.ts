import assert from 'node:assert/strict';
import { createState, start, advance, COURSE, harness, inspectReach, type Input } from '../src/rules.ts';

// Authored public world-input waypoints; this is not an input/camera usability test.
const route = [
  { id: 'A', x: 0, z: 0 },
  { id: 'C', x: 28.4, z: -3 },
  { id: 'H', x: 91, z: 4 },
  { id: 'I', x: 126, z: -3 },
  { id: 'E', x: 166, z: -2 },
  { id: 'J', x: 205, z: 3 },
  { id: 'G', x: 240, z: -2 },
  { id: 'K', x: 271, z: 5 },
  { id: 'L', x: 310, z: -1 },
];

export function runRoute(shortcut = false, shortcutHold = 0.7) {
  const path = route.map(p => ({ ...p }));
  if (shortcut) path[1] = { id: 'S', x: 28.4, z: 6.5 };
  let jumped = false, broadTurn = 0;
  const s = createState(); start(s);
  let leg = 0, grappling = true, age = 0;
  const clamp = (n: number) => Math.max(-1, Math.min(1, n));
  // After create/start, only public input/advance functions change the state.
  // The controller uses analog movement, like the touch stick, and exact world information.
  for (let frame = 0; frame < 120 * 120 && s.mode !== 'finished'; frame++) {
    const input: Input = { x: 0, z: 0, jump: false, sprint: true, grapple: false, anchor: null };
    age += 1 / 120;
    if (grappling) {
      const duration = path[leg].id === 'S' ? shortcutHold : 0.7;
      input.anchor = path[leg].id; input.grapple = age < duration; input.x = 1;
      if (age >= duration) { grappling = false; leg++; age = 0; }
    } else {
      let target = path[leg] ?? { x: COURSE.finish.x + 1, z: COURSE.finish.z };
      if (!shortcut && path[leg]?.id === 'H') {
        if (broadTurn === 0) {
          target = { id: 'H', x: 56, z: s.p.x < 48 ? -3 : -8 };
          if (s.p.x >= 55.5 && Math.abs(s.p.z + 8) < 0.35) broadTurn = 1;
        } else if (broadTurn === 1) {
          target = { id: 'H', x: 73, z: -8 };
          if (s.p.x >= 72.5 && Math.abs(s.p.z + 8) < 0.35) broadTurn = 2;
        }
      }
      input.x = clamp((target.x - s.p.x) * 0.7);
      // Preserve narrow-ledge lateral alignment until the sprint jump has landed.
      const targetZ = shortcut && path[leg]?.id === 'H' && s.p.x < 73 ? 6.5 : target.z;
      input.z = clamp((targetZ - s.p.z) * 0.7);
      if (leg < path.length) {
        const anchor = COURSE.anchors.find(a => a.id === path[leg].id)!;
        if (s.grounded && Math.abs(target.x - s.p.x) < 0.5 && Math.abs(target.z - s.p.z) < 0.35 &&
            inspectReach(harness(s), anchor.p, s.reach, COURSE.boxes).reachable) {
          grappling = true; age = 0;
        }
      }
    }
    if (shortcut && path[leg]?.id === 'H' && !jumped && s.grounded && s.p.x >= 65.05) { input.jump = true; jumped = true; }
    advance(s, input, 1000 / 120);
  }
  assert.equal(s.mode, 'finished', `route stalled before ${path[leg]?.id ?? 'finish'} at ${JSON.stringify(s.p)}, cp=${s.cp}, reason=${s.reason}`);
  assert.equal(s.cp, 3);
  assert.equal(s.falls, 0);
  assert.equal(s.grabs, 9);
  assert.deepEqual(s.events.filter(e => e.type === 'checkpoint').map(e => e.cp), [1, 2, 3]);
  assert.ok(s.finishedTime >= 40 && s.finishedTime <= 90, `measured numerical run was ${s.finishedTime}s`);
  return s;
}


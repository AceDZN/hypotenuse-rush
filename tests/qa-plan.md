# Independent review matrix

Rule tests are written against exported state/rules, never the renderer. Browser evidence must use normal controls; test-only state changes cannot count as course completion. Unit fixtures may place state at a collision/checkpoint boundary to isolate that rule.

| Area | Required positive witness | Counterexample or changed situation |
|---|---|---|
| Planar reach | `(8,6,0)` at `R=10` | `(6,9,0)` is out of range |
| Spatial reach | `(3,12,4)` at `R=13`; face diagonal `5` | same hook at `R=10`; omit lateral component |
| Changed numbers | `(2,6,3)` at `R=7` | same hook at `R=6.9` |
| Origin | current harness | move harness by a metre; no stale checkpoint or camera origin |
| Invariance | common translation; sign change | camera orbit cannot alter distance |
| Segment | in-range unobstructed hook | in-range blocked hook, ray beyond endpoint, not acquired |
| Motion | pull changes position over time; release retains velocity | no teleport; cooldown prevents immediate reattach |
| Collision | thin wall at high speed; swept landing | no tunneling through a narrow primitive |
| Timing | repeated equal-duration frame partitions agree | pause freezes; survey uses 20% simulation and clock |
| Course | checkpoint 1 → 2 → 3 → finish | later checkpoint/finish cannot skip earlier physical gates |
| Recovery | checkpoint retry preserves run clock | full restart clears run; fall recovers in under one second |
| Browser | failed grab → retry → launch → release → landing | rerun after a changed approach and changed reach |
| Device | keyboard/pointer and touch controls | resize/fullscreen preserves state and camera |
| Production | fresh static preview and local art loads | console/runtime errors and network failures |
| Text | Hebrew reading order with isolated formulas | no mixed-direction reversal of inequality or units |

Record only observed outcomes in PLAYTEST.md. Build/rule success does not establish enjoyment or learning gains.

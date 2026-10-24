# Independent verification record

Reviewed 24 October 2026. Rule checks and numerical route feasibility are distinct from browser usability, human enjoyment and learning evidence. Generated `docs/visual-targets/gameplay-v1.png` is a design reference, never an actual gameplay screenshot.

## Domain and numerical traversal

`npm test` passes **26 / 26** independent tests in `tests/reach.test.ts`, `tests/state.test.ts` and `tests/course.test.ts` (using `tests/course-witness.ts`).

- Exact opening witnesses: `(8,6,0)` gives `10 m`; `(6,9,0)` gives `√117 m` and overreach at `10 m`.
- Spatial witness: `(3,12,4)` gives face diagonal `5 m`, body diagonal `13 m`; succeeds at `13 m`, fails at `10 m`. Also checks new `2–3–6 → 7` values and high-shelf `5–12–13`.
- Common translation/sign changes, moving actual harness, separate aim/range/obstruction, bounded line segments and numerical tolerance independent of collision skin.
- Thin-wall and floor sweeps at high displacement; stable grounded harness height; attach without teleport, pull acceleration, retained release velocity, cooldown, hold expiry/speed cap and obstruction detach.
- Equal-time render partitions, pause/resume without catch-up, survey physics/clock both at 20%, assistance/hint recording, ordered physical checkpoints, finish bypass rejection, retry/full-restart and local fall recovery.
- The expanded broad-route witness completes **45.608 simulation seconds**, **nine grapples**, **three ordered checkpoints**, **zero falls** using public movement/grapple inputs from start. It makes no post-start position, velocity, checkpoint or win-state writes. Its analog controller has exact world knowledge and does not exercise camera/aim UI; it is not a human performance or fun claim.

The narrow S route also completes **44.975 simulation seconds**, nine grapples and zero falls when a sprint jump starts near `x = 65.05` at `z = 6.5`; it keeps lateral position until landing beyond the gap. In this controller comparison the advantage is `0.633 s`, which is a measured time-attack tradeoff for the narrower landing and timed jump. It does not establish satisfying reward balance for human players. A `0.4 s` S hold failed the landing diagnostic; release timing has a real consequence.

The broad route stays at `z = −3` after C until `x = 48`, turns toward `(56, −8)`, follows the low outer ledge to `(73, −8)`, then approaches H at `(91, 4)`. Turning immediately toward H while still airborne falls outside the safe ledge. That failed diagnostic was corrected in the controller rather than hidden by widening mathematical reach.

## Defects caught and corrected during review

1. Equal one-second inputs partitioned at different render rates initially lost one fixed step to floating-point accumulator comparison. The accumulator now uses a numerical boundary allowance and clamps the residual; the regression test passes.
2. Collision skin changed the advertised exact harness-to-hook offsets. Anchor heights now include the independently documented skin, and actual opening/spatial stance components are tested.
3. Shallow floor sliding could exhaust conservative sweep iterations, changing grounded harness height and making a nominally exact `13 m` hook temporarily unreachable. Exact top-plane contact was added; stable-height regression and full-course witness pass.
4. The initial ideal course took about `15.117 s`, below the requested scope. The course was expanded to nine grapples over a continuous canyon; the new numerical witness takes `45.608 s`.

## Browser evidence reviewed so far

`playtest-output/intro/shot-0.png` and its `state-0.json` were visually inspected. This is an actual early development canvas capture: the athlete landed on the first ridge, checkpoint count was `1`, grapple/release counts were `1 / 1`, and the player was grounded at approximately `(22.549, 1.002, 0)`. It predates the final expanded course and final art, so it is **partial evidence only**. The canvas capture omits the DOM HUD and cannot verify Hebrew layout.

The early capture recorded `art: error`; `errors-0.json` shows the missing GLB request returned HTML to the GLTF parser. A fresh successful local-model load and clean final console must replace this early failing asset evidence before claiming production verification.

The independent action-client attempt in `output/qa-client-opening` did not produce a valid capture: the start click timed out during heavy shared software-rendering load and HMR destroyed the execution context during the burst. It is not counted as successful play evidence. No external browser tab or process was stopped by QA.

## Generated target comparison (early capture)

The target and early actual capture are both landscape 16:9, but show different states. The target is an ungrappled survey at the marked starting stance; the actual capture is after landing at checkpoint 1. A same-state, full-page production comparison remains required.

At this early stage, the actual game has real depth, lit red-rock geometry, hooks, flags and an articulated athlete. Differences remain clear: the athlete is about 15% of viewport height rather than the target's roughly 50%; the camera is higher/farther away; tall plain prisms create a narrow corridor instead of the target's open layered canyon; materials have much less surface detail. The generated target does not establish the final asset or performance quality. Default Hebrew, mixed-direction formulas and final survey placement cannot be judged from the canvas-only screenshot. The reference also shows checkpoint `1 / 3` at a described starting stance; the actual start must retain truthful checkpoint `0 / 3`.

## Outstanding final browser review

A fresh final production build must still supply normal-control failure/recovery, launch/release/land, all checkpoints/finish, moving-origin and camera invariance, pause/retry/restart, survey/optional hint, resize/fullscreen, malformed local records, touch/multi-pointer checks, local Tripo loading, console/network results and full-page Hebrew screenshots. Final evidence and remaining limitations will be added here after that review.

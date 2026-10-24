# Hypotenuse Rush — BUILD_HANDOFF

Build the newly approved **Hypotenuse Rush**: fast third-person parkour/grapple traversal through red-rock cliffs. Reuse `/Users/acedzn/dev/AceDZN-exp/hypotenuse-rush`, public origin `AceDZN/hypotenuse-rush`, on **main**. Dev **5183**, preview **4183**; strict ports, no unrelated process termination. Read [CREW_COMMON.md](CREW_COMMON.md), including its three roles, real delegation, Hebrew/RTL, touch, assets and production proof. Give each delegate the exact user instruction:

```text
Don't forget to build it as a real 3d fun game. use my chrome browser tripo.ai to create the 3d models ([https://studio.tripo3d.ai/workspace/generate/](https://studio.tripo3d.ai/workspace/generate/) ).
btw,create it as a new public repo on my github (AceDZN). I think that I'll deploy it to one of our vercel servers soon because its pretty fun.. you can use my chrome browser for that as well . don't forget to commit your changes from time to time all to the same main branch for now (or open prs for side-tracks)
```

Real 3D, original Chrome/Tripo art, regular main commits/pushes and Vercel readiness are mandatory. Root prepared the repo; do not duplicate it. Prepare deployment, not an unsolicited public release. Rightline Rescue and courier/rescue briefs remain withdrawn.

## Identity and exact rules

Sprint, inspect possible anchors, launch, steer and release momentum into a landing. Replaying improves route judgment and execution. Athletic character, active chase camera, no cargo, rescue pods, passenger, retrieval objective, vehicle or delivery loop.

- One world unit is one metre. Measured anchors, terrain and capsule colliders are explicit authored primitives; generated meshes are art, never mathematical authorities.
- At grapple press, sample actual harness point `P` and fixed anchor `A`. Reach is `d=|A-P|`: in the introductory vertical plane `d²=Δx²+Δy²`; with lateral offset `d²=Δx²+Δy²+Δz²`. The moving scan and attachment use the same current origin, never the camera or stale checkpoint coordinates.
- Attach only when `d≤R`, the aimed hook is acquired and the harness-to-anchor segment is unobstructed. Distance and obstruction failures have separate reasons. Document numerical tolerance separately from collision skin.
- This is an arcade reel-assisted grapple with an ideal straight reach segment, not a claim about sagging rope/zipline length. Never teleport onto a hook or traverse a scripted spline instead of moving through the world.
- Baseline: run 6 m/s, sprint 9, jump impulse 8 m/s, gravity 22 m/s². Attached pull is 28 m/s², gravity 6, speed cap 18 m/s. Release retains velocity. Hold expires after 1.25 s or within 1.2 m of anchor; reattachment cooldown 0.25 s. Use fixed-step simulation and swept capsule collision; detach on obstruction. Polish feel without falsifying reach.
- Reach is 10 m initially, explicitly 13 m in the spatial section. No hidden upgrades. Falling respawns at the last checkpoint within one second; no lives or full-course wipe. Failed grabs briefly show the actual reason.

## First sixty seconds

At a marked starting harness stance, two unobstructed hooks have offsets:

- A `(8,6,0) m`: `d=√(64+36)=10 m`, reachable.
- B `(6,9,0) m`: `d=√117≈10.817 m`, unreachable despite smaller horizontal offset.

**0–10 s:** sprint/jump along a broad sandstone ledge. **10–25 s:** inspect hooks; survey reveals perpendicular legs and a right-angle mark, not an automatic diagonal/green answer. **25–40 s:** choose A, grapple, steer and release; choosing B gives an overreach pulse and quick safe retry. **40–60 s:** land, cross a real checkpoint and approach a changed gap. Validate the successful trajectory and landing: distance correctness alone does not make a playable route. No typed arithmetic gate.

## Replayable five-to-ten-minute slice

One multi-route time-attack course, short safe practice ledge, three ordered checkpoints and visible finish. Competent runs take roughly 45–90 seconds; learning, local retries and improvement runs supply 5–10 minutes. Not five lesson rooms or missions.

1. Opening ridge teaches planar reach with generous landings.
2. Split canyon offers a safe broad route and faster release-timing shortcut. An in-range hook behind rock demonstrates separate line-of-sight failure.
3. High shelf makes a horizontally closer hook too high. Change approach/numbers; include 5–12–13 when the 13 m section begins.
4. Spatial finish uses offsets `(3,12,4) m`: horizontal face diagonal `√(3²+4²)=5`, then `√(5²+12²)=13`. Survey constructs both perpendicular triangles explicitly.

Win by crossing the finish after all three actual checkpoints in order. Time supports replay, never blocks completion. Local retries keep the run clock; full restart starts a new run. Track falls, overreaches, obstruction and hints separately. Survey slows simulation to 20%; timer uses that same simulation time and records assistance. Do not imply assisted/unassisted times are equivalent mastery evidence.

## Curriculum, controls and art

Read `/Users/acedzn/idea-plotter/reports/math-games-2026-10-24/curriculum/pythagoras-concept-proof.json` and `pythagoras-3d-box.json`, actual Workbook grade-8 chapter 9 snapshots. Source: https://math.workbook.co.il/grade-8/chapter-9/pythagoras-concept-proof.

Counter adding legs, omitting height/lateral displacement, stopping at squared length, trusting screen perspective and using Pythagoras without a known right angle. Hypotenuse lies opposite that angle; metres and square metres differ. Face diagonal is not body diagonal.

WASD move, mouse aim/orbit, Shift sprint, Space jump, hold/release left mouse grapple, Tab survey, H optional calculation, R checkpoint retry, Shift+R restart, Escape pause. Touch gets move/look zones and jump/grapple/survey controls. Chase camera avoids walls; reticle never becomes measurement origin. Show reach, checkpoint/time and color-independent reasons. Default Hebrew, isolated LTR mathematics, reduced motion and focus-loss pause.

Airy red sandstone, cobalt sky, warm sun, white/coral anchor fixtures, athletic silhouette with expressive lean/jump/release, dust and wind. Generate original athlete/components and compatible cliff art through Chrome Tripo. Inspect rigs: a static GLB is not animated. Supply actual rigged or articulated procedural motion; a rigid sliding statue is insufficient. No robot mascot, concrete museum or toy harbor.

## Acceptance proof

Test exact reach witnesses including `(3,12,4)` at 13 versus shorter reach; translation/camera invariance; moving origin; obstruction distinct from overreach; release continuity; cooldown; collision at speed; checkpoint order; retry/pause/survey timing. Test changed render rates with fixed-step simulation. Record actual third-person gameplay showing failed grab/recovery, animated traversal, checkpoints and finish via normal controls. Verify fresh production preview 4183, local assets, touch, resize, mixed-direction text and no console errors. Deliver common proof files, measured size/performance, public repo/main commit and honest animation/feel limitations. Build success does not establish enjoyable movement or proven learning.

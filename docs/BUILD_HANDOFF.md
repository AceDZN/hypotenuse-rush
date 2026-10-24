# Hypotenuse Rush — build handoff

Build the user-approved replacement **Hypotenuse Rush**: a fast third-person parkour/grapple course in red-rock cliffs. Movement, route choice and momentum are the core actions. Pythagoras determines which anchors can actually be reached. This is a fresh game, not Rightline Rescue or any earlier courier/rescue prototype with a new title. The new build is explicitly authorized by the user; do not claim that Idea Plotter's scientific gates passed.

Read [CREW_COMMON.md](CREW_COMMON.md) for shared engineering, Chrome asset workflow and delivery requirements. These game-specific rules define the product.

## Mandatory user requirements and ownership

**Build a real 3D browser game. Use the user's Chrome Tripo UI to generate original, game-specific 3D art. Create the game's own public GitHub repository under AceDZN. Work on `main` and make regular, clear commits. Make the game ready for a later Vercel deployment.** Prepare the deployment path; deployment itself is not requested by “ready”. Do not substitute a model-generation API for the specified Chrome workflow.

- Standalone repository: `/Users/acedzn/dev/AceDZN-exp/hypotenuse-rush`.
- Intended public repository: `AceDZN/hypotenuse-rush`; report the actual URL and latest `main` commit.
- Development port **5183**; production-preview port **4183**. Bind explicitly; fail on occupation, and do not kill unrelated processes or silently move ports.
- Own this game and its processes only. Leave other builders, canceled games, map data and `spec/` untouched.
- Use CREW_COMMON's stack and production requirements. The athlete, terrain, camera, obstacles and grapple line inhabit a real perspective 3D world with actual collision and occlusion.

## Product thesis

Sprint toward a cliff edge, read two possible anchors, commit to the reachable one, reel across the gap and release into a clean landing. A correct distance judgment preserves flow; a failed one produces a quick, understandable local retry. Replaying the same course improves both route understanding and movement execution.

There is an athletic player character, an active chase camera, jumping, air steering and expressive motion. No cargo, passenger, rescue pod, courier contract, vehicle, retrieval objective, delivery counter, restoration reward or workshop. There is no architectural resizing tool or slow first-person puzzle camera.

## Authoritative mathematical and movement rules

1. One world unit is one metre. Use authored launch positions, primitive terrain/capsule colliders and explicit anchor coordinates. A generated cliff or athlete model is art; its apparent dimensions, mesh outline and decorative hook never determine the mathematics.
2. At grapple press, sample the character's actual harness point `P` and the targeted fixed anchor `A`. Reach is the straight segment `d=|A-P|`. In the introductory vertical plane, `d²=Δx²+Δy²`; later, with lateral offset, `d²=Δx²+Δy²+Δz²`. Never omit vertical or lateral distance, use screen-space distance, or replace it with `|Δx|+|Δy|`.
3. An attachment requires all of: `d ≤ R`, the anchor is in the reticle's acquisition cone, and an unobstructed segment from harness to anchor. Evaluate distance and line of sight separately. A numerically reachable hook behind a cliff is still blocked. Do not count distance through rock as a valid route.
4. The mathematical distance is measured at attachment, not frozen at an old checkpoint while the player moves. The scan uses the same current origin. Teach the first example from a marked stance with known offsets; leaving that stance updates the labels and calculation. There is no hidden teleport back to an ideal origin.
5. This is an **arcade reel-assisted grapple**, not a simulation lesson about a sagging cable. The rendered connection is an ideal straight reach segment. It does not assert that a slack rope, catenary or zipline would have that same physical length.
6. Baseline movement: walk/run 6 m/s, sprint 9 m/s, jump impulse 8 m/s and gravity 22 m/s². Allow bounded air steering. While attached, pull toward the anchor at 28 m/s², reduce gravity to 6 m/s² and cap speed at 18 m/s. These are explicit game-feel parameters, not curricular claims. Release preserves the current velocity; do not snap to an anchor, teleport along a spline or zero speed at release.
7. A hold lasts at most 1.25 seconds, or until within 1.2 m of the anchor, then releases. The player may release earlier and acquire another valid anchor after a 0.25-second cooldown. Use swept capsule collision throughout the motion; a legal initial line does not authorize passing through terrain during the pull. If a rock breaks line of sight, detach safely and preserve the current physical state.
8. Reach is **10 m** in the first course sections. A clearly announced later checkpoint uses a **13 m** reel for the spatial extension. This is an authored section rule, not a collectible upgrade or a hidden changing threshold. Display the current reach continuously.
9. Missing an anchor, choosing an overreach or falling does not consume lives. An invalid hook attempt emits a short failed line pulse and a specific reason. Falling below the course boundary respawns at the last checkpoint in under one second. No full-course failure animation or delivery reset.

Use a fixed simulation step and document any small numerical tolerance at the distance boundary; keep that separate from collision skin. Never loosen reach until a broken route “feels right”. Movement parameters may be polished after playtesting while keeping displayed mathematical relationships truthful.

## First sixty seconds: reach, then motion

At the marked initial harness stance, author two unobstructed anchors in one vertical plane:

- A: offsets `(Δx, Δy, Δz)=(8,6,0) m`; `d²=64+36=100`, so `d=10 m`, reachable with the 10 m reel.
- B: offsets `(6,9,0) m`; its horizontal offset is smaller, but `d=√117≈10.817 m`, beyond reach.

Put safe terrain under the initial practice takeoff so the first failed attempt is not punitive. The successful anchor must lead into an actual traversable landing, not a result modal. Validate the landing with the movement model; do not assume that a distance test alone creates a playable trajectory.

- **0–10 s:** sprint and jump along a broad sandstone ledge. The athlete leans into movement; the camera shows the next gap and anchor silhouettes without covering the landing.
- **10–25 s:** inspect the two anchors. Hold the survey control to reveal perpendicular offset lines, the right-angle mark and labelled legs. It does not automatically print the hypotenuse or color the correct choice green.
- **25–40 s:** choose A using `8²+6²=10²`, launch, steer and release. Choosing B produces an overreach pulse; reopening the scan explains why horizontal closeness was insufficient. Optional calculation help may reveal the result and records assistance.
- **40–60 s:** land, cross the checkpoint and use the same controls on an unlabelled-looking second gap. The player is already moving through a course, not waiting at a quiz terminal.

Math determines a real action's feasibility. No typed answer, equation lock or arithmetic popup is required to fire the grapple.

## Five-to-ten-minute scope: a replayable course

Build **one compact multi-route time-attack course**, with a short safe practice ledge, three ordered checkpoints and a visible finish arch. Do not structure it as five lesson rooms or a mission-selection screen. Aim for 45–90 seconds per competent run; a first session of learning, local retries and two or three improvement runs should last 5–10 minutes.

- **Opening ridge:** planar reach decisions, including the exact 8–6–10 example. A visible route has generous landings so the relationship can be learned before precise speed play.
- **Split canyon:** a longer safe route with broad landings and a faster optional route requiring a well-timed release. Both use truthful reach and line-of-sight rules. Add an in-range hook behind a rock to distinguish geometry distance from obstruction; mark its failed reason separately.
- **High shelf:** height changes make a visually closer anchor unreachable. Vary the numbers and rotate the approach; do not let a memorized screen position become the rule. Include a 5–12–13 relationship when the 13 m section is introduced.
- **Spatial finish:** an anchor has offsets `(3,12,4) m`. Its horizontal face diagonal is `√(3²+4²)=5 m`, then its spatial distance is `√(5²+12²)=13 m`. Show the horizontal right-angle construction and the second vertical one when scanned. Avoid representing this as an arbitrary slanted triangle to which two-leg Pythagoras is incorrectly applied.

Win when the athlete crosses the finish gate on the valid course side after all three checkpoints in order. Checkpoints must be actual traversed triggers, not buttons. A run timer and personal best support replay; time does not prevent completion or force learners out. Track falls, failed overreaches, blocked attempts and assistance separately. Local retries keep the run clock going; a full restart begins a fresh run. Do not call a low time proof of mathematical learning.

A clean shortcut is a legitimate mastery reward, not a requirement to complete the game. Remove any shortcut that skips all meaningful reach decisions or bypasses ordered progression.

## Curriculum and misconceptions

Use these actual saved Workbook grade-8 modules:

- [Pythagoras concept/proof](/Users/acedzn/idea-plotter/reports/math-games-2026-10-24/curriculum/pythagoras-concept-proof.json): `https://math.workbook.co.il/grade-8/chapter-9/pythagoras-concept-proof`.
- [Pythagoras in a rectangular box](/Users/acedzn/idea-plotter/reports/math-games-2026-10-24/curriculum/pythagoras-3d-box.json): `https://math.workbook.co.il/grade-8/chapter-9/pythagoras-3d-box`.

Teach the right-angle condition, hypotenuse opposite that angle, squared-length sum and final square root. The distance is an ordinary length in metres, not square metres. The hypotenuse is greater than either leg and less than their sum. In 3D, explicitly construct the face diagonal and then the second right triangle; a face diagonal alone is not the spatial distance.

Counter adding legs, stopping at `d²`, using only horizontal separation, picking the side that appears longest on screen, and applying the formula to an arbitrary non-right triangle. Survey lines follow known perpendicular world axes; rotate the camera without changing the result. The source modules contain historical and real-world examples; the game need not repeat unsupported historical claims or claim to model physical rope sag.

## Controls, camera and legibility

Desktop: WASD move, mouse orbit/aim, Shift sprint, Space jump, left mouse hold grapple, release left mouse detach, Tab hold survey, H optional worked calculation, R retry checkpoint, Shift+R restart run, Escape pause/release pointer lock. A short initial control overlay must disappear during ordinary play. Use a stable shoulder chase camera with collision avoidance and an unobstructed reticle; the camera is never the mathematical measurement origin.

Survey slows the simulation to 20% while held, preserving a moving world and allowing thoughtful inspection. The course timer uses simulation time consistently and assistance is recorded; do not fabricate competitive comparisons with different timing rules. Survey shows legs and right angles, not a ready-made valid-anchor ranking. Give selected-hook silhouettes and reasons using symbols/text as well as color. Show reach, current checkpoint and time; hide lengthy arithmetic behind optional help. Pause on focus loss. Provide sensitivity, invert-Y and reduced motion; avoid forced camera shake and extreme FOV pumping.

## Independent visual thesis and original assets

Airy red sandstone cliffs, cobalt sky, wind-carved ridges, warm sun and sharp white/coral anchor fixtures. The athlete has a clear human athletic silhouette, readable leaning/jumping/grappling poses and a bright scarf or sash that makes momentum visible. Use restrained speed streaks, dust at takeoff/landing, wind and crisp hook/release sounds. Distance is legible through actual negative space and moving parallax. No robot mascot, concrete museum, toy harbor, neon combat arena or cargo props.

Generate original game-specific Tripo art through the user's Chrome workflow, including a visible athlete design or identifiable athlete components and compatible cliff/anchor art. Inspect the actual assets. A static GLB does not contain animation merely because its prompt requested movement: document whether it is rigged. Supply a working rig/animation or convincing articulated procedural movement using suitable separate components. Sliding a rigid statue over the ground is not a finished athletic character. Art can be attached to the authoritative capsule; generated limbs or cliff triangles never decide reach or collisions. Keep simple measured primitive terrain/anchor fixtures accurate even where decorative rock surrounds them.

## Meaningful tests and production proof

- The same world-space reach function accepts `(8,6,0)` at 10 m and rejects `(6,9,0)` at 10 m. `(3,12,4)` requires 13 m; test 13 versus a shorter reach. Rotate camera and translate the whole course without changing those results.
- A moving launch origin updates both scan and attachment; the camera's shoulder offset does not alter reach. In-range obstructed hooks fail line of sight while unobstructed overreach fails distance. Display the correct reason.
- Release preserves velocity, cooldown and auto-release work, and swept collision prevents rock tunnelling at maximum speed. Show comparable landings at ordinary 30/60/120 Hz rendering with fixed-step simulation rather than frame-dependent movement.
- Falling restores the correct checkpoint and velocity; ordered checkpoint/finish logic prevents skipping the course. Restart clears run state without erasing a genuine personal best. Pause, survey time and assistance records remain consistent.
- An actual browser playthrough must show sprint, jump, a failed reach, recovery, a successful grapple/release, all checkpoints and the finish using normal controls. Capture moving third-person gameplay, including the athlete animation and course depth. A screenshot, direct state mutation or test-only win button is insufficient.

Verify a fresh production build and production preview on port 4183, including model/texture loads, correct hosted paths, no console errors and budgets from CREW_COMMON. Deliver controls, exact coordinate/reach fixtures, source-module references, asset provenance and animation limitations, tests actually run, measured build size/performance, repo URL and final `main` commit. Play the course for feel: report sticky landing, unreadable anchors, camera obstruction or a failure spiral even when unit tests pass. The proof must establish a playable traversal game as well as correct mathematics.

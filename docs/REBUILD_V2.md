# Rebuild v2: one choice, one flight

## Why this replaces v1

User feedback, 24 October 2026: “It's weird, I barely understood what to do, it feels weird af, it's boring, its too hard (not because the math - because the gameflow / controls / etc...) Let's plan and rebuild it in a fun way. don't forget to create mockup screenshots before starting working on it... we may need a full replanning for this”.

V1 required navigating, aiming, holding, releasing, steering and managing a camera before the first payoff. Mathematical correctness did not guarantee a safe landing. Scripted successful runs did not establish comprehension or enjoyment. This plan supersedes the v1 control/course requirements in the original handoff.

## Direction

**Choose a hook → one click launches a complete flight → land safely → next choice.**

Visual thesis: a coral-helmet athlete and bright ivory cable sweep between warm sculpted canyon ledges, with the launch, hook and landing visible in one authored view.

Content plan: immediately playable launch with one ring; first successful landing; calm two-hook distance choice; a changed-height choice; short finish and replay. One contextual instruction at a time. The first course has three complete flights. Add a longer route only after a human can understand and enjoy this loop.

Interaction thesis: visible ring hover/pulse; brisk physical launch with a readable auto-release; squash/dust/chime landing and immediate next destination. Reduced motion removes pulse, trail and camera shake. No manual camera or movement before launch. Click/tap a numbered hook or select with left/right and press Space. Flight steering is optional and bounded; a correct hook always reaches the broad safe ledge. No hold/release skill gate.

## First minute

1. World is already playable. One ring, broad circular landing, “לחצו על הטבעת כדי לעוף”. No controls wall, start menu or countdown.
2. One click: launch, cable tension, automatic release, airborne trail, satisfying landing. This teaches the loop before any distractor.
3. Two neutral hooks. Show perpendicular measurements and cable limit. At R=10, offsets (8,6,0) versus (6,9,0). Do not precolor the answer or show solved diagonal.
4. Wrong choice stays on the launch pad. Brief cable recoil + plain reason; retry immediately, no lost progress.
5. The third hop changes height and reach: (5,12,0) at R=13 versus (3,13,0). New values make the same rule matter.
6. Finish gives observed choices/optional air bonuses, replay and optional timed replay. Time is not a first-run pressure.

## Physics and mathematics

One world unit = one metre. The origin is the athlete’s fixed harness at feet+1.05m on each known launch pad. True Euclidean length and separate authored line-of-sight determine attachment. A press is one attempt; holding cannot repeat or spoil a valid shot.

Use an explicitly arcade assisted flight: initial physical acceleration towards the accepted hook, automatically release at an authored time, then integrate gravity with a solved launch velocity towards the landing pad. The camera and rendering never set distances. Assistance is disclosed in game help; do not pretend to simulate an unassisted pendulum. No coordinate teleport or animation spline for traversal. Ground contact advances the stage. Optional air lean is bounded inside the safe landing area.

Longer spatial choices (3,12,4) and obstruction belong after this first playable loop passes the human interest gate. Preserve the existing mathematical modules/tests as historical v1 evidence, and add current-flight rules/tests.

## Mockup inspection

Files in visual-targets/rebuild-v2:
- 01-first-click.png: first action/destination composition.
- 02-flight.png: dynamic whole-body flight/cable/landing.
- 03-choice.png: quiet math fork.

All are generated targets, not captures. Generated rock detail and anatomy exceed the present low-poly runtime budget. Implement the composition and affordances honestly. The third mockup’s measurement lines float beside rock rather than sharing the precise harness origin; the runtime must construct true connected perpendicular world-space segments and right-angle marks. The generated fixture supports/rock placements must not obstruct the authoritative measured segment.

Asset plan: reuse the original local Chrome/Tripo arch and helmet, procedural articulated body, authored polygon ledges and ring fixtures. No additional Tripo credits are needed. The two initial generations are already used.

## Acceptance

Automated: one press reaches first landing; no hold duration or aim precision required; wrong hook stays safe and retry is immediate; all three flights and finish/replay work with keyboard/mouse/touch; pause freezes flight; local storage corruption does not break play; resize preserves state and shows hook+player+destination; both Tripo assets load; production build/captures without console errors.

Human: a newcomer knows the target/destination within 5 seconds; first flight succeeds within 15 seconds; next goal reads within 3 seconds of landing; no repeated controls confusion; they voluntarily want another run. These remain unverified until a person tries the rebuild. The user’s experience outranks successful automation.

## Follow-on plan

Only after the first-course feel is accepted: spatial two-step Pythagoras, two valid route choices (safe vs scenic), a short flow challenge, richer ground animation and authored set pieces. Avoid filling a long corridor with repeated launch pads before the basic loop is fun.


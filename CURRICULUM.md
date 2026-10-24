# Curriculum and mathematical contract

## Active campaign v3

Twelve levels contain 36 authored choices. The player inspects any of three neutral hooks, reads perpendicular quantities, compares the actual harness-to-hook diagonal with the prominently stated rope limit, then commits a launch. Clicking a hook does not attempt it. Exactly one hook is in range at each choice; correct positions are balanced 12/12/12. Planar and spatial witnesses vary, including non-triples and near-boundary values. The floor face diagonal is an intermediate quantity in spatial stages, not the full reach.

The world construction and flat inspection diagram share authoritative measurements. Cyan is X, gold Y and purple Z. P is feet+1.05m. Length decisions use Euclidean distance with1e-7m tolerance; rounding is only display. A rejection snapshots its measured length, rope length and shortfall and shows at least two decimals. A first-try star requires a correct first commitment without calculation help; errors/help never block completion. Saved checkpoint history preserves those observations across reloads. Stars and completion describe observed actions, not mastery or learning gains.

The rope reaches the hook; an assisted physical launch carries the athlete to a separate landing. Camera/texture/decorative volume does not decide reach. Original reviewed Workbook sources below remain the curriculum basis; historical v1/v2 controls are superseded.


## Historical flow v2 after human feedback

The active game is the three-flight pilot in `src/flight.ts`, not the historical course described below. First a guided `(8,6,0)` flight at R=10 teaches one-click traversal; then `(6,9,0)` versus `(8,6,0)` at R=10 exposes the horizontal-only misconception; then `(5,12,0)` versus `(3,13,0)` at R=13 changes height/reach. The actual harness at feet+1.05m is the origin. Connected perpendicular guides and a right-angle mark show the selected construction; the optional calculation reveals the diagonal. Both hooks have neutral styling before commitment. A rejected choice stays safe with immediate retry, and physical floor contact advances the course. No typed answer gates movement.

Flight assistance handles the motor execution separately from the distance choice. The solved impulse, constant hook-directed acceleration, automatic continuous-velocity release and gravity are an arcade mechanic, not an unassisted pendulum claim. Spatial/obstruction scenarios remain historical v1 material until introduced in a later course. Local traces record actual decisions/retries/calculation use; neither completion nor a timed best is a mastery claim. The original source snapshots below remain the reviewed mathematical basis. The remaining v1 mapping, survey controls and records are historical, superseded by `docs/REBUILD_V2.md`.

## Historical v1 mapping and reviewed sources

Hypotenuse Rush applies the two Workbook grade 8, chapter 9 modules below to a newly authored grapple course. The cliff setting, hooks, positions and traversal challenges are original game examples; they are not quoted Workbook exercises. This is an arcade reel-assisted grapple. Its ideal straight harness-to-anchor segment is a reach test, not a model of a sagging rope or a claim that a reachable hook guarantees a safe landing.

## Sources actually reviewed

- [משפט פיתגורס והוכחה חזותית](https://math.workbook.co.il/grade-8/chapter-9/pythagoras-concept-proof): read the saved public snapshot `pythagoras-concept-proof.json`, especially the right-triangle definitions, square-area interpretation, calculation method and misconception checks. SHA-256: `3316ef1a9d0c5265116a38e8dea751b36271af3a597d94fbb6663b335c281719`.
- [פיתגורס במרחב ותיבה](https://math.workbook.co.il/grade-8/chapter-9/pythagoras-3d-box): read the saved public snapshot `pythagoras-3d-box.json`, especially the face/body diagonal construction, worked `3 × 4 × 12` example and two-step right-triangle reasoning. SHA-256: `f2c746cd66b8be27cc9da209525d6809859ed6e379484c0051bd9597ee1d4975`.

Both snapshots were supplied in the read-only curriculum handoff dated 24 October 2026. Source hashes identify the reviewed evidence; they do not claim that the live pages have remained unchanged. The game uses the mathematical content rather than reproducing the lessons or quizzes.

## Authoritative quantities

One world unit is one metre. Let `P` be the player's current harness point and `A` the fixed anchor in the same world coordinate system. Let `Δ = A − P`.

- In a vertical plane: `d² = Δx² + Δy²`.
- With lateral displacement: `f² = Δx² + Δz²`, then `d² = f² + Δy² = Δx² + Δy² + Δz²`.
- Reach is `d ≤ R`; the initial `R` is `10 m`, and the spatial section explicitly gives `13 m`.
- `d` and `R` are lengths in metres; `d²` and the squared component terms have units of square metres. Round labels only for display; do not decide reach from rounded labels.
- The world axes are mutually perpendicular. Survey constructions must show a right-angle mark for the two triangles; screen projection and decorative rock contours do not establish a right angle.
- Range, acquired aim, cooldown and a clear harness-to-hook segment are separate attachment requirements. A nearby hook behind rock can be in range and still obstructed.

Mathematical hook positions and collision primitives are authored state. Generated meshes decorate them. The camera and model bounds never determine length. The numerical reach tolerance is `1 × 10⁻⁷ m`; collision skin is independently `0.002 m`. The capsule radius is `0.32 m` and height is `1.8 m`. Tests distinguish the numerical threshold from contact geometry and check exact marked-stance offsets after the collision skin is applied.

## Action-to-concept mapping

| Player action or changed situation | Mathematical relationship | Misconception the situation can expose |
|---|---|---|
| Compare opening hooks A `(8,6,0)` and B `(6,9,0)` from the marked stance | A: `64+36=100`, so `d=10 m`; B: `36+81=117`, so `d≈10.817 m` | Smaller horizontal displacement does not imply a shorter total distance. Adding the legs gives neither diagonal. |
| Launch from a new stance, then attempt the same hook while moving | Recompute `A−P` at the actual grapple press | A remembered checkpoint-to-hook length or camera distance is not the current reach. |
| Rotate the chase camera or translate both points | Distance is invariant under camera changes and common translation | Perspective and apparent screen length cannot decide reach. |
| Use survey to reveal horizontal and vertical legs | The segment opposite a known right angle is the hypotenuse (`יתר`); the perpendicular legs are `ניצבים` | The longest-looking line in the picture is not the definition of a hypotenuse. |
| Approach the high shelf and the `5–12–13` challenge | `5²+12²=13²`; height participates in reach | Ignoring height or stopping at `169` confuses squared length with length. |
| Judge the spatial hook with offset `(3,12,4)` | Face diagonal `f=√(3²+4²)=5 m`, then `d=√(5²+12²)=13 m` | A face diagonal is an intermediate length, not the body diagonal. Omitting lateral displacement incorrectly gives `√153`. |
| Attempt that spatial hook at `R=10 m`, then at explicit `R=13 m` | Same geometry; different allowed reach | A hidden upgrade must not explain a changed outcome. |
| Inspect an in-range hook behind rock | Distance and visibility are distinct predicates | Correct arithmetic alone does not establish an unobstructed grapple path or a successful trajectory. |

Survey reveals perpendicular measurements and construction; the optional calculation hint reveals the resulting diagonal. A typed arithmetic answer is not used as a movement gate. Survey slows simulation to 20%, and the clock uses the same simulation time; assisted records must be identified separately.

## Evidence limits and language

Default UI uses Hebrew terms such as `ניצב`, `יתר` and `זווית ישרה`. Formulas, Latin hook names, signed coordinates and units need isolated left-to-right spans inside the right-to-left interface. Color is accompanied by words or symbols for overreach, obstruction and cooldown.

Local traces can distinguish an initial decision from retries, survey and calculation-hint use. A completed run demonstrates those observed actions in this course. Automated rule checks, successful traversal and replay times do not establish enjoyment, conceptual understanding, transfer or learning gains. This slice applies the theorem; it does not replace Workbook's geometric proofs.

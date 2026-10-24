# Hypotenuse Rush · ריצת היתר

A real third-person 3D grapple-parkour browser game in Hebrew. Read perpendicular distances from the athlete's current harness, choose a hook, launch, steer and release momentum across an open sandstone course.

## Play locally

```sh
npm install
npm run dev      # http://localhost:5183, strict port
npm test
npm run build
npm run preview  # http://localhost:4183, strict port
```

The static Vite build uses relative paths. No backend, account, API key, remote font/model fetch, microphone or analytics is required at runtime. WebGL hardware acceleration is recommended. Keep both ports available; scripts never kill another process.

## Implemented slice

One continuous ~350m multi-route course, nine broad-route grapple launches, a narrower shortcut, three ordered checkpoints and a physical finish. The numerical continuous-input witness takes45.83s (shortcut45.20s); human learning, local retries and improvement runs are intended to supply5–10minutes. Automation does not establish enjoyment or learning gains.

- Initial10m reach: `(8,6,0)` is exactly reachable; `(6,9,0)` is too far despite a shorter horizontal leg.
- Separate in-range-but-obstructed hook, changed approach values and high shelf; reach explicitly grows to13m at checkpoint2.
- Spatial `(3,12,4)` uses a5m horizontal face diagonal, then a13m body diagonal. Optional survey constructs both right triangles.
- Fixed120Hz integration; swept vertical capsule versus exact authored boxes; reel-assisted arcade grapple. Release preserves velocity; hold1.25s maximum, cooldown.25s. There is no teleport/spline movement.
- Failure reasons, fast local recovery, pause/focus loss, restart, camera wall avoidance, fullscreen, resize, reduced motion, mute and touch controls.
- Separately labeled assisted/unassisted local records, scoped to this course version. No student identifiers or external event transmission.
- Original Chrome/Tripo art, locally bundled Hebrew font, an explicitly articulated human athlete and generated-target/actual-capture review.

## Controls

| Action | Keyboard / mouse | Touch |
|---|---|---|
| Move / sprint | WASD or arrows / Shift | Left movement pad; full deflection sprints |
| Jump | Space | Jump button |
| Select / aim hook | Point at a hook, or Q/E for visible lock-on | Tap hook badge |
| Grapple / release | Hold / release left mouse; bottom action also works | Hold / release cable button |
| Camera | Right mouse drag | Drag world view |
| Survey | Tab; slows movement and timer together to20% | Survey button |
| Optional calculation | H | Calculation button |
| Retry checkpoint / new run | R / Shift+R | Retry / finish replay |
| Pause / fullscreen | Escape or P / F | Pause; browser fullscreen support varies |

A lock-on must remain inside the camera view to acquire; camera position never enters reach mathematics. Survey/hints mark the run assisted, including after they are switched off. Retry keeps the run clock. New run resets it.

## Deployment preparation

`npm run build` produces `dist/`. Import this existing public repository in the user's chosen Vercel project, use Vite, build command `npm run build`, output `dist`, no environment variables. `vercel.json` is included. No public deployment has been requested or performed.

## Evidence and provenance

- [Game identity](GAME_IDENTITY.md), [curriculum mapping](CURRICULUM.md), [asset provenance](ASSETS.md).
- [Independent playtest](PLAYTEST.md), [visual target vs actual review](docs/VISUAL_REVIEW.md).
- [Generated target](docs/visual-targets/gameplay-v1.png) is a design reference, **not an actual screenshot**. Actual browser captures live separately in `docs/evidence/`. A complete normal-control browser run finished in51.99s with9grapples,3checkpoints,0falls and no console errors.
- `window.render_game_to_text()` reports world/harness/anchor quantities and live state; `window.advanceTime(ms)` enters deterministic manual stepping for automated tests. Its optional second argument `false` skips the GPU draw while still updating physics, camera, poses and HUD; captures use the default draw. Real play uses the animation loop.

The generated meshes are decorative and have no mathematical authority. The athlete's joints are procedural; the generated helmet/arch are static, not rigged characters. Remaining fidelity, feel and device limitations are recorded in the playtest/review rather than treated as proven polish.

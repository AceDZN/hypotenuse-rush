# Hypotenuse Rush · ריצת היתר

A short 3D canyon grapple game in Hebrew. **Choose a ring, click once, fly and land.** The game handles the camera, release and landing; the player chooses hooks using their actual distance from the harness.

The current **flow v2** rebuild follows direct feedback that the original controls and gameflow were confusing. Three imagegen gameplay mockups and the [rebuild plan](docs/REBUILD_V2.md) were created and committed before changing gameplay.

## Play

```sh
npm install
npm run dev      # http://localhost:5183
npm run build
npm run preview  # http://localhost:4183
npm test
node tools/qa-flow.mjs http://localhost:4183
```

Both server ports are strict. Static Vite build, no backend/account/key/runtime API, remote font/model fetch or analytics. WebGL is required. `vercel.json` is ready for the later requested deployment; no deployment was performed.

## Current course

- Start directly on a launch pad with one obvious ring and marked destination.
- One click/tap supplies a complete assisted physical flight. No movement, aiming, holding, release timing or manual camera.
- The first landing introduces `(8,6)` versus `(6,9)` at cable reach10m; the final height choice uses `(5,12)` versus `(3,13)` at reach13m.
- Wrong choices remain safe and allow immediate retry. Physical landings advance progress.
- First run is untimed. Finish offers replay or an optional timed challenge with a local best.
- Pause, help, optional calculation, mute, reduced motion, fullscreen and responsive touch targets.
- Original local Chrome/Tripo arch/helmet reused; no additional model credits spent.

## Controls

| Action | Mouse / touch | Keyboard |
|---|---|---|
| Choose and launch | Click/tap a numbered ring | Left/right selects; Space launches; 1/2 directly attempts that ring |
| Optional air flip | Click world or air-action button | Space once in flight |
| Pause | Pause button | Escape / P |
| Help / calculation | ? / √ | Tab focuses ordinary UI controls |
| Fullscreen | Browser controls | F |
| Replay / timed replay | Finish buttons | Tab/Enter |

The flip is cosmetic and never changes the trajectory. The game discloses its arcade landing assistance in help. Reach uses true Euclidean distance with a separate numerical epsilon; camera/projection/model dimensions do not enter the rule. Flight integrates a solved initial impulse, hook-directed constant acceleration, continuous release velocity and gravity until actual floor contact. It does not carry the player on a spline or teleport between pads.

## Verification and design

- [Rebuild plan and human acceptance gate](docs/REBUILD_V2.md), [identity](GAME_IDENTITY.md), [curriculum](CURRICULUM.md), [assets](ASSETS.md).
- [Current playtest](PLAYTEST.md), [target/actual comparison](docs/VISUAL_REVIEW.md), [actual captures](docs/evidence/rebuild-v2).
- Three generated targets: [first click](docs/visual-targets/rebuild-v2/01-first-click.png), [flight](docs/visual-targets/rebuild-v2/02-flight.png), [choice](docs/visual-targets/rebuild-v2/03-choice.png). These are mockups, not screenshots of the game.
- `src/flight.ts` and 16 flight tests govern the active v2 game. The 27 older `src/rules.ts` tests and old evidence/tools remain historical v1 material; they do not describe current controls or prove current enjoyment.
- `window.render_game_to_text()` exposes current stage, authoritative quantities, input outcomes, event trace, asset status and records. `window.advanceTime(ms, draw=true)` enters deterministic manual stepping; false skips GPU draw while updating simulation/UI. Normal play uses real elapsed animation frames.

A three-choice automated route takes6.45 simulation seconds plus decision time. This pilot intentionally establishes the core loop before adding a longer course. Human comprehension, interest and learning remain to be tested by people.

# Hypotenuse Rush · ריצת היתר

A Hebrew 3D grapple game with **12 levels, 36 crossings and four regions**. Inspect a hook's perpendicular measurements, compare its diagonal with your rope length, then launch. The game handles release and safe landing.

## Play locally

```sh
npm install
npm run dev       # http://localhost:5183
npm run build
npm run preview   # http://localhost:4183
npm test
node tools/qa-campaign.mjs http://localhost:4183
node tools/qa-campaign-independent.mjs http://localhost:4183
```

Both ports are strict. The static Vite build needs no backend, account, key, remote runtime font/model service or analytics. WebGL is required. `vercel.json` is included for a later deployment; no deployment was performed.

## Campaign v3

- Twelve named levels across red canyon, water terraces, sunset spires and a moonlit summit. Each contains three authored physical flights.
- Next Level is the primary completion action. Completed levels can be replayed from the journey map. Reload restores the current safe checkpoint and retains unlocks, earned stars and records.
- A large rope-length badge remains visible. Thick coloured world measurements and a flat inspection diagram distinguish perpendicular legs from the diagonal.
- Clicking a hook selects/inspects it. Launch is a separate commitment, giving touch users time to read. Three neutral choices per crossing; correct slots are balanced and geometry varies.
- Wrong shots stay safe and show required cable length, current rope and shortfall. Correct first attempts earn stars; calculation help is available without blocking progression.
- Spatial stages construct a horizontal face diagonal before adding height. Length decisions use exact world quantities, never perspective or rounded labels.
- Original Chrome/Tripo models, a polished articulated athlete, generated local stone material, four environment families and a generated journey-map illustration. Gameplay remains an actual 3D scene.

## Controls

| Action | Mouse / touch | Keyboard |
|---|---|---|
| Inspect hook | Click/tap its numbered target | Left/right or 1–3 |
| Commit / launch | Launch button | Space / Enter |
| Optional air flip | Air action button or world click | Space in flight |
| Pause | Pause button | Escape / P |
| Journey / help / calculation | Journey / ? / Calculate buttons | Tab and Enter |
| Fullscreen | Browser controls | F |

The cable reaches from the harness to the hook, not to the landing platform. Flight is an assisted arcade mechanic: solved initial impulse, hook-directed pull, continuous-velocity release and gravity until physical floor contact. A flip only changes pose/score. There is no spline traversal or teleport during a crossing.

## Design, assets and verification

- [Campaign plan](docs/CAMPAIGN_V3.md), [identity](GAME_IDENTITY.md), [curriculum](CURRICULUM.md), [asset provenance](ASSETS.md).
- [Playtest](PLAYTEST.md), [visual comparison](docs/VISUAL_REVIEW.md), actual captures in `docs/evidence/campaign-v3`.
- New [choice mockup](docs/visual-targets/campaign-v3/choice-and-rope.png) and [map mockup](docs/visual-targets/campaign-v3/campaign-map.png) were committed before presentation work. They are generated targets, not actual screenshots.
- Active domain: `src/campaign.ts`, `src/flight.ts`. 21 current campaign tests plus 27 historical v1 tests pass. Old v1/v2 evidence and tools are historical; current UI tools are the campaign scripts above.
- `window.render_game_to_text()` reports level/hop, rope, exact hook quantities, rejection snapshots, input results, progress, assets and camera. `window.advanceTime(ms, draw=true)` enters deterministic manual stepping. Normal play uses real elapsed animation frames.

All twelve levels and 36 physical contacts are verified through the domain and normal browser controls. Automated completion does not establish fun, human comprehension or learning gains.

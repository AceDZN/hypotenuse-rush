# Campaign v3 playtest · 25 October 2026

The user rejected v2's three-jump scope, faint world triangles, obscure rope length, blind retry loop and weak presentation. New mockups and the campaign plan were committed before presentation work. This report describes the 12-level campaign; v1/v2 evidence remains historical.

## Current verification

- `npm test`: 48 passing tests, including 21 active campaign tests and 27 historical v1 checks. Current tests traverse all 36 physical downward contacts and all level transitions; check three neutral choices/one in range/balanced positions, varied planar and spatial witnesses, precise near-boundary rejection, selection without attempts, first-try/help rules, midlevel and completed-level restore, malformed saves/unlocks, replay records, pause, release continuity and irregular frame partitions.
- `npm run build`: TypeScript and static production build pass.
- `tools/qa-campaign.mjs`: production browser run completes all 36 crossings and 11 Next Level actions through normal selection/launch controls. It checks rope/target bounds, no target overlaps, selection without an attempt, required-length/rope/shortfall feedback, complete and checkpoint persistence, final reload, and captures all four environments. No state/position/win injection.
- `tools/qa-campaign-independent.mjs`: independent normal-control campaign run and 108 option inspections, with strict checks for help/map pause, current checkpoint resume, hint star eligibility, immediate target contrast, SVG text containment, planar/spatial solved and unsolved label size, touch selection/launch and precise 17.03m versus17m rejection. Console/page errors: none.
- Installed `web_game_playwright_client.js`: normal hook selection followed by Space and deterministic frames reaches an actual airborne state; canvas/text evidence is inspected. Its canvas capture excludes DOM HUD, so full-page production images are the interface evidence.
- `node --import tsx tools/verify-canyon-clearance.mjs`: geometry review samples 6,516 body positions across all 36 real domain flights and all 108 initial reach segments. No decorative body contacts or blocked reach segments were found. This geometry-only review excludes the flat landing floor, instanced details and GLB/textures; the production browser separately verifies loaded artwork and actual traversal.

## Issues caught and fixed

- The rope limit was a tiny edge badge: moved to a substantial centred specification with explicit metres and harness-to-hook meaning.
- Perspective hairlines were faint: replaced with outlined cyan/amber/purple world segments, filled construction, right-angle marks and a large flat diagram.
- Atomic hook clicks encouraged accidental/barely considered attempts: selection now inspects, Launch commits. First-try stars reward deliberation; a rejection explains measured length and shortfall.
- Three flights ended the whole game: 12 levels/36 flights, explicit Next Level and saved checkpoint/unlock/record progression.
- Map entry reset an unfinished current level: its primary action now resumes the current checkpoint. Replay is explicit for completed levels.
- Help→map closure could resume motion behind help: cleared the stale overlay state.
- Hint text still offered a star after forfeiture: the eligibility label and landing feedback now respect hint use.
- SVG labels shrank below16px, especially solved/spatial phone diagrams: compact diagram viewboxes and preserved solved heights keep labels readable; containment is checked.
- Animated target background briefly hid its number after selection: removed the background colour transition.
- Far phone camera clipped the stage-centred sky, exposing black wedges: sky follows the camera.
- Natural support columns occupied the landing area: moved stems behind/outside the route, with roofs above hooks. Tall plants moved away from P and the camera corridor.
- Wide global footer margins forced the athlete too small: camera fitting now checks actual inspector/action placement rather than reserving the whole bottom strip.

## Evidence and limits

Current actual browser captures and JSON live in `docs/evidence/campaign-v3`, with separate independent results. Generated targets live in `docs/visual-targets/campaign-v3`; the clean journey illustration is menu artwork, and the sandstone image is a surface texture. Neither substitutes for the rendered playable scene.

`01-opening.png` shows the current rope and inspection interface; `02-rejection.png` shows the actual distance comparison; `01-map.png` and `05-complete-map.png` show the 12-level journey. Regional ready/flight/phone views and independent solved spatial diagrams accompany the machine-readable results. Mockup and runtime-art hashes are recorded in `docs/visual-targets/campaign-v3/manifest.json`.

The art is still a stylized procedural indie scene. Generated mockups have substantially richer surface/character detail. High/spatial ready views remain wider than low crossings to preserve the full measurement; phone calculation help devotes more screen space to the diagram. These limitations are visible in captures.

The user’s next actual playtest determines whether the longer campaign, explicit rope and inspect/launch flow solve their frustration. No automated pass is claimed as proof of enjoyment or learning.

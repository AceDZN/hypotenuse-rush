# Campaign v3 actual gameplay evidence

Captured on25 October2026 (Asia/Jerusalem) from the running local production build at http://localhost:4183, except the independent checks at http://localhost:5183. These are actual browser captures, separate from generated design targets.

- `01-opening.png`: initial inspection, visible rope limit and world/flat measurements.
- `01-map.png`: real12-level map controls over generated background artwork.
- `02-rejection.png`: measured diagonal, available rope and shortfall after a committed attempt.
- `03-level-complete.png`, `04-campaign-complete.png`, `05-complete-map.png`: level continuation and persisted full-campaign result.
- `region-*.png`: current rendered environments, airborne traversal and phone composition.
- `results.json`: production normal-control36-crossing run,11 transitions, persistence and interface checks.
- `independent/`: independent normal-control results, failure recovery, spatial measurements and phone help states.
- `geometry-clearance.json`: sampled domain paths against checked decorative geometry. See PLAYTEST.md for exclusions.
- `skill-client.png` and `.json`: installed development-skill action client after ordinary selection and Space. The screenshot is canvas-only, so it omits the DOM HUD.

Matching JSON captures retain simulation, camera, asset and progression state. Browser runs use deterministic time to make the actions reproducible; these results are functional evidence, not a frame-rate or enjoyment claim.

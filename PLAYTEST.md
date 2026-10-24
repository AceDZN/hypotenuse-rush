# Close-view revision playtest · 25 October 2026

The user’s actual desktop and phone screenshots showed a distant, barely readable athlete and an oversized permanent calculation panel. This revision supersedes the initial v3 presentation. The 12-level/36-crossing campaign and exact distance/flight model remain active.

## Image-first plan and implementation

- New desktop and phone mockups plus docs/CLOSE_VIEW.md were committed in 2ee5c18 before presentation changes. They are design targets, not game captures.
- Replaced the unbounded all-hook/corner camera retreat with a finite composition search. Projected player size is a hard constraint; landing visibility, elevation and screen placement guide the composition. Choice does not rotate/zoom the world. Flight steadily follows the athlete.
- Removed the permanently visible flat triangle/calculation panel. Selected perpendicular dimensions and Launch share a compact bottom strip; the rope limit is a slim header badge.
- Diagram opens a dismissible paused view. Merely opening the unsolved diagram preserves the first-try star. A separate explicit solution action records assistance; close/Escape returns to the unchanged ready state.
- Ring targets use nearby labels and honest edge arrows. Dimension badges avoid the actual athlete bounds, landing ellipse, hook buttons and HUD; displaced badges retain thin leaders to their measured segment.
- Rejected-shot feedback sits beside the lower-left athlete rather than growing a full-width dock over their feet.

## Verification

- npm test:48 passing tests, including 21 current campaign tests and 27 historical v1 checks.
- npm run build: TypeScript and static production build pass. Current JS 646.05KB (173.75KB gzip), CSS 18.53KB (4.96KB gzip); all runtime artwork remains local.
- tools/qa-close-view.mjs is the current independent UI acceptance tool. It uses normal mouse/keyboard and touch actions plus deterministic time, with real screenshots and read-only projection measurements. Final production results: all 36 stages at 1280×900,1280×720,885×941 and 390×844, 72 normal-input physical flights and 216 airborne probes; zero layout violations and browser errors. Minimum projected actual-mesh bounding heights are 144.5/115.6/150.1/133.0px respectively. The compact inspection is at most 48px desktop/34px phone; the entire phone dock is 114.89px. Final results are stored with current evidence.
- The installed web-game action client supplies a separate ordinary select→Space flight burst. Its canvas-only screenshot omits DOM HUD; full-page acceptance captures are the interface evidence.
- Earlier domain/geometry verification still applies: all 36 actual downward contacts,12-level save/restore/unlock progression, exact rope thresholds and 6,516 decorative body-path samples with no contacts in checked geometry. See docs/evidence/campaign-v3 and its stated geometry exclusions.

## Issues caught in actual captures and corrected

The initial close camera was below the landing, making the destination a wall. Elevation and landing-incidence preferences now show its top. Phone diagram width overflowed despite max-width:100%; it now has a viewport-bounded width. Rejected feedback hid the feet, short measurement labels covered the head, and one phone landing marker was off the right edge. Those placements now have explicit exclusions/bounds rather than relying on a broad camera retreat.

## Evidence and limits

Current actual captures and machine-readable results: docs/evidence/close-view. Earlier campaign captures are preserved separately. Generated targets: docs/visual-targets/close-view, with exact built-in-imagegen prompts beside them.

Close framing deliberately prioritizes a readable person. Extreme spatial phone constructions may extend past an edge even with their selected hook and landing visible. Edge cues preserve target access, and the requested flat diagram shows the complete construction. The generated mockups have richer art and a larger illustrated person than the procedural runtime; they are composition references, not a fidelity claim.

Projection bounds and automated completion do not establish human enjoyment or comprehension. Actual source-of-truth screenshots are reviewed alongside checks; the user’s next playtest determines whether the presentation resolves the complaint.

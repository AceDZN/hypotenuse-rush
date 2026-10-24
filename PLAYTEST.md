# Independent verification — 24 October 2026

The final rule suite passes **27 / 27** tests. The independent static-production UI pass at `http://localhost:4183` passes **eleven functional groups with zero console/runtime errors**. The lead's normal keyboard/mouse course run finishes in **51.688 simulation seconds**, with **nine grapples, three checkpoints, zero falls, one failed overreach and one calculation hint**. It is an **assisted** run, recorded separately from unassisted runs. These checks demonstrate implemented behavior; they do not establish enjoyment or learning gains.

## Domain and route witnesses

Run `npm test`. Independent tests are in `tests/reach.test.ts`, `tests/state.test.ts` and `tests/course.test.ts`, using the continuous-input helper `tests/course-witness.ts`.

- Opening A `(8,6,0)` gives `10 m`; B `(6,9,0)` gives `√117 ≈ 10.817 m` and fails at `10 m`.
- Spatial `(3,12,4)` gives face diagonal `5 m`, then body diagonal `13 m`; succeeds at `13 m`, fails at `10 m`. Changed `2–3–6 → 7` and high-shelf `5–12–13` examples also pass.
- Actual authored D is less than `10 m` from the ridge stance but obstructed, while C is clear. At the high-shelf stance, E is exactly `13 m`; F is horizontally closer but too high.
- Common translation/sign changes, moving harness origin, distinct aim/range/obstruction, bounded segments and reach tolerance independent of collision skin.
- Swept thin-wall/floor collision, stable grounded harness height, pull without teleporting, release velocity continuity, cooldown, hold expiry/speed cap and cable obstruction detach.
- An input-only regression reproduces the real Chrome late landing: a short approach reaches `x ≈ 0.302`, a `0.75 s` A hold and release lands near `x = 26.084`, saves checkpoint 1 and supports local retry without clock reset. The painted grounded zone now covers that safe landing.
- Equal-duration render partitions, pause/resume without catch-up, survey physics/clock both at 20%, assistance/hints, checkpoint ordering, finish bypass rejection, retry/restart and local fall recovery.

The final broad-route numerical witness takes **45.833 simulation seconds**; the narrow S/jump route takes **45.200 seconds**. Both use nine grapples and have zero falls. The controller makes no post-start position, velocity, checkpoint or win-state writes. Its analog inputs and exact world knowledge make this a feasibility witness, not a human performance claim.

The broad route keeps `z = −3` after C until `x = 48`, turns through `(56, −8)` and `(73, −8)`, then approaches H at `(91, 4)`. The shortcut holds `z = 6.5`, starts a sprint jump near `x = 65.05`, and stays aligned until landing beyond the six-metre gap. Its measured advantage is about `0.633 s`; human reward balance remains unproven. A `0.4 s` S hold failed an earlier landing diagnostic, showing a real timing consequence.

## Independent production UI pass

Run `node tools/qa-browser.mjs http://localhost:4183`. The installed action client cannot express Shift/Tab, viewport/fullscreen and multi-pointer touch, so this supplemental script uses normal keyboard/pointer/touch input and the deterministic time hook. Noncapture steps advance all state while skipping redundant GPU draws; each saved capture explicitly renders the resulting real scene. No game-state injection is used.

Eleven groups passed:

1. Both local Tripo GLBs loaded; malformed local records were ignored; the document uses Hebrew/RTL.
2. Opening Tab survey showed exact `8 m` / `6 m` perpendicular components without the solved diagonal. Normal Shift+R cleared time and assistance.
3. B failed with overreach, then R recovered locally.
4. A attached for `0.7 s`, released momentum, landed and crossed physical checkpoint 1.
5. A normal arrow-key approach to the ridge stance and D attempt reported **obstruction at `9.478 m` with `10 m` reach**, rather than overreach, and made no attachment.
6. Pause froze state/time; checkpoint retry kept the run clock.
7. Survey advanced physics/clock at 20%; H recorded calculation assistance.
8. Actual camera position/orbit changes preserved harness distances; resize preserved orbit/checkpoint.
9. Fullscreen entered and returned.
10. The `390 × 844` phone opening stayed within the viewport; the B badge did not intersect the timer/checkpoint HUD at either 1280 px or phone width. A thin leader connects its displaced label to the real hook.
11. Touch badge selection and real two-finger movement/grapple inputs on the phone preserved the held cable when the movement finger lifted, then released when the grapple finger lifted. The test observes an actual stick `pointerup` before accepting the partial-release result. The release notice agrees with detached state.

All nine final capture states were opened and visually inspected, then copied with their JSON into `docs/evidence/qa-*`: `opening-survey`, `overreach`, `grapple`, `landing`, `survey-hint`, `resize`, `touch`, `obstructed` and `phone-opening`. The clean result is `docs/evidence/qa-results.json`. Document, body and viewport widths agree at **1280**, **800** and **390 px**; an earlier tablet pass also checked **1024 px**. The changed-origin calculation from checkpoint 1 to old hook A visibly uses `12 m` and `5 m` to obtain `13 m`; its formula lines are separated and LTR.

The first UI pass found favicon 404s, negative overflow from fixed controls inside transformed groups, merged formula lines and stale attached feedback after release. The final rerun verifies those corrections and reports `errors: []` in `docs/evidence/qa-results.json`. The local working outputs are reproducible with the script.

## Full course browser evidence independently reviewed

`tools/play-browser.mjs` was inspected: it uses real keyboard/mouse/selection actions, text observations and time advancement. It does not write player coordinates, checkpoints or a win state. `docs/evidence/browser-results.json` records the nine-anchor trace, finished position near `(350.006, 9.002, 4.063)`, three checkpoints, both model-load flags and zero errors.

The actual `docs/evidence/survey-opening.png`, `grapple-A.png`, `grapple-G.png` and `finish.png` captures were opened. They show the opening harness-origin construction, animated airborne traversal, the 13 m spatial section and a finish summary that labels assistance and separates records. The full course result is `51.688 s`, zero falls, nine grabs/releases, one overreach and one calculation hint. The finish summary describes observed actions rather than claiming mastery.

## Visual target and asset review

`docs/visual-targets/gameplay-v1.png` and its prompts were inspected. It is a **generated design target**, never an actual game screenshot. Its described starting stance inconsistently shows `1 / 3`; the implementation correctly starts at `0 / 3`.

Compared with the early blockout, the final production captures have a closer athletic chase camera, a visible harness P, running/reach/tuck poses, warm grain materials, original layered Tripo arches and a generated helmet. Survey shows perpendicular world-axis legs and a right-angle mark without a green correct-answer indicator. Formula text is readable and isolated LTR inside Hebrew UI.

The actual world remains more stylized and rectilinear, with less detailed character anatomy and rock surfaces than the generated reference. The retained helmet differs from its uncovered hair. The high B label now moves clear of the central HUD with a thin leader; the hook position and acquisition math stay fixed. On narrow portrait views the athlete can be partly cropped on the left during airborne frames, and the compact guide banner sits close to the horizontal measurement label. Tablet/desktop framing is clearer; this remains a presentation limitation.

Independent binary inspection confirms both GLBs are valid version 2 with no external asset URI, skin or animation: arch **1,897,224 bytes / 37,198 triangles**; helmet **642,388 bytes / 6,956 triangles**. Their hashes match the recorded optimized assets. Character motion is procedural articulation; no generated rig is claimed.

## Evidence limits

The first development action-client capture showed a real checkpoint-1 landing but also an unloaded-model parse error; it is superseded by the successful final production checks. A longer forced-SwiftShader action run was stopped by its owner after an extreme shared-host rendering slowdown. Installed Chrome and drawing only capture frames made the normal-input verification practical. Neither that slowdown nor clamped simulation timing is used to invent a hardware FPS claim.

Real user-Chrome production inspection is documented in `docs/VISUAL_REVIEW.md`, `docs/evidence/chrome-gameplay.json` and the actual `chrome-gameplay.jpg`, which were independently read/viewed. Normal CUA input verified B overreach, retry, a changed harness origin near `x = 0.311`, A hold/release, animated traversal, safe landing, pause/resume and Tab survey without `advanceTime`. The older loaded build landed near `x = 26.214` but missed the narrow checkpoint; that observation led to the broadened painted grounded zone and the 27th regression above. The real-Chrome partial run does not claim course completion. It reports no game-origin console error and separately records one unrelated browser-extension error.

The final `docs/evidence/performance.json` records an uncontested real-time installed-Chrome/ANGLE Metal sample on Apple M2 Max at **1728 × 780**, display DPR 2 and **canvas DPR 1**, with no manual time hook: 240 rolling intervals, mean **33.3321 ms**, P95 **33.4 ms**, approximately **30.001 Hz**, both assets loaded and zero errors. This is one playing-view sample on the shared host, not a guarantee for all devices or every course view. An earlier retina canvas-DPR-1.7 user-Chrome sample was slow; the final cap of 1 avoids its 2.89-times pixel cost.

Automated completion and replay times do not establish human enjoyment, five-to-ten-minute engagement, conceptual mastery or learning gains. The safe practice area, alternate route, local retries and repeatable course provide that intended slice structure; a human play session is still needed to evaluate feel and teaching value.


The installed develop-web-game action client also completed against the final production preview using Enter, a short left-mouse grapple and release. The actual canvas capture and state were opened and checked: both local models loaded, playing mode, one grab/release, retained velocity and no console error output. Saved as `docs/evidence/skill-client.png` and `.json`. That client's canvas-only crop omits the HTML HUD and catches the title-to-chase transition; the settled full-page comparison and complete route use the supplemental normal-input scripts above.

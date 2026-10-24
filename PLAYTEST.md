# Playtest — active flow v2, 24 October 2026

The user rejected v1 as confusing, boring and difficult because of controls/gameflow. Previous numerical completion and browser passes did not establish a fun human experience. This document describes the rebuilt three-flight pilot; older files in docs/evidence outside rebuild-v2 and old tools are historical v1 evidence.

## Current checks

- `npm test`: 43 passing (16 active-flight tests; 27 historical v1 tests). New tests verify true harness reach and exact threshold; one-press whole flight; continuous release velocity; physical downward floor contact; complete three-hop finish; rejection preserves progress and allows immediate recovery; nonblocking feedback; keyboard selection; no queued launch; irregular frame chunks; pause across phases; cosmetic trick with unchanged trajectory; restart/timed replay; invalid time handling.
- `npm run build`: TypeScript and static Vite build pass.
- `node tools/qa-flow.mjs`: six browser groups pass using installed Chrome and actual keyboard/mouse/touch actions. No position/checkpoint/win writes. Checks start-without-menu, untimed first run, malformed records, both loaded Tripo assets, launch/flip/pause/landing, wrong-choice instant recovery, calculation, explicit reach change, resize/phone targets, full finish, opt-in timed replay and persisted best, and touch-only completion. Console/page errors: none.
- Installed skill client `web_game_playwright_client.js`: Space launches, deterministic frames reach a visible attached airborne state; actual canvas capture and text state inspected. This canvas-only screenshot omits DOM HUD; full-page captures are in rebuild-v2.
- Direct CUA in-app preview play through normal clicks: first flight, safe rejected hook, immediate successful retry, final flight/finish. No advanceTime in that human-surface check. It confirms interaction operation, not novice enjoyment.

## Issues caught and fixed

- Giant distant mesas filled the frame under orthographic projection: lowered/narrowed/hazed background and reduced the Tripo arch.
- Raw floating-point strings in measurement badges: rounded only displayed quantities.
- Phone high hooks overlapped and intercepted taps: separate numbered targets with leader lines whenever portrait/narrow projections are too close.
- Character overlapped the instruction footer in the in-app panel: camera now fits important world points into the space between header and footer.
- Rejection recoil followed a newly hovered valid hook: now it remains tied to the rejected attempt and names that ring explicitly.
- Contextual Space after hook focus could be swallowed by native-button handling: primary action now handles hook/air-button focus; utility/modal buttons retain native keyboard behavior.

## Evidence

`docs/evidence/rebuild-v2`: ready, attached flight, optional flip, physical landing, choice, rejected reach, high choice, phone choice, finish and phone opening, each paired with text state. `results.json` records current browser checks. `skill-client.png/json` record the installed action client. Generated reference images are stored separately under `docs/visual-targets/rebuild-v2` and were committed before gameplay work.

The scene uses simpler polygon rocks, an articulated procedural human and an orthographic camera. Generated-target rock detail/anatomy is not matched. The first course is short; no spatial fork, free running or longer route is claimed. The old v1 performance report is not a benchmark of v2; headless SwiftShader timing is not a device FPS claim.

## Human acceptance remains open

A newcomer should identify target/destination in5seconds, complete first flight in15seconds, understand a failed choice and retry immediately, identify the next destination in3seconds, and voluntarily want another run. Those observations require actual people. Do not expand into a long repeated course or call it fun based on automation. The user's next playtest is the next design input.

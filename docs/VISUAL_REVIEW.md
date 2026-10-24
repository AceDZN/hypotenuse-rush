# Campaign v3 — target and actual review

Targets: `docs/visual-targets/campaign-v3/choice-and-rope.png` and `campaign-map.png`, generated and committed in `527baac` before presentation changes. Exact prompts are beside them. They are mockups, not game captures.

Actual: production browser images in `docs/evidence/campaign-v3`, 1672×941 plus390×844 phone views, through actual controls and deterministic time. Four regions, flight, failure, level completion and full journey are represented.

| Requirement | Implementation and review |
|---|---|
| Rope length obvious | Large central “אורך הכבל שלך” badge with metre value and harness-to-hook caption. Entire badge is checked inside desktop/phone viewport. |
| Visible triangle | Outlined cyan horizontal, gold height, purple depth, cream dashed diagonal, translucent fill and right-angle marker, all rooted at actual harness P. |
| Perspective-independent reading | Flat inspection repeats exact quantities. Spatial choices show floor f then f plus height. All option labels and solved-state text are checked for containment and at least16px rendered size. |
| Deliberate choice | Hook click selects only; separate Launch commits. First-try rewards and precise failure explanation. No advance answer colouring. |
| Substantial progression | Twelve numbered map stops and 36 crossings. Next Level, saved checkpoints/unlocks and explicit replay. |
| Better world | Perspective framing, closer aerial shot, sculpted textured ledges, natural supports, region terrain/plants/sky/water and the original Tripo landmark/helmet. |
| Menu art | A clean generated four-region map illustration under real numbered interactive nodes. No baked fake UI; active gameplay remains Three.js. |
| Fidelity limit | Actual athlete/rocks remain simpler than generated targets. High hooks require wider ready views; calculation help occupies substantial phone area. |

Initial review caught black sky wedges, supports on the landing, foreground plants hiding P, transient target text contrast, tiny solved labels and stale help/map states. These were corrected using actual captures and independent browser checks. Further visual matching does not establish human fun.

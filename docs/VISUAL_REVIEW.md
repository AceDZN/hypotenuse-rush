# Rebuild v2: generated targets versus actual game

The current targets are `docs/visual-targets/rebuild-v2/01-first-click.png`, `02-flight.png`, `03-choice.png`. Generated with built-in imagegen and committed in5033878 before gameplay implementation. Prompts/provenance are beside them. All are mockups, not gameplay evidence. Old gameplay-v1.png guided the rejected v1 course and is superseded.

Actual production captures are in `docs/evidence/rebuild-v2` at1672×941, with390×844 phone views, through real controls plus deterministic frame advancement. CUA additionally played the in-app preview in real time.

| Aspect | Target | Actual / deliberate constraint |
|---|---|---|
| Core action | One click to complete a leap | One click/tap or Space launches, automatic release and physical landing. Wrong choice stays safe. |
| World composition | Launch left, hook above gap, wide marked landing right | Elevated authored orthographic camera fits these points above the prompt footer. Portrait camera looks along the route. |
| Character | Large detailed human athlete | Smaller procedural articulated human, Tripo helmet; no generated character rig. This remains a fidelity gap. |
| Cliffs | Rich carved polygon sandstone | Chamfered layered authored ledges and distant hazy mesas. Simpler geometry, no photo detail. |
| Fixtures | Ring attached under rock | Ivory rings on coral cantilever gantries anchored on the destination shelf; true distance remains independent. |
| HUD | Sparse contextual instruction and progress | Brand, three dots, cable reach/pause, one prompt, small help/calculation. Timer only in opt-in replay. |
| Choice | Two neutral hooks, perpendicular legs | Neutral hooks; selected harness-origin triangle with right-angle mark, measurement summaries on both options. No solved diagonal until optional calculation. |
| Scientific accuracy | Generated guide lines float beside rock | Runtime guide starts at actual P and connects exact perpendicular world-space legs. Numeric display rounding does not decide reach. |
| Motion | Cable/athlete/trail, celebratory landing | Real integrated assisted flight; automatic release; optional cosmetic flip; articulated pose/dust/chime/landing compression. |
| Phone | Not specified in generated images | Fitted view and separated numbered targets with leader lines when projection overlaps. |

The targets inspired composition and affordances, not a promise of identical rendering detail. Initial integration had enormous background walls and hidden/overlapping targets; those were fixed from actual captures. Visual matching and successful automation still do not establish human fun.

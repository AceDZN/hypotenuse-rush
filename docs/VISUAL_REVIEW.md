# Close-view target and actual review

Latest user evidence: the athlete became a dot and the calculation occupied too much of the screen. The close-view plan supersedes the initial campaign-v3 permanent diagram requirement.

Targets: docs/visual-targets/close-view/desktop.png and phone.png, generated with built-in imagegen and committed in 2ee5c18 before implementation. Exact prompts are beside them. These are composition targets, not runtime captures.

Actual: docs/evidence/close-view, from the running production build. It includes the user-relevant second level, tall/spatial stages, requested math, rejection and airborne views across desktop and phone.

| Requirement | Implementation/review |
|---|---|
| Readable player | Finite camera search preserves player size, anchors the foreground figure and cannot retreat indefinitely to accommodate decoys. Steady flight following retains scale. |
| Visible landing | Elevated eye, landing-incidence preference and viewport bounds preserve the destination’s surface/marker. |
| Quiet default HUD | Slim rope badge, compact perpendicular dimensions and Launch. No permanent flat SVG, calculation or instructions wall. |
| Optional full math | Explicit Diagram opens paused unsolved construction; separate solution assistance; close/Escape returns to the same state. Phone width/font/containment checked. |
| No avatar/goal obstruction | World labels avoid actual athlete bounds and projected landing ellipse; nearby hook labels avoid the goal; rejection toast sits beside the athlete. |
| Honest close-frame limits | Exceptional ring/corner positions may extend outside a narrow viewport; edge cues and the complete requested flat diagram preserve access/measurement. |
| Fidelity limit | Procedural character/terrain remain simpler than generated mockups. A large illustrated mockup figure is not a runtime size guarantee. |

Independent source/projection review and own-Chrome visual fixtures confirmed the second-level scale improvement and caught low landing incidence, badge/actor overlap and high anchors beneath HUD. Fixtures are distinct from the normal-control completion evidence and precede the final label fixes.

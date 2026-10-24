# Hypotenuse Rush · ריצת היתר — flow v2

**Choose → fly → land → choose again.** A short 3D canyon grapple game with automatic flight assistance. The current course has three complete flights, a finish, replay and an optional timed replay. It replaces the rejected v1 navigation/hold/release course after direct human feedback on 24 October 2026.

Visual thesis: a coral-helmet athlete and ivory cable sweep between warm polygon sandstone shelves; launch, hook and landing read together in one authored elevated view.

Content plan: immediately playable launch with one hook → satisfying first landing → calm two-hook distance choice → changed height/reach → finish/replay. One contextual instruction, three progress dots, cable reach and pause. No initial instruction wall or countdown.

Interaction thesis: a subtle target pulse invites the first click; constant-acceleration launch and automatic release communicate cable tension; landing compression/dust/chime signals success. Reduced motion removes pulse, trail and body rotation. The automatic camera fits player, hooks and destination above the instruction footer. Narrow/portrait views separate overlapping numbered touch targets with leader lines.

One click or tap chooses a hook and launches. Keyboard: left/right selects, Space launches. Another Space/click in flight performs one optional cosmetic flip; it cannot affect landing. The player does not move, aim, hold, release or steer manually. A wrong reach choice stays safely on the launch pad with a reason and immediate retry. Each physical landing saves progression.

The pilot stages are guided `(8,6,0)` at R=10; choice `(6,9,0)` versus `(8,6,0)` at R=10; height choice `(5,12,0)` versus `(3,13,0)` at R=13. Both options have neutral fixtures before commitment. Selected world-space construction begins at the actual harness and shows perpendicular legs/right-angle mark; optional calculation reveals the diagonal. Numeric display rounding never decides reach.

One unit = one metre. Flight is an explicitly assisted arcade mechanic: solve an initial impulse, apply constant acceleration along the initial harness-to-hook direction for .45s, retain velocity at release, integrate gravity for ~1.05s, then resolve actual downward floor contact. No animation spline or checkpoint teleport carries the athlete. A .65s landing celebration precedes the next ready state.

Art: original local Chrome/Tripo helmet and a small hazy natural arch; procedural articulated athlete and exact authored polygon ledges/gantries. These static generated models have no rig and no mathematical authority. No additional model generation or credits were used for the rebuild.

## Image-first workflow

The three generated mockups in `docs/visual-targets/rebuild-v2` and `docs/REBUILD_V2.md` were committed as 5033878 before any v2 game implementation. They are design targets, not gameplay captures. Runtime preserves their composition and interaction hierarchy with simpler geometry, a smaller athlete and orthographic framing. Actual captures are separate in `docs/evidence/rebuild-v2`. See `docs/VISUAL_REVIEW.md`.

## Scope and next gate

This is deliberately a short first course, not an expanded replacement of the old 350m corridor. The user should be able to judge the core feel quickly. Spatial choices, multiple valid routes and a longer flow challenge belong after the first loop is understandable and enjoyable. Automated completion is not human fun, comprehension or learning evidence.

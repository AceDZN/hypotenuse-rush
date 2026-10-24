# Visual review — Hypotenuse Rush

The primary generated gameplay target is supplied centrally at `docs/visual-targets/gameplay-v1.png`. It is a design reference, never an implementation screenshot. The supplied target and its exact prompts were inspected with `view_image` on 24 October 2026. The initial real capture is `playtest-output/intro/shot-0.png` at 1280×720; it is a development baseline. Final production comparison remains open until local model import and comparable survey captures are verified.

## Intended art and asset breakdown

- Third-person camera follows the athlete into the +X canyon course. Framing must keep the next landing and aimed anchor readable; decorative cliffs cannot hide the grappling decision.
- The target uses rugged red layered sandstone, cream sunlit edges, cobalt sky, a charcoal-blue shirt, tan trousers and coral/cream harness equipment. The implementation athlete palette was revised to match those clothing/gear roles. The white grapple line makes acceleration and release legible.
- One original Tripo arch establishes wind-carved canyon scale. Decorative instances stay outside the playable z=-9..11 corridor, with a closer view at x=15,z=23 and repeated arches along x=22,79,160,240,310. Geometry/material references are shared between copies; background arches do not render dynamic shadows.
- One original Tripo coral/ivory helmet attaches to a procedural jointed athlete. The target has uncovered hair; the helmet is a deliberate athletic equipment difference that reuses the existing authorized generation. Separate limb pivots express running, leap tuck, grapple reach and falling. No generated rig is claimed.
- Authoritative platforms, anchor centres, perpendicular survey legs and right-angle marks are procedural. Decorative meshes never determine reach or collision.
- HUD priority is reach/anchor decision, ordered checkpoint and time. Hebrew labels are RTL; quantities and formulas remain isolated LTR. Actual mixed-direction screenshots require inspection.

## Comparison record

| Aspect | Intended target | Actual production capture | Fix / remaining issue |
|---|---|---|---|
| Camera / framing | Low behind-left athletic chase, human occupies roughly half frame height; gap and landing read clearly | Initial baseline: high centered chase, athlete roughly 110px high in 720px frame | Lead is lowering/closing camera; final comparable capture pending |
| Human silhouette | Bent athletic human, dark blue/tan clothing and coral gear | Articulated module and revised palette implemented; final capture pending | Inspect foot contact, airborne reach and helmet orientation; procedural body remains less detailed than target |
| Canyon scale / depth | Open sky, fine stratified sandstone and distant canyon layers | Initial baseline: plain large polygonal cliff columns, broad flat ledges | Both normal GLB exports completed after a fresh owned Chrome tab recovered the connection. Final offline reduction complete: arch 37,198 triangles / 1.90 MB and helmet 6,956 triangles / 642 KB. Local grain material supplied for exact surfaces |
| HUD / hierarchy | Sparse decision information over world | Pending | Keep scene dominant |
| Typography / RTL | Hebrew UI, isolated formulas | Pending | Inspect actual render |
| Input affordance | Grapple / jump / survey visibly actionable | Pending | Independent functional play required |
| Feedback | Cable tension, lean, landing / failure reason | Joint poses implemented; capture pending | Verify animation from real state |
| Lighting / materials | Warm rock, cool distance, readable athlete | Pending | Avoid clipped coral or dark back silhouette |
| Mathematical consequence | Same current harness origin for scan/attach | Owned by gameplay lead | Decorative art excluded from measurements |

## Current verification

`node node_modules/typescript/bin/tsc --noEmit` passed after `src/art.ts` was added. Normal UI exports and offline reduction completed for both assets. Geometry/UV/normal/map/containment checks passed. Browser loading and final scene comparison remain unverified until the latest production build is captured. The first Blender decimator was canceled after more than ten minutes without completing; meshoptimizer is being used for a faster reduction with ordinary uncompressed GLB output. Two normal Tripo generations were submitted, each with displayed cost 45 credits; task IDs and exact prompts are recorded in ASSETS.md.

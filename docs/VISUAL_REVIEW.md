# Visual review — Hypotenuse Rush

The primary generated gameplay target is supplied centrally at `docs/visual-targets/gameplay-v1.png`. It is a design reference, never an implementation screenshot. This review remains open until that target and actual production captures are present.

## Intended art and asset breakdown

- Third-person camera follows the athlete into the +X canyon course. Framing must keep the next landing and aimed anchor readable; decorative cliffs cannot hide the grappling decision.
- The world uses red layered sandstone, cream sunlit edges, cobalt sky and a coral human silhouette. The white grapple line makes acceleration and release legible.
- One original Tripo arch establishes wind-carved canyon scale. Repeated decorative instances stay outside the playable z=-9..11 corridor, with one closer view at x=15,z=23.
- One original Tripo coral/ivory helmet attaches to a procedural jointed athlete. Separate limb pivots express running, leap tuck, grapple reach and falling. No generated rig is claimed.
- Authoritative platforms, anchor centres, perpendicular survey legs and right-angle marks are procedural. Decorative meshes never determine reach or collision.
- HUD priority is reach/anchor decision, ordered checkpoint and time. Hebrew labels are RTL; quantities and formulas remain isolated LTR. Actual mixed-direction screenshots require inspection.

## Comparison record

| Aspect | Intended target | Actual production capture | Fix / remaining issue |
|---|---|---|---|
| Camera / framing | Low athletic chase, clear next anchor/landing | Pending | Compare same action and viewport |
| Human silhouette | Bent articulated limbs, coral/cream equipment | Articulated module implemented; capture pending | Inspect foot contact, airborne reach and helmet orientation |
| Canyon scale / depth | Open sky, stratified sandstone, background arch | Tripo arch generation complete; normal UI export pending | Chrome extension timeouts block export |
| HUD / hierarchy | Sparse decision information over world | Pending | Keep scene dominant |
| Typography / RTL | Hebrew UI, isolated formulas | Pending | Inspect actual render |
| Input affordance | Grapple / jump / survey visibly actionable | Pending | Independent functional play required |
| Feedback | Cable tension, lean, landing / failure reason | Joint poses implemented; capture pending | Verify animation from real state |
| Lighting / materials | Warm rock, cool distance, readable athlete | Pending | Avoid clipped coral or dark back silhouette |
| Mathematical consequence | Same current harness origin for scan/attach | Owned by gameplay lead | Decorative art excluded from measurements |

## Current verification

`node node_modules/typescript/bin/tsc --noEmit` passed after `src/art.ts` was added. Browser GLB loading and actual scene comparison are unverified until normal UI exports finish. Two normal Tripo generations were submitted, each with displayed cost 45 credits; task IDs and exact prompts are recorded in ASSETS.md.

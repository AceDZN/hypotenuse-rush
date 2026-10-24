# Asset provenance

## Art direction and authority

Hypotenuse Rush uses an open red-sandstone canyon, cobalt sky, cream/coral fixtures and an articulated human athlete. Tripo art is decorative only. Authored primitive geometry defines all mathematical surfaces, exact anchors, terrain collisions and line-of-sight rules. No generated volume is used as a measurement.

The browser art contributor owns a new Chrome tab named `🏜️ Hypotenuse Rush` (tab ID `512277819`). Both tasks below were submitted through the normal existing-session Tripo UI on 24 October 2026. No provider API, credentials, signed URL, new plan or credit purchase was used. Exactly two initial normal generations were submitted. Other crews used the account concurrently, so balance changes are not attributed costs.

## Sandstone arch — normal export complete

- Task ID: `60765ed9-c92a-4f6e-a63a-d019b4d859c7`
- Task page: https://studio.tripo3d.ai/workspace/generate/60765ed9-c92a-4f6e-a63a-d019b4d859c7
- Displayed generation cost: **45 credits**.
- Options: HD Model, H3.1 Best Quality, Geometry & Texture, Sharing Only; Generate in Parts off, 8K Texture off.
- Exact submitted prompt:

> One original monumental red sandstone desert rock arch for a fast athletic parkour game. Tall wind-carved twin buttes joined by a sweeping natural arch, layered terracotta and burnt orange sediment bands, broad angular facets with pale cream erosion edges, a few tiny ochre ledges. Airy sculptural silhouette, warm stylized game-ready art, rich clay material with subtle stone grain, clear sunlight shading. Single isolated environmental prop, no base pedestal, no ground plane, no vegetation, no buildings, no people, no symbols, no text. Clean geometry, real volume visible from every side.

## Athletic helmet — normal export complete

- Task ID: `60ee1cd3-1c74-4c1e-b014-89d6497992a8`
- Task page: https://studio.tripo3d.ai/workspace/generate/60ee1cd3-1c74-4c1e-b014-89d6497992a8
- Displayed generation cost: **45 credits**.
- Same normal model options as the arch.
- Exact submitted prompt:

> One original lightweight open-face climbing helmet for a sporty human parkour runner. Smooth coral-red hard shell, warm ivory racing stripe front to back, a few clean ventilation slits, small dark charcoal padded rim, short chin straps. Modern friendly athletic equipment, no face, no person, no head, no mannequin, no robot, no visor, no lettering, no logos, no ground, no pedestal. Stylized game prop with bold readable silhouette, understated material texture, real volume seen from every side, low complexity clean geometry.

## Procedural character

`src/art.ts` creates an original articulated athlete, with separate hips, torso, shoulder, elbow, hip and knee pivots, running gait, airborne tuck, grip reach, and head response. The generated helmet is attached as a rigid equipment component. This does not claim the GLB has a skeleton or motion clips. A coral fallback helmet remains visible only if the generated helmet cannot load. A root-fixed measurement ring and small indicator mark P=(0,1.05,0) independently of hip bob and torso lean, matching the rules’ harness origin.

## Licensing and export notes

These prompts are newly authored for this project; no third-party character or artist reference was requested. Tripo account rights and current service terms apply to generated output; no separate open-source asset license is invented. Task output is intended to be bundled for the owner's requested game. Verify account entitlement before redistribution beyond that use. Both normal UI GLB exports were downloaded at 1k texture resolution. The original export files remain outside the public repository; only optimized local derivatives are bundled. No signed download URL or browser state is stored.

## Normal exports and processing

A stale Chrome debugger connection interrupted the original tab. Normal exports completed in a fresh dedicated tab named `🏜️ Hypotenuse Rush exports` (ID `512277893`), without resubmitting either generation. That heavy tab was closed after inspection/download.

| Model | Original file | Original SHA-256 | Original size |
|---|---|---|---:|
| Sandstone arch | `hypotenuse-rush-sandstone-arch.glb` | `13f9b0d669f7062afd27b592ad65612f6270c342ea3e4d671a3b0a93fe40b04c` | 29,932,944 bytes |
| Runner helmet | `hypotenuse-rush-runner-helmet.glb` | `0206cc51809fbada27f18d3e6751422cc56ffe980b373c1d3f7b697a64c12188` | 30,063,848 bytes |

The initial million-face Blender decimation was canceled after it failed to finish in ten minutes under host load. `glTF Transform` CLI / meshoptimizer reduced the arch at ratio 0.035, error 0.015. A stronger helmet pass at ratio 0.008, error 0.05 precedes a small equipment decimation in Blender; see `tools/optimize-tripo.sh` and `tools/reduce-helmet.py`. No new model generation occurred during processing.

### Final arch inspection

- Bundled file: `public/models/sandstone-arch.glb`.
- SHA-256: `f28269ab05c8b7f6f43d8b0540e1f2c02b3f0945e47ef32b198d424d594799d5`.
- 1,897,224 bytes; 37,198 triangles; 32,588 vertices; one mesh and material.
- Three embedded JPEG textures preserve the generated base color, normal map and material maps. No external URI, extra decoder extension, skin or animation.
- Canonical generated bounds are about 0.972 × 0.978 × 0.374 units. Runtime normalization makes the arch 28 m wide before per-instance art scale, keeping proportions and positive scale. Arches sit beyond the measured course corridor, never supply collisions, and do not add dynamic shadow-map passes.
- Visual inspection in Tripo confirmed warm layered terracotta stone, deep arch opening, pale eroded edges, and coherent volume. Generated shallow lower slab remains part of decorative art.

### Target relationship

The two normal generations were already submitted when the latest image-first target arrived. The supplied target was then inspected, its matching canyon/equipment assets retained, and the procedural athlete revised to a charcoal-blue shirt, tan trousers and coral gear. No third generation was submitted. The target’s uncovered hair differs from the retained climbing helmet; the generated helmet is an intentional equipment difference. Final target-to-production comparison belongs in `docs/VISUAL_REVIEW.md`.

### Final helmet inspection

- Bundled file: `public/models/runner-helmet.glb`.
- SHA-256: `4ce0be697b74347a9dfb1937566c8c223140127984deb293789d9998c16a5a1b`.
- 642,388 bytes; 6,956 triangles; 5,497 vertices; one mesh/material; zero skins or clips.
- Three 1024×1024 embedded JPEG textures remain byte-for-byte identical to the normal export: 52,452 / 262,746 / 107,607 bytes. Base color, normal and metallic-roughness texture bindings remain present.
- The finishing pass merges coincident split vertices at tolerance 0.00001, removes degenerate edges at 0.0000001, recalculates face normals, applies a 0.06 decimation to the already smaller mesh and exports normal GLB. Blender 5.2.0 LTS, glTF Transform 4.5.1. No compressed geometry decoder is required.
- `python3 tools/inspect-glb.py` passed for both final assets: self-contained buffers/images, triangle indices, UVs/normals, sampled finite unit normals and JPEG dimensions <=1024. Exact output is `docs/ASSET_INSPECTION.json`.
- Both static assets have no skeleton or animation clips. Actual body articulation comes from the procedural athlete joints. The helmet moves rigidly with its head mount.

#!/usr/bin/env bash
# Reproduce ordinary GLB mesh reduction from the normal Tripo UI exports.
# Usage: bash tools/optimize-tripo.sh /path/to/arch.glb /path/to/helmet.glb
set -euo pipefail
if [ "$#" -ne 2 ]; then
  echo 'Supply the original arch GLB and helmet GLB exported from Tripo.' >&2
  exit 1
fi
rush_arch_source="$1"
rush_helmet_source="$2"
rush_repo_root="$(cd "$(dirname "$0")/.." && pwd)"
mkdir -p "$rush_repo_root/public/models"
npm exec --yes --package=@gltf-transform/cli@4.5.1 -- gltf-transform simplify "$rush_arch_source" "$rush_repo_root/public/models/sandstone-arch.glb" --ratio 0.035 --error 0.015
mkdir -p "$rush_repo_root/artifacts/asset-processing"
npm exec --yes --package=@gltf-transform/cli@4.5.1 -- gltf-transform simplify "$rush_helmet_source" "$rush_repo_root/artifacts/asset-processing/runner-helmet-strong.glb" --ratio 0.008 --error 0.05
rush_blender_bin="${RUSH_BLENDER_BIN:-/Applications/Blender.app/Contents/MacOS/Blender}"
"$rush_blender_bin" --background --threads 2 --python "$rush_repo_root/tools/reduce-helmet.py" -- "$rush_repo_root/artifacts/asset-processing/runner-helmet-strong.glb" "$rush_repo_root/public/models/runner-helmet.glb"

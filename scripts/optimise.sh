#!/bin/bash

# Optimizes all GLB 3D models in-place using gltf-transform.
# Compresses textures to WebP format to reduce file size.
#
# Prerequisites:
#   npm install -g @gltf-transform/cli
#
# Usage (run from the repo root):
#   ./scripts/optimise.sh

MODELS_DIR="frontend/public/models"

models=("floor" "cherryTree2" "cherryTree3" "cherryTree1" "floorDetails" "leftBuildingsNew" "rightBuildingsNew")

for model in "${models[@]}"; do
  echo "Optimizing ${model}.glb..."
  gltf-transform optimize "${MODELS_DIR}/${model}.glb" "${MODELS_DIR}/${model}.glb" --texture-compress webp
done

echo "All models optimized successfully!"

#!/bin/bash

# List of model names
# models=("cherryTree1" "cloudme" "floor" "leftBuildingsNew" "rightBuildingsNew")
models=("floor" "cherryTree2" "cherryTree3" "cherryTree1")

# Loop through each model and run the gltf-transform optimize command
for model in "${models[@]}"; do
  echo "Optimizing ${model}.glb..."
  gltf-transform optimize "public/models/${model}.glb" "public/models/${model}.glb" --texture-compress webp
done

echo "All models optimized successfully!"

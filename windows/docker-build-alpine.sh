#!/bin/bash

# 1. Build TypeScript and exclude Electron
echo "Building TypeScript..."
docker build -f windows/Dockerfile.builder -t trilium-builder .
docker run --rm -v "${PWD}:/output" trilium-builder

# 2. Build final Alpine image if requested
if [ "$1" = "build" ]; then
    echo "Building final Docker image..."
    docker build -f Dockerfile.alpine -t trilium-local .
    echo "Done! Run with: docker run -d --name trilium -p 8080:8080 trilium-local"
fi

#!/bin/bash
set -e

# Mission Control Docker Builder
# Usage: ./docker-build.sh [version] [registry]

VERSION=${1:-"1.0.0"}
REGISTRY=${2:-"ghcr.io/ustaaa"}
IMAGE_NAME="mission-control"
TAG="olares-v${VERSION}"

echo "=========================================="
echo "Building Mission Control Docker Image"
echo "Version: ${VERSION}"
echo "Registry: ${REGISTRY}"
echo "Tag: ${TAG}"
echo "=========================================="

# Check if Dockerfile exists
if [ ! -f "Dockerfile" ]; then
    echo "Error: Dockerfile not found in current directory"
    exit 1
fi

# Build the image
echo "[1/3] Building Docker image..."
docker build -t "${IMAGE_NAME}:${TAG}" .

# Tag with registry
echo "[2/3] Tagging image..."
docker tag "${IMAGE_NAME}:${TAG}" "${REGISTRY}/${IMAGE_NAME}:${TAG}"

# Push to registry (optional - requires login)
echo "[3/3] To push to registry, run:"
echo "docker push ${REGISTRY}/${IMAGE_NAME}:${TAG}"
echo ""
echo "Or save locally:"
echo "docker save ${IMAGE_NAME}:${TAG} | gzip > mission-control-${TAG}.tar.gz"

echo ""
echo "=========================================="
echo "Build Complete!"
echo "Image: ${IMAGE_NAME}:${TAG}"
echo "Tagged: ${REGISTRY}/${IMAGE_NAME}:${TAG}"
echo "=========================================="

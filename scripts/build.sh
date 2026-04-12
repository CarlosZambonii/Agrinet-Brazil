#!/usr/bin/env bash
set -euo pipefail

REGISTRY="caza6367"
SHA=$(git rev-parse --short HEAD)
VERSION=${1:-latest}

echo "==> Building agrinet-api (sha: $SHA, version: $VERSION)"
docker build \
  -f backend/Dockerfile \
  -t "$REGISTRY/agrinet-api:latest" \
  -t "$REGISTRY/agrinet-api:$VERSION" \
  -t "$REGISTRY/agrinet-api:$SHA" \
  backend

echo "==> Building agrinet-federation-sync (sha: $SHA, version: $VERSION)"
docker build \
  -f backend/Dockerfile.worker \
  -t "$REGISTRY/agrinet-federation-sync:latest" \
  -t "$REGISTRY/agrinet-federation-sync:$VERSION" \
  -t "$REGISTRY/agrinet-federation-sync:$SHA" \
  backend

echo "==> Build concluído"
echo "    Tags geradas: latest, $VERSION, $SHA"

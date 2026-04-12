#!/usr/bin/env bash
set -euo pipefail

REGISTRY="caza6367"
SHA=$(git rev-parse --short HEAD)
VERSION=${1:-latest}

echo "==> Push agrinet-api"
docker push "$REGISTRY/agrinet-api:latest"
docker push "$REGISTRY/agrinet-api:$VERSION"
docker push "$REGISTRY/agrinet-api:$SHA"

echo "==> Push agrinet-federation-sync"
docker push "$REGISTRY/agrinet-federation-sync:latest"
docker push "$REGISTRY/agrinet-federation-sync:$VERSION"
docker push "$REGISTRY/agrinet-federation-sync:$SHA"

echo "==> Push concluído"
echo "    Imagens disponíveis em:"
echo "    docker.io/$REGISTRY/agrinet-api:$SHA"
echo "    docker.io/$REGISTRY/agrinet-federation-sync:$SHA"

#!/usr/bin/env bash
# Rollback de despliegue TerraShare en el droplet.
# Uso: ./scripts/rollback.sh <TARGET_DIR> <BRANCH> [TAG]
#   TARGET_DIR  /opt/terrashare-prod | /opt/terrashare-staging
#   BRANCH      main | staging
#   TAG         opcional: tag deploy-good-* o deploy-pre-* (default: ultimo .last-good-deploy)

set -euo pipefail

TARGET_DIR="${1:?Falta TARGET_DIR}"
BRANCH="${2:?Falta BRANCH}"
TAG="${3:-}"

cd "$TARGET_DIR" || exit 1

if [ -z "$TAG" ] && [ -f .last-good-deploy ]; then
  TAG=$(cat .last-good-deploy)
fi

if [ -z "$TAG" ]; then
  TAG=$(git tag --list 'deploy-good-*' --sort=-creatordate | head -n1)
fi

if [ -z "$TAG" ]; then
  TAG=$(git tag --list 'deploy-pre-*' --sort=-creatordate | head -n1)
fi

if [ -z "$TAG" ]; then
  echo "No hay tags deploy-good-* ni deploy-pre-* para rollback."
  exit 1
fi

echo "Rollback a $TAG ..."
git checkout --detach "$TAG"
git reset --hard "$TAG"

docker compose up --build -d --remove-orphans
echo "Rollback completo. Estado: $TAG"

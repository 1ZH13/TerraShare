#!/usr/bin/env bash
# Bootstrap del reverse proxy nginx + certbot para TerraShare.
# Ejecutar una sola vez en el droplet despues del primer deploy.
#
# Uso:
#   ./scripts/deploy-proxy.sh
#
# Requisitos:
#   - Docker y Docker Compose instalados
#   - Los contenedores de prod/staging ya desplegados
#   - DNS apuntando a la IP del droplet

set -euo pipefail

PROXY_DIR="/opt/terrashare-proxy"
REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "=== TerraShare Proxy Bootstrap ==="

# 1. Crear red compartida
echo "[1/4] Creando red compartida terrashare-network ..."
docker network create terrashare-network 2>/dev/null || echo "  (ya existe)"

# 2. Copiar archivos del proxy al directorio de produccion
echo "[2/4] Copiando archivos del proxy a ${PROXY_DIR} ..."
mkdir -p "${PROXY_DIR}/nginx"
cp "${REPO_DIR}/docker-compose.proxy.yml" "${PROXY_DIR}/docker-compose.yml"
mkdir -p "${PROXY_DIR}/nginx/conf.d"
cp "${REPO_DIR}/nginx/conf.d/default.conf" "${PROXY_DIR}/nginx/conf.d/default.conf"

# 3. Levantar proxy en modo HTTP (sin SSL aun)
echo "[3/4] Levantando proxy (HTTP) ..."
cd "${PROXY_DIR}"
docker compose up -d

# 4. Obtener certificados SSL con Let's Encrypt
echo "[4/4] Obteniendo certificados SSL ..."
echo ""
echo "  Ejecuta manualmente para cada dominio:"
echo "    docker compose run --rm certbot certonly --webroot \\"
echo "      --webroot-path=/var/www/certbot \\"
echo "      -d terrashare.duckdns.org -d success.terrashare.duckdns.org \\"
echo "      --email admin@terrashare.duckdns.org --agree-tos --no-eff-email"
echo ""
echo "    docker compose run --rm certbot certonly --webroot \\"
echo "      --webroot-path=/var/www/certbot \\"
echo "      -d terrashare-test.duckdns.org -d success.terrashare-test.duckdns.org \\"
echo "      --email admin@terrashare.duckdns.org --agree-tos --no-eff-email"
echo ""
echo "  Despues de obtener los certs, recarga nginx:"
echo "    docker compose exec proxy nginx -s reload"
echo ""
echo "=== Proxy bootstrap completado ==="

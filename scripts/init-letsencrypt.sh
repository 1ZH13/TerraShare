#!/usr/bin/env bash
# Bootstrap idempotente de SSL (Let's Encrypt) para el reverse proxy.
#
# Resuelve el problema del huevo-y-la-gallina: nginx necesita certs para
# arrancar el bloque `listen 443 ssl`, pero certbot necesita nginx (puerto 80 +
# webroot) para emitir los certs. Solución estándar:
#   1) crear certs "dummy" autofirmados en las rutas esperadas → nginx arranca
#   2) levantar el proxy
#   3) borrar los dummy y pedir los certs reales a Let's Encrypt (webroot)
#   4) recargar nginx
#
# Es idempotente: si ya hay un cert REAL para un dominio, no hace nada con él.
# Se ejecuta desde el directorio del deploy (con docker-compose.yml +
# docker-compose.prod.yml). No es fatal para el resto del deploy.
#
# Variables:
#   CERTBOT_EMAIL   email para avisos de expiración (default: admin@<dominio>)
#   CERTBOT_STAGING "1" para usar el entorno de staging de Let's Encrypt
#                   (certs no confiables, sin rate limits) — útil para probar.
set -uo pipefail

COMPOSE="docker compose -f docker-compose.yml -f docker-compose.prod.yml"
EMAIL="${CERTBOT_EMAIL:-admin@terrashare.duckdns.org}"
STAGING_FLAG=""
[ "${CERTBOT_STAGING:-0}" = "1" ] && STAGING_FLAG="--staging"

# Grupos de certificados: <cert-name>=<dominio1>[,<dominio2>...]
# El primer dominio da nombre a la carpeta /etc/letsencrypt/live/<name>/.
CERT_GROUPS=(
  "terrashare.duckdns.org=terrashare.duckdns.org,success.terrashare.duckdns.org"
  "terrashare-test.duckdns.org=terrashare-test.duckdns.org,success.terrashare-test.duckdns.org"
)

cert_exists() {
  # ¿Existe ya un cert REAL (no dummy) para el grupo <name>?
  $COMPOSE run --rm --entrypoint \
    "sh -c 'test -f /etc/letsencrypt/live/$1/fullchain.pem && ! test -f /etc/letsencrypt/live/$1/.dummy'" \
    certbot >/dev/null 2>&1
}

make_dummy() {
  # Cert autofirmado temporal para que nginx pueda arrancar el bloque 443.
  local name="$1"
  echo "  [dummy] creando cert temporal para $name"
  $COMPOSE run --rm --entrypoint \
    "sh -c 'mkdir -p /etc/letsencrypt/live/$name && \
      openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
        -keyout /etc/letsencrypt/live/$name/privkey.pem \
        -out /etc/letsencrypt/live/$name/fullchain.pem \
        -subj \"/CN=localhost\" && \
      touch /etc/letsencrypt/live/$name/.dummy'" \
    certbot
}

issue_real() {
  local name="$1" domains="$2"
  local args=""
  IFS=',' read -ra DS <<< "$domains"
  for d in "${DS[@]}"; do args="$args -d $d"; done
  echo "  [certbot] borrando dummy y emitiendo cert real para $name ($domains)"
  # Borra el dummy para que certbot no lo confunda con un cert válido.
  $COMPOSE run --rm --entrypoint \
    "sh -c 'rm -rf /etc/letsencrypt/live/$name /etc/letsencrypt/archive/$name /etc/letsencrypt/renewal/$name.conf'" \
    certbot >/dev/null 2>&1 || true
  # shellcheck disable=SC2086
  $COMPOSE run --rm certbot certonly --webroot -w /var/www/certbot \
    $STAGING_FLAG --email "$EMAIL" --agree-tos --no-eff-email \
    --non-interactive --keep-until-expiring $args
}

echo "=== init-letsencrypt: asegurando certificados SSL ==="

# 1) Asegura que exista algo (dummy o real) para CADA grupo, así nginx arranca.
NEED_ISSUE=()
for group in "${CERT_GROUPS[@]}"; do
  name="${group%%=*}"; domains="${group#*=}"
  if cert_exists "$name"; then
    echo "  [ok] cert real ya existe para $name"
  else
    make_dummy "$name"
    NEED_ISSUE+=("$group")
  fi
done

# 2) Levanta/recarga el proxy (ahora los certs -aunque dummy- existen).
echo "  [proxy] levantando reverse proxy ..."
$COMPOSE up -d proxy

# 3) Emite los certs reales que falten (usa el ACME challenge por webroot).
for group in "${NEED_ISSUE[@]}"; do
  name="${group%%=*}"; domains="${group#*=}"
  if issue_real "$name" "$domains"; then
    echo "  [ok] cert real emitido para $name"
  else
    echo "  [WARN] no se pudo emitir cert real para $name (queda el dummy; el sitio sirve por HTTP)."
  fi
done

# 4) Recarga nginx para tomar los certs reales.
echo "  [proxy] recargando nginx ..."
$COMPOSE exec -T proxy nginx -s reload 2>/dev/null || $COMPOSE restart proxy

echo "=== init-letsencrypt: completado ==="

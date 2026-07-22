#!/usr/bin/env bash
# Descarga las fotos de demostración desde Unsplash (#381).
#
# Las imágenes se COMMITEAN al repositorio; este script solo existe para
# documentar de dónde salió cada una y poder rehacerlas si hiciera falta. Ni el
# seed ni el arranque de la web tocan la red.
#
# Licencia Unsplash: uso libre, también comercial, sin permiso previo. La
# atribución no es obligatoria pero se recoge en los CREDITS.md de cada carpeta.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LANDS="$ROOT/apps/backend-api/assets/lands"
WEB="$ROOT/apps/web/public/img"
mkdir -p "$LANDS" "$WEB"

# nombre|id de unsplash. El prefijo del nombre es el uso del terreno: el seed
# reparte las fotos según lo que cada terreno declara, para que un potrero no
# salga ilustrado con un estanque.
LAND_PHOTOS="
ganaderia-1|photo-1641939193329-7071068dc40f
ganaderia-2|photo-1620969681783-414716fc5a28
ganaderia-3|photo-1694098682302-8ec393590ffb
ganaderia-4|photo-1554839465-be8f7c6786b5
agricultura-1|photo-1500382017468-9049fed747ef
agricultura-2|photo-1625246333195-78d9c38ad449
agricultura-3|photo-1754446763099-75a557d6dafc
agricultura-4|photo-1765052293637-1dced17e0095
forestal-1|photo-1698764700248-c3798485f6f5
forestal-2|photo-1609554259885-d5a52e01e83d
forestal-3|photo-1616163136837-c4eb9310b0df
acuicultura-1|photo-1666717923045-89f764b902f7
acuicultura-2|photo-1652677692579-473ce3444388
mixto-1|photo-1782061036161-16a4b6bc0b57
mixto-2|photo-1451440063999-77a8b2960d2b
mixto-3|photo-1561602535-7f155201c950
"

echo "→ fotos de terreno (900 px, calidad 58)"
echo "$LAND_PHOTOS" | while IFS='|' read -r name id; do
  [ -z "$name" ] && continue
  curl -sS --fail --max-time 60 \
    -o "$LANDS/$name.jpg" \
    "https://images.unsplash.com/$id?w=900&q=58&fm=jpg&fit=max"
  echo "   $name.jpg"
done

# El hero se recorta a un rectángulo alto (~514×548 css, el doble en pantallas
# densas), así que se pide más ancho que las de terreno.
echo "→ hero del landing (1400 px, calidad 72)"
curl -sS --fail --max-time 60 \
  -o "$WEB/landing-hero.jpg" \
  "https://images.unsplash.com/photo-1560493676-04071c5f467b?w=1400&q=72&fm=jpg&fit=max"
echo "   landing-hero.jpg"

echo "listo."

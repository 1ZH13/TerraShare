# Fotos de terreno del seed de demostración

Fotografías usadas por `bun run seed:demo` para que los terrenos de prueba
tengan portada real (#381).

## Licencia

Todas provienen de **[Unsplash](https://unsplash.com)** bajo la
[Licencia Unsplash](https://unsplash.com/license): uso gratuito, también
comercial, sin permiso previo. La atribución no es obligatoria, pero se recoge
aquí de todos modos.

## Cómo se obtuvieron

`scripts/fetch-demo-photos.sh` en la raíz del repositorio, a 900 px de ancho y
calidad 58. Las imágenes están **commiteadas**: ni el seed ni las pruebas ni el
arranque de la aplicación tocan la red. El script solo existe para documentar el
origen y poder rehacerlas.

## Convención de nombres

`<uso>-<n>.jpg`. El prefijo no es decorativo: `seed-photo.ts` indexa el
directorio por él y reparte a cada terreno fotos del uso que declara, para que
un potrero no acabe ilustrado con un estanque. Añadir una foto es dejar el
archivo con el prefijo correcto — no hay ninguna lista que actualizar.

## Origen de cada archivo

| Archivo | Foto en Unsplash | Descripción |
|---|---|---|
| `ganaderia-1.jpg` | `photo-1641939193329-7071068dc40f` | vacas pastando en campo verde |
| `ganaderia-2.jpg` | `photo-1620969681783-414716fc5a28` | vaca parda sobre pasto |
| `ganaderia-3.jpg` | `photo-1694098682302-8ec393590ffb` | hato en una ladera verde |
| `ganaderia-4.jpg` | `photo-1554839465-be8f7c6786b5` | vaca blanca en campo verde |
| `agricultura-1.jpg` | `photo-1500382017468-9049fed747ef` | campo arado junto a un árbol |
| `agricultura-2.jpg` | `photo-1625246333195-78d9c38ad449` | plántula sobre tierra |
| `agricultura-3.jpg` | `photo-1754446763099-75a557d6dafc` | arrozales en un valle |
| `agricultura-4.jpg` | `photo-1765052293637-1dced17e0095` | piñal en ladera soleada |
| `forestal-1.jpg` | `photo-1698764700248-c3798485f6f5` | bosque verde cerrado |
| `forestal-2.jpg` | `photo-1609554259885-d5a52e01e83d` | arboleda tropical |
| `forestal-3.jpg` | `photo-1616163136837-c4eb9310b0df` | árboles sobre pasto |
| `acuicultura-1.jpg` | `photo-1666717923045-89f764b902f7` | cuerpo de agua rodeado de árboles |
| `acuicultura-2.jpg` | `photo-1652677692579-473ce3444388` | valle con un río |
| `mixto-1.jpg` | `photo-1782061036161-16a4b6bc0b57` | campo abierto con montaña al fondo |
| `mixto-2.jpg` | `photo-1451440063999-77a8b2960d2b` | camino entre cercas de madera |
| `mixto-3.jpg` | `photo-1561602535-7f155201c950` | terreno verde bajo cielo azul |

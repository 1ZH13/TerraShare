# Sistema de diseño — TerraShare (estilo editorial)

Dirección visual **oficial** del rediseño. Referencia viva: **`design/prototipo-editorial.html`**
(prototipo navegable de las 26 pantallas en este estilo). Este documento captura los tokens
para implementarlo en React (issue #134).

Estilo: editorial y cálido — papel crema, verde bosque, acento terracota, con serif elegante
para títulos y sans legible para la interfaz. Mucho aire, tipografía grande, bordes suaves.

## Tipografía
| Rol | Fuente | Uso |
|-----|--------|-----|
| Títulos / display | **Spectral** (serif) | h1–h3, precios, nombres de terreno, saludos |
| Cuerpo / UI | **Hanken Grotesk** (sans) | párrafos, labels, botones, tablas, navegación |
| Mono | monospace | referencias/IDs (`pay_a1b2c3`) |

Cargar de Google Fonts:
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Spectral:wght@400;500&family=Hanken+Grotesk:wght@400;500;600&display=swap" rel="stylesheet">
```

Escala (aprox. del prototipo): hero 74px · h1 40–52px · h2 26–42px · cuerpo 15–16px.
Pesos: 400 y 500 (títulos), 400/500/600 (UI). Tracking negativo en títulos (`letter-spacing: -.02em`).

## Paleta
```css
:root {
  /* superficies (papel) */
  --bg:            #f4efe4;  /* fondo de página (crema) */
  --surface:       #fffdf8;  /* tarjetas / paneles */
  --surface-alt:   #fbf7ee;  /* bloques alternos */
  --paper-tint:    #f7f2e7;

  /* marca (verde) */
  --green:         #2f5138;  /* primario: botones, activo, marca */
  --green-ink:     #24312a;  /* verde muy oscuro: sidebar admin, tinta fuerte */
  --green-soft:    #55654f;
  --sage:          #8a9784;  /* verde-gris apagado */
  --sage-2:        #7c8a76;
  --sage-3:        #a0ad98;

  /* tintes claros (chips, éxito, hover) */
  --tint-green:    #eef2e6;
  --tint-green-2:  #e7efe0;
  --tint-green-3:  #c9d3c4;

  /* acento */
  --clay:          #b8623f;  /* terracota: acentos, badges, punto de notificación */

  /* neutros cálidos */
  --border:        #e6ddc9;  /* bordes/hairlines */
  --beige:         #ece2cd;
  --beige-2:       #e0dbcb;

  /* texto */
  --text:          #24312a;  /* principal */
  --text-secondary:#55654f;
  --text-muted:    #8a9784;
}
```

### Roles
- **Fondo de app:** `--bg` (crema). Nunca blanco puro; el blanco cálido `--surface` es solo para tarjetas.
- **Primario / CTA:** relleno `--green` con texto crema. Un solo primario por vista.
- **Sidebar admin:** fondo `--green-ink` con texto crema/sage.
- **Acento terracota `--clay`:** úsalo con moderación (badges de estado activo, punto de "no leído", detalles), no como color de acción general.
- **Bordes:** `--border` a 1px, suaves.
- **Texto sobre tinte:** usar el verde oscuro de la misma familia, nunca negro puro.

## Componentes (del prototipo)
- **Botones:** radio ~10–12px, primario verde sólido; secundario con borde `--border` sobre papel.
- **Tarjetas:** `--surface`, borde `--border`, radio 14–18px, sombra nula o mínima.
- **Chips / badges:** pastilla con tinte de su familia (verde para publicada/aprobada, terracota/beige para pendiente, etc.).
- **Navbar usuario:** papel, con el switch **Busco / Ofrezco** y menú de usuario (incluye cerrar sesión).
- **Sidebar admin:** verde oscuro, ítem activo resaltado en papel.
- **Stepper (wizard):** barra de progreso verde + etiquetas Datos / Ubicación / Precio / Fotos.
- **Animaciones:** entrada `fadeUp` suave; respetar `prefers-reduced-motion`.

## Cómo aplicarlo en React (issue #134)
1. Definir estos tokens como variables CSS globales (light; opcional dark más adelante).
2. Cargar Spectral + Hanken Grotesk.
3. Construir primitivos: `Button`, `Card`, `Badge`, `Field`, `Stepper`, `Navbar`, `Sidebar`.
4. Implementar pantalla por pantalla siguiendo `prototipo-editorial.html` como fuente visual y
   las maquetas por-pantalla (`01`–`28`) como referencia de contenido/flujo.

## Nota
Las maquetas estáticas `01`–`28` mantienen el detalle de contenido y flujo de cada pantalla;
`prototipo-editorial.html` es la **fuente de verdad visual** (estilo, tipografía, color).

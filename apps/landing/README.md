# landing

Modulo de landing publica de TerraShare.

## Alcance actual (issue #1)
- Hero funcional con propuesta de valor.
- CTA operacional con captura de correo para acceso a registro/login.
- Navegacion basica para explorar catalogo y vista previa de mapa.
- Catalogo publico de terrenos en modo invitado con filtro por uso.
- SEO basico (`title` y `meta description`).

## Stack del modulo
- React 18
- Vite 5

## Comandos
Desde esta carpeta:

```bash
bun install
bun run dev
bun run build
bun run preview
bun run test:e2e
bun run test:e2e:ui
```

Antes de ejecutar E2E por primera vez:

```bash
bunx playwright install chromium
```

## Configuracion de CTA
La landing redirige los CTAs de registro/login al modulo `app-web`.

1. Copia `.env.example` a `.env`.
2. Ajusta `VITE_APP_WEB_URL` segun el host de `app-web`.

Ejemplo:

```bash
VITE_APP_WEB_URL=http://localhost:5174
```

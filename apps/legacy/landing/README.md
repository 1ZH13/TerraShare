# landing

Modulo de landing publica de TerraShare.

## Alcance actual (issue #6)
- Hero funcional con propuesta de valor y metricas de credibilidad.
- CTA operacional con captura de correo que se registra en backend (`POST /api/v1/leads`).
- Navegacion basica para explorar catalogo y vista previa de mapa.
- Catalogo publico de terrenos en modo invitado con filtro por uso.
- Seccion "Como funciona" con flujo de 4 pasos (publica → explora → solicita → cierra).
- Seccion "Por que TerraShare" con 4 diferenciadores y social proof.
- Footer completo con links de navegacion, legal y copyright.
- SEO completo: `title`, `meta description`, Open Graph y Twitter Card tags.
- Responsive design con adaptacion para pantallas pequenas.

## Rutas agregadas en landing

| Ruta | Descripcion |
|------|-------------|
| `/api/v1/leads` (backend) | Endpoint que recibe POST con `{email, source}` y almacena lead en MongoDB (in-memory DB para MVP). `GET /api/v1/leads` para listar leads registrados. |

## Variables de entorno

1. Copia `.env.example` a `.env`.
2. Ajusta las variables segun el entorno:

```bash
VITE_APP_WEB_URL=http://localhost:5174   # app-web (registro/login)
VITE_API_BASE_URL=http://localhost:3000  # backend-api (captura de leads)
```

## Flujo de CTA de leads

1. Usuario llena el form de contacto en la landing.
2. La app llama a `POST {VITE_API_BASE_URL}/api/v1/leads` con `{email, source: "landing"}`.
3. El backend valida el email, detecta duplicados (devuelve 409) y almacena el lead.
4. El admin-dashboard puede ver los leads via `GET /api/v1/leads` (futuro: conectarlo al panel admin).

## Stack del modulo
- React 18
- Vite 5
- CSS vanilla con variables y animaciones

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

## Integracion entre modulos

- La landing consume `backend-api` unicamente para la captura de leads.
- El contrato funcional de navegacion y datos esta documentado en:
  `docs/MODULE_INTEGRATION_CONTRACTS.md`
- Cuando `app-web` migre de mock a API real, la landing no requiere cambios
  mientras se mantengan rutas de `register` y `login`.
- Los leads visibles en admin-dashboard (issue futuro).

## Dependencias externas

- Google Fonts: DM Sans y Sora (via CDN en `index.html`)
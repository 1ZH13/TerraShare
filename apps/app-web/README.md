# app-web

Aplicacion principal para propietarios y arrendatarios.

## Estado actual

- Catalogo funcional con filtros por tipo, ubicacion, precio y fecha.
- Flujo completo de solicitud de alquiler (arrendatario).
- Bandeja de propietario con acciones de aprobar/rechazar.
- Seguimiento de estado de solicitudes por arrendatario.
- Implementacion en modo mock para avanzar frontend sin bloquear backend.
- Adopcion de tipos compartidos desde `@terrashare/shared` (issue #5).

## Estructura de contratos (issue #5)

Los DTOs y enums canonicos vienen de `packages/shared`:

```
LandDto         → campos compartidos para terrenos
RentalRequestDto → campos compartidos para solicitudes
```

Traduccion de campos internos (mock → shared):

| Campo UI | Campo shared |
|---|---|
| `name` | `title` |
| `type` | `allowedUses[0]` |
| `monthlyPrice` | `priceRule.pricePerMonth` |
| `areaHectares` | `area` |
| `startDate/endDate` | `period.startDate/endDate` |

Archivo de adapters: `src/services/fieldAdapters.js`

## Rutas actuales

| Ruta | Descripcion |
|---|---|
| `/` | Catalogo de terrenos |
| `/lands/:landId` | Detalle de terreno |
| `/login` | Inicio de sesion |
| `/register` | Registro de cuenta (tenant) |
| `/reserve/:landId` | Crear solicitud de alquiler |
| `/my-requests` | Seguimiento de solicitudes |
| `/owner/requests` | Bandeja de propietario |

## Cuentas semilla (modo mock)

- Arrendatario: `tenant@terrashare.test` / `123456`
- Propietario: `owner@terrashare.test` / `123456`

## Variables de entorno

Copiar `.env.example` a `.env`.

```bash
VITE_API_BASE_URL=http://localhost:3000
```

Nota: `VITE_API_BASE_URL` queda preparado para migracion a API real.

## Comandos

```bash
bun install
bun run dev
bun run build
bun run preview
bun run test:e2e
bun run test:e2e:ui
```

Antes del primer E2E local:

```bash
bunx playwright install chromium
```

## Testing y CI

- E2E smoke: `tests/e2e/appweb.smoke.spec.js`
- Config Playwright: `playwright.config.js`
- Workflow CI: `.github/workflows/app-web-e2e.yml`
- CI corre typecheck de `packages/shared` antes del build (issue #5).

## Integracion con otros modulos

- Landing redirige a esta app via `VITE_APP_WEB_URL`.
- Contrato cross-module: `docs/MODULE_INTEGRATION_CONTRACTS.md`
- Tipos compartidos: `packages/shared/`
- Endpoints backend: `apps/backend-api/docs/API_ENDPOINTS.md`

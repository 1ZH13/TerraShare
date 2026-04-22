# app-web

Aplicacion principal para propietarios y arrendatarios.

## Estado actual

- Catalogo funcional con filtros por tipo, ubicacion, precio y fecha.
- Flujo completo de solicitud de alquiler (arrendatario).
- Bandeja de propietario con acciones de aprobar/rechazar.
- Seguimiento de estado de solicitudes por arrendatario.
- **Conectado a API real de backend-api** (issue #7) — ya no usa modo mock para datos.
- Adopcion de tipos compartidos desde `@terrashare/shared` (issue #5).

## Arquitectura de datos (issue #7)

El app-web consume directamente los endpoints de `backend-api`:

```
CatalogPage  → GET  /api/v1/lands                  (listado con filtros)
LandDetail   → GET  /api/v1/lands/:landId          (detalle)
ReservePage  → POST /api/v1/rental-requests        (crear solicitud)
MyRequests   → GET  /api/v1/rental-requests?tenantId=X
OwnerPage    → GET  /api/v1/rental-requests?ownerId=X
OwnerPage    → PATCH /api/v1/rental-requests/:id/status (approve/reject)
```

**Auth:** `Authorization: Bearer <clerk_token>` — el token se inyecta automaticamente via `setTokenFn()` desde el efecto de Clerk en `App()`.

**Adaptadores:** `src/services/api.js` traduce los registros del backend al formato que espera el UI:

| Campo backend | Campo UI |
|---|---|
| `priceRule.pricePerMonth` | `monthlyPrice` |
| `location.province/district` | `province/district` |
| `area` | `areaHectares` |
| `allowedUses[0]` | `type` |
| `availability.availableFrom/availableTo` | `availableFrom/availableTo` |
| `period.startDate/endDate` | `startDate/endDate` |

Los estados de solicitud usan strings puros (`pending_owner`, `approved`, `rejected`, `cancelled`, `pending_payment`, `paid`) segun el contrato de `backend-api`.

## Estructura de contratos (issue #5)

Los DTOs y enums canonicos vienen de `packages/shared`:

```
LandDto         → campos compartidos para terrenos
RentalRequestDto → campos compartidos para solicitudes
```

Archivo de adapters: `src/services/api.js` (funciones `adaptLand`, `adaptRentalRequest`).

## Rutas actuales

| Ruta | Descripcion |
|---|---|
| `/` | Catalogo de terrenos |
| `/lands/:landId` | Detalle de terreno |
| `/login` | Inicio de sesion (Clerk) |
| `/register` | Registro de cuenta (Clerk) |
| `/reserve/:landId` | Crear solicitud de alquiler |
| `/my-requests` | Seguimiento de solicitudes |
| `/owner/requests` | Bandeja de propietario |

## Variables de entorno

```bash
VITE_API_BASE_URL=http://localhost:3000
```

El backend debe estar corriendo para que la app funcione. Para desarrollo local, inicia `backend-api` en puerto 3000.

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

- E2E smoke: `tests/e2e/appweb.smoke.spec.js` — los tests E2E siguen usando `mockApi.js` en modo standalone (no requiere backend).
- Config Playwright: `playwright.config.js`
- Workflow CI: `.github/workflows/app-web-e2e.yml`

## Integracion con otros modulos

- Landing redirige a esta app via `VITE_APP_WEB_URL`.
- Contrato cross-module: `docs/MODULE_INTEGRATION_CONTRACTS.md`
- Tipos compartidos: `packages/shared/`
- Endpoints backend: `apps/backend-api/docs/API_ENDPOINTS.md`
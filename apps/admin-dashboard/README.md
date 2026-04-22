# admin-dashboard

Panel administrativo de TerraShare.

Responsabilidades iniciales:
- Moderacion de publicaciones
- Gestion de usuarios
- Revision de reportes
- Auditoria basica

## Estado actual
- Implementacion fase 1 completada para acceso admin y operaciones base.
- UI React + Vite con rutas de login, acceso denegado y dashboard protegido.
- Integracion activa con backend-api para sesion, RBAC, moderacion y gestion de usuarios.
- Tabla de auditoria conectada a eventos reales del backend.

## Dependencias esperadas
- Consume `backend-api` para autenticacion y RBAC.
- Reutiliza contratos definidos en `apps/backend-api/docs/API_ENDPOINTS.md`.
- Mantiene alineacion con `docs/MODULE_INTEGRATION_CONTRACTS.md`.

## Reutilizacion recomendada
- Mantener los mismos estados de solicitud (`draft`, `pending_owner`, `approved`,
	`rejected`, `cancelled`) para vistas admin.
- Reusar DTOs cuando se publiquen en `packages/shared`.

## Endpoints consumidos
- `GET /api/v1/auth/me`
- `GET /api/v1/auth/admin/ping`
- `GET /api/v1/admin/lands/pending`
- `PATCH /api/v1/admin/lands/:landId/moderate`
- `GET /api/v1/admin/users`
- `PATCH /api/v1/admin/users/:userId/status`
- `GET /api/v1/audit-events`

## Variables de entorno
Copiar `.env.example` a `.env`.

- `VITE_API_BASE_URL=`
  - Opcional. Si se deja vacio, el frontend usa `/api` y proxy local de Vite.
- `VITE_API_PROXY_TARGET=http://127.0.0.1:3000`
  - Target para proxy en desarrollo.

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

Antes de correr E2E local por primera vez:

```bash
bunx playwright install chromium
```

## Testing y CI
- E2E smoke: `tests/e2e/admin.smoke.spec.js`
- Config Playwright: `playwright.config.js`
- Workflow CI: `.github/workflows/admin-dashboard-e2e.yml`

## Alcance de esta entrega
- Incluye: acceso admin seguro, guardas de rutas y acciones reales de aprobar/rechazar publicaciones y suspender/reactivar usuarios.
- Incluye: lectura de auditoria para seguimiento de decisiones admin.
- No incluye aun: filtros avanzados, paginacion server-side y reporteria historica extendida.

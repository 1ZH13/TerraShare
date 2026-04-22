# backend-api

API principal de TerraShare usando Bun + Hono.

## Estado del modulo
- Estado actual: contrato de API documentado para alineacion Frontend/Backend.
- Implementacion de endpoints:
  - Auth: `GET /api/v1/auth/me`, `GET /api/v1/auth/admin/ping` (implementado #23)
  - Lands: CRUD completo con filtros/paginacion/ownership (implementado #24)
  - Rental Requests: flujo de estados completo (implementado #25)
  - Contracts y auditoria: modulo contratos + audit trail (implementado #26)
  - Payments: checkout/list/detail/webhook (implementado #27)
  - Chat: chats, mensajes y contacto externo (implementado #28)
  - Admin dashboard: moderacion y usuarios (implementado #21/#22 base)
- Fuente de verdad para integracion frontend: archivos dentro de `docs/`.

## Objetivo funcional (v1)

- Auth y RBAC base.
- CRUD de terrenos y filtros.
- Solicitudes de alquiler y flujo de estados.
- Contratos y auditoria basica.
- Pagos con Stripe Checkout Session.
- Chat interno y contacto externo.

## Auth y autorizacion

- Proveedor de identidad: Clerk.
- Providers habilitados: Google OAuth, Microsoft OAuth y OTP por email.
- El frontend hace sign-in/sign-up en Clerk.
- El backend valida `Authorization: Bearer <token>` emitido por Clerk.
- Roles iniciales de aplicacion: `user` y `admin`.

Integracion actual:
- `admin-dashboard` consume `GET /api/v1/auth/me` para contexto de sesion.
- `admin-dashboard` consume `GET /api/v1/auth/admin/ping` para validar RBAC admin.
- `admin-dashboard` consume `GET /api/v1/admin/lands/pending` para cola de moderacion.
- `admin-dashboard` consume `PATCH /api/v1/admin/lands/:landId/moderate` para aprobar/rechazar.
- `admin-dashboard` consume `GET /api/v1/admin/users` y `PATCH /api/v1/admin/users/:userId/status`.
- `admin-dashboard` consume `GET /api/v1/audit-events` para trazabilidad.

Importante para frontend:
- En fase 1 no hay endpoint propio `POST /auth/login` en backend.
- El endpoint de sesion de aplicacion es `GET /api/v1/auth/me`.

## Operaciones admin (implementadas)

- `GET /api/v1/admin/lands/pending`
- `PATCH /api/v1/admin/lands/:landId/moderate`
- `GET /api/v1/admin/users`
- `PATCH /api/v1/admin/users/:userId/status`

Reglas de negocio admin:
1. Solo admin puede operar estas rutas.
2. Solo publicaciones en `draft` pueden moderarse.
3. Admin no puede bloquear otros usuarios con rol admin.

## Contratos de API

- Endpoints y estado: [docs/API_ENDPOINTS.md](docs/API_ENDPOINTS.md)
- Guia de integracion: [docs/INTEGRATION.md](docs/INTEGRATION.md)
- Contrato cross-module: `docs/MODULE_INTEGRATION_CONTRACTS.md`

## Reglas de integracion con frontend

Rutas minimas para paridad con app-web (issue #5):
- `POST /api/v1/rental-requests`
- `GET /api/v1/rental-requests` (lista propia del tenant)
- `PATCH /api/v1/rental-requests/:requestId/status`

Reglas de negocio para solicitudes:
1. Solo propietario del terreno puede aprobar o rechazar.
2. Solo solicitudes `pending_owner` pueden pasar a `approved` o `rejected`.
3. No se puede aprobar si existe solapamiento con otra aprobada del mismo terreno.

## Pagos (fase 1)

- Proveedor: Stripe Checkout Session.
- Fuente de verdad: webhook `POST /api/v1/webhooks/stripe`.
- No usar `success_url` como confirmacion final.

## Variables de entorno esperadas (referencia)
- `API_PORT`
- `API_BASE_URL`
- `MONGODB_URI`
- `CLERK_JWKS_URL`
- `CLERK_ISSUER`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `WHATSAPP_CONTACT_ENABLED=true|false`
- `ALLOW_DEV_AUTH_BYPASS=true|false` (tests/local)

## Comandos

```bash
bun install
bun run dev
bun run typecheck
bun run test
```

## Testing

- Unit/route tests con Bun (`src/routes/*.test.ts`).
- Helpers de tests HTTP en `src/lib/http-test-utils.ts`.
- Setup de entorno de test en `src/setup-test-env.ts`.

## Versionado

- Prefijo de API: `/api/v1`.
- Cambios breaking deben crear nueva version o estrategia de compatibilidad.

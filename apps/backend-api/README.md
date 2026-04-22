# backend-api

API principal de TerraShare usando Bun + Hono.

## Estado del modulo
- Estado actual: contrato de API documentado para alineacion Frontend/Backend.
- Implementacion de endpoints:
  - Auth: `GET /api/v1/auth/me`, `GET /api/v1/auth/admin/ping` (implementado #23)
  - Lands: CRUD completo con filtros/paginacion/ownership (implementado #24)
  - Rental Requests: flujo de estados completo (implementado #25)
  - Contracts y auditoria: modulo contratos + audit trail (implementado #26)
  - Payments: Stripe Checkout Session + webhook (implementado #27)
  - Chat: mensajeria interna + contacto externo (implementado #28)
  - Leads: captura de emails desde landing (implementado #6)
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
- El endpoint de sesion de aplicacion es `GET /api/v1/auth/me`.
- En fase 1 no hay endpoint propio `POST /auth/login` en backend.

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

## Leads (captura desde landing)

- `POST /api/v1/leads` — Registra un lead con email y source (`landing`|`app-web`|`admin-dashboard`).
  - Validacion de formato de email.
  - Deteccion de duplicados (responde 409 si el email ya existe).
  - Respuesta: `{ok: true, data: {id, email, createdAt}}` con status 201.
- `GET /api/v1/leads` — Lista todos los leads ordenados por fecha de creacion (mas reciente primero).
  - Respuesta: `{ok: true, data: {leads: [...], total: N}}`.
- Almacenamiento: in-memory store (MongoDB en fase de produccion).
- consumido por: `apps/landing` (formulario CTA), futuro: `apps/admin-dashboard` para visualizacion.

## Pagos (fase 1)

- Proveedor: Stripe Checkout Session.
- Fuente de verdad: webhook `POST /api/v1/webhooks/stripe`.
- No usar `success_url` como confirmacion final.

## Variables de entorno

Copiar `.env.example` a `.env`. Referencia:

```bash
API_PORT=3000
API_BASE_URL=http://localhost:3000
MONGODB_URI=mongodb://127.0.0.1:27017
CLERK_SECRET_KEY=...
CLERK_JWKS_URL=...
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
WHATSAPP_CONTACT_ENABLED=true|false
```

## Comandos

```bash
bun install
bun run dev
bun run build
bun run test  # unit tests del store y routes
```

## Testing y CI

- Unit tests: beside their respective source files (`*.test.ts`).
- smoke tests de API: `src/routes/lands.test.ts`
- Workflow CI: corre en cada push a `main`.

## Versionado

- Prefijo de API: `/api/v1`.
- Cambios breaking deben crear nueva version o estrategia de compatibilidad.

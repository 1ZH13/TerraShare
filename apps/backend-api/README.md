# backend-api

API principal de TerraShare usando Bun + Hono.

## Estado del modulo
- Estado actual: contrato de API documentado para alineacion Frontend/Backend.
- Implementacion de endpoints:
  - Auth: `GET /api/v1/auth/me`, `GET /api/v1/auth/admin/ping` (implementado #23)
  - Lands: CRUD completo con filtros/paginacion/ownership (implementado #24)
  - remaining: rental-requests, contracts, payments, chat (en progreso)
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

Importante para frontend:
- En fase 1 no hay endpoint propio `POST /auth/login` en backend.
- El endpoint principal para obtener sesion de aplicacion es `GET /api/v1/auth/me`.

## Compatibilidad con app-web mock-first
- Mientras se completa backend, `app-web` consume un servicio mock con contrato estable.
- Para evitar regresiones, mantener equivalencia funcional con:
	- `docs/MODULE_INTEGRATION_CONTRACTS.md`
	- `apps/backend-api/docs/API_ENDPOINTS.md`

Rutas minimas esperadas para cerrar paridad de frontend:
- `POST /rental-requests`
- `GET /rental-requests/me`
- `GET /owner/rental-requests`
- `PATCH /owner/rental-requests/:requestId/status`

Reglas de negocio obligatorias para solicitudes:
1. Solo propietario del terreno puede aprobar o rechazar.
2. Solo solicitudes `pending_owner` pueden pasar a `approved` o `rejected`.
3. No se puede aprobar si existe solapamiento con otra solicitud aprobada del mismo terreno.

## Pagos (fase 1)
- Proveedor: Stripe (SDK oficial).
- Flujo definido: Checkout Session.
- Confirmacion de pago: webhook (`POST /api/v1/webhooks/stripe`) como fuente de verdad.
- El frontend no debe confirmar pago solo por `success_url`; debe consultar estado de pago en API.

## Documentacion para frontend
- Rutas y endpoints: [docs/API_ENDPOINTS.md](docs/API_ENDPOINTS.md)
- Guia de integracion (Clerk + Stripe): [docs/INTEGRATION.md](docs/INTEGRATION.md)
- Contrato modulo cruzado: `docs/MODULE_INTEGRATION_CONTRACTS.md`

## Variables de entorno esperadas (referencia)
- `API_PORT`
- `API_BASE_URL`
- `MONGODB_URI`
- `CLERK_SECRET_KEY`
- `CLERK_JWKS_URL`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `WHATSAPP_CONTACT_ENABLED=true|false`

## Versionado
- Prefijo de API: `/api/v1`.
- Cambios breaking deben crear una nueva version o una estrategia formal de compatibilidad.

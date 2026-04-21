# backend-api

API principal usando Bun + Hono.

Responsabilidades iniciales:
- Auth y RBAC
- Modulo de terrenos
- Modulo de solicitudes
- Modulo de contratos
- Modulo de pagos
- Modulo de chat

## Estado actual
- Aun sin implementacion de endpoints.
- Definicion contract-first para trabajar en paralelo con `app-web`.

## Contrato que debe exponer
Referencia obligatoria:
- `docs/MODULE_INTEGRATION_CONTRACTS.md`

Rutas minimas esperadas para integrar con frontend actual:

Auth:
- `POST /auth/login`
- `POST /auth/register`
- `POST /auth/logout`
- `GET /auth/session`

Lands:
- `GET /lands?type=&location=&maxPrice=&availableOn=`
- `GET /lands/:landId`

Rental requests:
- `POST /rental-requests`
- `GET /rental-requests/me`
- `GET /owner/rental-requests`
- `PATCH /owner/rental-requests/:requestId/status`

## Reglas de negocio obligatorias
1. Solo propietario del terreno puede aprobar o rechazar.
2. Solo solicitudes `pending_owner` pueden pasar a `approved` o `rejected`.
3. No se puede aprobar si existe solapamiento con otra solicitud ya aprobada
	 para el mismo terreno.

## Nota de interoperabilidad
- El frontend ya implementa estas reglas en modo mock (`app-web`).
- Al liberar endpoints reales, se debe mantener paridad de contrato para evitar
	regresiones de UI y pruebas E2E.

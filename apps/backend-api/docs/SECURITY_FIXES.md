# Registro de seguridad

## Roles y permisos granulares (HU-35, #153)

Fecha: 2026-07-06

### Problema

- Verificación de autorización dispersa en 36 sitios inline (`authUser.role === "admin" || ...`) en 9 archivos, sin matriz central.
- Ownership inconsistente: owner no podía ver `GET /rental-requests`, `GET /payments` ni `GET /payments/:id` de sus lands (solo tenant/admin).
- Tests 403 insuficientes: solo 2 casos en `auth.test.ts`, sin cobertura por recurso.

### Cambios aplicados

### 1. `apps/backend-api/src/lib/auth-helpers.ts`

Matriz de permisos centralizada con funciones `can*(user, recurso)`:
- `canMutateLand`, `canReadRentalRequest`, `canListRentalRequests`, `canCreateRentalRequest`, `canTransitionRentalRequest`
- `canCreateContract`, `canReadContract`, `canMutateContract`
- `canInitiatePayment`, `canReadPayment`, `canListPayments`
- `canReadChat`, `canReadNotification`, `canAccessAuditEvents`
- `isParticipant` (movido desde `chat.ts`)

Funciones puras (no tocan BD); las rutas cargan el recurso y lo pasan al helper. `canListRentalRequests` y `canListPayments` devuelven filtros Mongo construidos a partir de IDs resueltos por la ruta.

### 2. Refactor de rutas

9 archivos refactorizados para usar `can*` en vez de verificación inline:
- `lands.ts`, `chat.ts`, `notifications.ts`, `contracts.ts`, `rental-requests.ts`, `payments.ts`

Mensajes de error 403 conservados idénticos.

### 3. Fix de ownership (3 endpoints)

- `GET /rental-requests`: owner ahora ve requests de sus lands (no solo los que creó como tenant). Query usa `$or: [{ tenantId }, { landId: { $in: ownerLandIds } }]`.
- `GET /payments`: owner ahora ve pagos de requests donde es owner de la land. Resuelve `requestIds` donde es tenant o owner de la land.
- `GET /payments/:id`: owner ahora ve pago de su land. Carga `land` del `request.landId` y verifica `canReadPayment`.

### 4. `packages/shared/src/types/domain.ts`

Nuevos tipos de vocabulario: `Resource`, `PermissionAction`. No consumidos por backend-api (paquete independiente); para uso futuro del frontend en guards de UI.

### Comportamiento esperado

| Recurso | Acción | Antes | Después |
|---------|--------|-------|---------|
| RentalRequest | GET list (owner) | No ve requests de su land | Ve requests de su land + propios |
| Payment | GET list (owner) | No ve pagos de su land | Ve pagos de su land + propios |
| Payment | GET /:id (owner) | 403 | 200 |
| Todos | Matriz | Inline dispersa | Centralizada en `can*` |
| Todos | Tests 403 | 2 casos | Cobertura por recurso |

### Archivos modificados

- `apps/backend-api/src/lib/auth-helpers.ts` — matriz `can*`
- `apps/backend-api/src/lib/auth-helpers.test.ts` — unit tests
- `apps/backend-api/src/routes/authorization.test.ts` — E2E 403
- `apps/backend-api/src/routes/{lands,chat,notifications,contracts,rental-requests,payments}.ts` — refactor
- `packages/shared/src/types/domain.ts` — tipos `Resource`, `PermissionAction`
- `packages/shared/src/index.ts` — exports

# TerraShare Backend API — Correcciones de Seguridad

Este documento registra las correcciones de seguridad implementadas en el backend
de TerraShare, incluyendo el problema resuelto, los cambios aplicados y el
comportamiento esperado.

---

## Autenticación multifactor (MFA) (HU-37, #155)

Fecha: 2026-07-06

### Problema

No había segundo factor. Una cuenta admin comprometida daba acceso total al sistema.

### Cambios aplicados

- **Clerk Dashboard:** MFA (TOTP) habilitado para la aplicación. Usuarios configuran
  MFA desde su perfil en Clerk.
- `apps/backend-api/src/types.ts`: campo `mfaVerified` agregado a `AuthContextUser`.
- `apps/backend-api/src/lib/clerk-user.ts`: mapeo del claim JWT `mfa_verified`.
- `apps/backend-api/src/middleware/require-auth.ts`: verificación MFA integrada en
  `requireAdmin`; rechaza admins sin MFA habilitado, salvo en dev bypass.
- `apps/backend-api/src/lib/api-response.ts`: código de error `MFA_REQUIRED` agregado.

### Comportamiento esperado

| Escenario | Resultado |
|-----------|-----------|
| Admin con MFA (JWT real) | Acceso normal a rutas admin |
| Admin sin MFA (JWT real) | 403 `MFA_REQUIRED` |
| Admin sin MFA (dev bypass) | Acceso normal (sin JWT no se puede verificar MFA) |
| Usuario regular sin MFA | Acceso normal (no afecta) |

---

## Rate limiting por usuario y API key (HU-40, #158)

Fecha: 2026-07-06

### Problema

Solo había rate limiting por IP (global 100 req/min). Usuarios autenticados no tenían
límites propios. No había cabecera `Retry-After` en respuestas 429.

### Cambios aplicados

- `apps/backend-api/src/middleware/rate-limit.ts`:
  - Todas las funciones (`rateLimitByIP`, `rateLimitByUser`, `rateLimitByIPAndUser`)
    ahora incluyen cabecera `Retry-After` en respuestas 429.
  - Nueva función `rateLimitByApiKey(toolName, limit)` para rate limiting por API key
    (preparado para servidor MCP, HU-63+).
- `apps/backend-api/src/app.ts`: `rateLimitByUser(200)` aplicado a rutas autenticadas
  (lands, rental-requests, contracts, payments, chats, admin, analytics).

### Límites configurados

| Tipo | Límite | Rutas |
|------|--------|-------|
| IP | 100 req/min | Global `/api/v1/*` |
| Usuario | 200 req/min | Rutas autenticadas |
| API key (futuro MCP) | 200 req/min | Por tool |

---

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

---

## Validación de variables de entorno (HU-36, #154)

Fecha: 2026-07-06

### Problema

Las variables de entorno se leían con helpers `getEnv()`/`requireEnv()` sin validación
de esquema. Si faltaba una variable crítica, el error se descubría en tiempo de ejecución.

### Cambios aplicados

- `apps/backend-api/src/config/env.ts`: refactor a schema Zod validado al importar el módulo.
  Todas las variables requeridas se validan al startup; si falta alguna, el servidor no arranca.
- Variables requeridas: `MONGODB_URI`, `CLERK_JWKS_URL`, `CLERK_ISSUER`.
- Variables opcionales con default: `API_PORT` (3000), `ALLOW_DEV_AUTH_BYPASS` (true en dev),
  `ADMIN_SEED_EMAIL` (terradmin@gmail.com), `WHATSAPP_CONTACT_ENABLED` (false).
- Variables opcionales sin default: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
  `CLERK_SECRET_KEY`.

### Rotación de secretos

- Cada secreto debe rotarse cada 90 días como máximo.
- Procedimiento:
  1. Generar nuevo valor (p.ej. nueva API key de Stripe, nuevo webhook secret).
  2. Actualizar `.env.production` con el nuevo valor.
  3. Reiniciar el servicio para que recoja el nuevo valor.
  4. Verificar que el servicio funciona correctamente.
  5. Revocar/eliminar el valor anterior desde el panel del proveedor.
- La rotación de `CLERK_JWKS_URL` y `CLERK_ISSUER` no aplica (son URLs públicas).

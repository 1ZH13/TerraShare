# HU-35 — Roles y permisos granulares

- **Issue**: #153 ([HU-35][backend-api] Roles y permisos granulares)
- **Epic de referencia**: #134
- **Rama**: `feature/backend-api/153-roles-permisos-granulares` (desde `main`)
- **Fecha**: 2026-07-06
- **Responsable**: Chrisvlj
- **Milestone**: Production-Ready
- **Labels**: module:backend-api, topic:security, priority:high

## 1. Problema

El backend tiene verificación de autorización **dispersa e inconsistente**:

1. **Sin matriz central:** cada ruta hace inline `authUser.role === "admin" || ...` (36 ocurrencias dispersas en 9 archivos: `lands.ts`, `rental-requests.ts`, `contracts.ts`, `payments.ts`, `chat.ts`, `notifications.ts`, `analytics.ts`, `admin.ts`, `auth.ts`). Difícil de auditar como unidad.
2. **Ownership inconsistente** (el criterio #1 del issue):
   - `GET /rental-requests` — owner **no** ve requests de sus lands (solo ve las que creó como tenant). `rental-requests.ts:120-134`.
   - `GET /payments` — owner **no** ve pagos de sus lands (solo tenant). `payments.ts:297-329`.
   - `GET /payments/:id` — owner **no** ve pago de su land (solo tenant/admin). `payments.ts:331-350`.
3. **Tests 403 insuficientes:** solo 2 casos en `auth.test.ts` (admin ping + blocked user). No hay tests 403 por recurso/acción.

## 2. Objetivo

Cumplir los 2 criterios de HU-35:
- (a) Matriz de permisos por rol y verificación de propiedad en cada acción.
- (b) Pruebas que cubran accesos no autorizados (403) en todos los recursos.

## 3. Alcance

- **Backend** (`apps/backend-api`): expandir `src/lib/auth-helpers.ts` con funciones `can*`, refactorizar las rutas para usarlas, arreglar las 3 inconsistencias de ownership.
- **Contratos** (`packages/shared`): añadir tipos `PermissionAction` y `Resource` para compartir vocabulario.
- **Pruebas**: unitarios de `can*` + E2E smoke 403 por recurso.
- **Sin BD/migración**: no cambia esquema Mongoose (solo queries).
- **Sin `apps/web`**: la matriz de permisos no tiene cara visible en UI (el frontend ya maneja 403 mostrando errores; no hay pantalla de "gestión de permisos"). Documentar en PR.

## 4. Decisiones de diseño

| Decisión | Elección | Razón |
|---|---|---|
| Modelo de roles | Binario `user` \| `admin` + matriz por acción/recurso | El PRD no pide más roles; YAGNI. La "granularidad" es por acción/recurso, no por rol. |
| Ubicación matriz | Expandir `src/lib/auth-helpers.ts` con funciones `can*(user, recurso)` | Centraliza, testeable unitariamente, rutas quedan limpias. |
| Inconsistencias | Arreglar las 3 (owner ve GET de sus lands) | Es literalmente "ownership consistente" del issue. |
| Tests | Unitarios `can*` + E2E smoke 403 por recurso | El issue pide "403 en todos los recursos" → E2E; los unitarios dan diagnóstico fino. |
| `packages/shared` | Añadir tipos `PermissionAction`, `Resource` | Vocabulario compartido; el frontend podría usarlos para guards de UI en el futuro sin acoplarse a la lógica. |

## 5. Arquitectura

### 5.1 Matriz de permisos — `src/lib/auth-helpers.ts` (expandido)

Mantener `isAdmin` y `isOwnerOrAdmin` (compatibilidad con `analytics.ts` que ya los usa). Añadir funciones `can*` por acción/recurso. Cada una toma `(user: AuthContextUser, recurso)` y devuelve `boolean`. Las funciones son **puras** (no tocan BD) — reciben el recurso ya cargado por la ruta.

| Función | Firma | Lógica | Reemplaza a |
|---|---|---|---|
| `canReadLand` | `(user, land)` | `true` para land activa (GET público); `isOwnerOrAdmin` para inactive | inline en `GET /lands/:landId` |
| `canMutateLand` | `(user, land)` | `isOwnerOrAdmin(user, land.ownerId)` | inline en PATCH/DELETE/status |
| `canReadRentalRequest` | `(user, request, land)` | admin OR `request.tenantId === user.id` OR `land.ownerId === user.id` | inline triángulo en `GET /:id` |
| `canListRentalRequests` | `(user, ownerLandIds: string[])` → filtro Mongo | admin → `{}`; user → `{ $or: [{ tenantId: user.id }, { landId: { $in: ownerLandIds } }] }` | **fix inconsistencia #1** en `GET /rental-requests` |
| `canCreateRentalRequest` | `(user, land)` | `land.ownerId !== user.id` (no auto-request) | inline |
| `canTransitionRentalRequest` | `(user, request, land, nextStatus)` | owner/admin → approve/reject; tenant/owner/admin → cancel; admin todo | inline en `PATCH /status` |
| `canCreateContract` | `(user, land)` | `isOwnerOrAdmin(user, land.ownerId)` | inline |
| `canReadContract` | `(user, contract)` | admin OR `contract.ownerId === user.id` OR `contract.tenantId === user.id` | inline en `GET /:id`, `/sign` |
| `canMutateContract` | `(user, contract)` | `isOwnerOrAdmin(user, contract.ownerId)` | inline en status/complete |
| `canInitiatePayment` | `(user, request)` | admin OR `request.tenantId === user.id` | inline en create-intent/checkout |
| `canReadPayment` | `(user, request, land)` | admin OR `request.tenantId === user.id` OR `land.ownerId === user.id` | **fix inconsistencia #3** en `GET /payments/:id` |
| `canListPayments` | `(user, requestIds: string[])` → filtro Mongo | admin → `{}`; user → `{ rentalRequestId: { $in: requestIds } }` donde `requestIds` son los requests donde el user es tenant **o** owner de la land | **fix inconsistencia #2** en `GET /payments` |
| `canReadChat` | `(user, chat)` | admin OR `isParticipant(chat, user.id)` | inline en chat.ts |
| `canReadNotification` | `(user, notification)` | admin OR `notification.userId === user.id` | inline en notifications.ts |
| `canAccessAuditEvents` | `(user)` | `isAdmin(user)` | `requireAdmin` en contracts.ts (mantener middleware, añadir helper para simetría/documentación) |

**Helpers auxiliares** (privados, no exportados):
- `isParticipant(chat, userId)` — ya existe en `chat.ts:11`, mover a `auth-helpers.ts` y exportar.

**Firma de `canListRentalRequests` y `canListPayments`:** estas necesitan resolver "es owner de alguna land relacionada". Para no meter BD en el helper, la ruta resuelve primero los IDs y pasa el array al helper, que devuelve el filtro Mongo:

- `canListRentalRequests(user, ownerLandIds)`: la ruta hace `ownerLandIds = (await Land.find({ ownerId: user.id }).lean()).map(l => l.id)` y el helper devuelve `{ $or: [{ tenantId: user.id }, { landId: { $in: ownerLandIds } }] }`.
- `canListPayments(user, requestIds)`: la ruta resuelve `requestIds` = IDs de `RentalRequest` donde `tenantId === user.id` OR `land.ownerId === user.id` (vía `Land.find` + `RentalRequest.find`), y el helper devuelve `{ rentalRequestId: { $in: requestIds } }`.

### 5.2 Contratos — `packages/shared`

`packages/shared/src/types/domain.ts`: añadir

```ts
export type Resource =
  | "land" | "rental_request" | "contract" | "payment"
  | "chat" | "notification" | "audit_event" | "lead";

export type PermissionAction =
  | "read" | "create" | "update" | "delete"
  | "transition" | "sign" | "complete" | "initiate";
```

Exportar desde `packages/shared/src/index.ts` (en el bloque `export type { ... } from "./types/domain"`). No añadir lógica (la matriz vive en el backend).

### 5.3 Refactor de rutas

Por cada ruta con verificación inline, reemplazar con llamada a `can*`. Ejemplo (`lands.ts:203`):

```ts
// antes
if (!isOwnerOrAdmin(authUser, current.ownerId)) {
  return failure(c, 403, "FORBIDDEN", "Only owner or admin can update this land");
}
// después
if (!canMutateLand(authUser, current)) {
  return failure(c, 403, "FORBIDDEN", "Only owner or admin can update this land");
}
```

Mensajes de error se conservan idénticos (no rompen tests existentes).

**Fix inconsistencias (3 endpoints):**

- `GET /rental-requests` (`rental-requests.ts:120-134`): para no-admin, resolver `ownerLandIds` primero, luego construir query con `canListRentalRequests(authUser, ownerLandIds)`.
- `GET /payments` (`payments.ts:297-329`): para no-admin, resolver `requestIds` donde `tenantId === user.id` OR `land.ownerId === user.id` (vía `Land.find` + `RentalRequest.find`), luego filtrar payments por esos `rentalRequestId`. Respetar el query param `rentalRequestId` (validar que esté en el set permitido).
- `GET /payments/:id` (`payments.ts:331-350`): cargar `land` del `request.landId`; verificar `canReadPayment(authUser, request, land)`.

### 5.4 In-memory store y seed

- `src/store/in-memory-db.ts`: el seed ya tiene owners y tenants. Para tests de "owner ve requests de su land", los seeds actuales funcionan (`rr_seed_01` es tenant=`user_tenant_01` sobre land de `user_owner_01` → owner debe poder verla tras el fix).
- No añadir seed nuevo; los tests E2E crean recursos ad-hoc vía API cuando necesiten escenarios específicos.

## 6. Pruebas (Bun)

### 6.1 `src/lib/auth-helpers.test.ts` (nuevo, unitarios)

Por cada `can*`: casos admin / owner / tenant / participant / outsider. ~40 casos. Usa objetos literales (no BD). Ejemplo:

```ts
describe("canReadRentalRequest", () => {
  it("admin puede leer cualquier request", () => {
    expect(canReadRentalRequest(adminUser, request, land)).toBe(true);
  });
  it("owner de la land puede leer", () => {
    expect(canReadRentalRequest(ownerUser, request, { ...land, ownerId: ownerUser.id })).toBe(true);
  });
  it("tenant puede leer", () => { /* ... */ });
  it("outsider recibe false", () => { /* ... */ });
});
```

Cobertura por función:
- `canReadLand`: público activa, owner inactive, outsider inactive.
- `canMutateLand`: owner, admin, outsider → false.
- `canReadRentalRequest`: admin, tenant, owner, outsider.
- `canListRentalRequests`: admin {}, user con ownerLandIds.
- `canCreateRentalRequest`: no-owner, owner → false.
- `canTransitionRentalRequest`: owner approve, tenant cancel, outsider approve → false.
- `canCreateContract`: owner, admin, outsider.
- `canReadContract`: admin, owner, tenant, outsider.
- `canMutateContract`: owner, admin, outsider.
- `canInitiatePayment`: tenant, admin, outsider.
- `canReadPayment`: admin, tenant, owner, outsider.
- `canListPayments`: admin, user con ownerLandIds.
- `canReadChat`: admin, participant, outsider.
- `canReadNotification`: admin, owner, outsider.
- `canAccessAuditEvents`: admin, user.

### 6.2 `src/routes/authorization.test.ts` (nuevo, E2E smoke 403)

1 test 403 por endpoint con verificación. Usa `requestJson` + headers `x-dev-user-id`/`x-dev-role`.

| Recurso | Test 403 |
|---|---|
| Land | no-owner PATCH /lands/:id → 403; no-owner DELETE → 403; no-owner PATCH /status → 403 |
| RentalRequest | outsider GET /:id → 403; non-owner PATCH /status approve → 403 |
| Contract | no-owner POST /contracts → 403; outsider GET /:id → 403; no-owner PATCH /status → 403; no-owner POST /complete → 403 |
| Payment | outsider POST /create-intent → 403; outsider GET /payments/:id → 403; non-tenant GET /payments con rentalRequestId ajeno → 403 |
| Chat | outsider GET /chats/:id/messages → 403; outsider POST /chats/:id/messages → 403 |
| Notification | outsider GET /notifications/:id → 403 |
| AuditEvent | non-admin GET /audit-events → 403 |
| Admin routes | non-admin GET /admin/users → 403; non-admin PATCH /admin/users/:id/status → 403 |
| Auth | non-admin GET /auth/admin/ping → 403 (ya existe, no duplicar) |

**Tests positivos del fix ownership** (en `authorization.test.ts`):
- `GET /rental-requests` con owner → incluye request de su land (no solo tenant).
- `GET /payments` con owner → incluye pago de su land (no solo tenant).
- `GET /payments/:id` con owner → 200 (no 403).

## 7. Archivos afectados

| Archivo | Cambio |
|---|---|
| `apps/backend-api/src/lib/auth-helpers.ts` | Expandir con `can*` (mantener `isAdmin`, `isOwnerOrAdmin`, añadir `isParticipant`) |
| `apps/backend-api/src/lib/auth-helpers.test.ts` | **Nuevo** unitarios |
| `apps/backend-api/src/routes/authorization.test.ts` | **Nuevo** E2E 403 + tests positivos fix ownership |
| `apps/backend-api/src/routes/lands.ts` | Usar `canMutateLand` en 3 sitios (PATCH, DELETE, PATCH /status) |
| `apps/backend-api/src/routes/rental-requests.ts` | Usar `canReadRentalRequest`, `canListRentalRequests` (fix #1), `canCreateRentalRequest`, `canTransitionRentalRequest` |
| `apps/backend-api/src/routes/contracts.ts` | Usar `canCreateContract`, `canReadContract`, `canMutateContract` |
| `apps/backend-api/src/routes/payments.ts` | Usar `canInitiatePayment`, `canReadPayment` (fix #3), `canListPayments` (fix #2) |
| `apps/backend-api/src/routes/chat.ts` | Usar `canReadChat` (mover `isParticipant` a auth-helpers) |
| `apps/backend-api/src/routes/notifications.ts` | Usar `canReadNotification` |
| `apps/backend-api/src/routes/analytics.ts` | Sin cambio (ya usa `isOwnerOrAdmin` correctamente) |
| `apps/backend-api/src/routes/admin.ts` | Sin cambio (usa `requireAdmin` middleware, correcto) |
| `apps/backend-api/src/routes/auth.ts` | Sin cambio (usa `requireAdmin`, correcto) |
| `packages/shared/src/types/domain.ts` | Añadir `Resource`, `PermissionAction` |
| `packages/shared/src/index.ts` | Exportar `Resource`, `PermissionAction` |
| `docs/SECURITY_FIXES.md` | Entrada HU-35 |

## 8. Verificación

```bash
cd apps/backend-api && bun run typecheck && bun test
cd packages/shared && bun run typecheck
```

El CI (`backend-api-ci.yml`) ejecuta `bun install --frozen-lockfile` + `bun test` + `bun run typecheck` en `apps/backend-api`. No hay CI para `packages/shared` (no está en los paths del workflow), pero el typecheck local valida.

## 9. PR

- Rama `feature/backend-api/153-roles-permisos-granulares` desde `main`.
- `Closes #153`.
- Body con template `.github/PULL_REQUEST_TEMPLATE.md`.
- Nota en "Resumen": BD/Frontend no aplican (matriz es lógica de backend, sin esquema nuevo, sin UI de gestión de permisos). `packages/shared` solo añade tipos de vocabulario (`Resource`, `PermissionAction`), sin lógica.
- "Riesgos y rollback": riesgo principal = cambio en queries de `GET /rental-requests` y `GET /payments` podría romper tests existentes si dependían del comportamiento viejo (owner no ve). Revisar `rental-requests.test.ts` y `payments.test.ts`. Rollback = revertir el merge (cambio confinado a middleware/helpers/rutas, sin migraciones).

## 10. DoD

- [ ] Criterios de HU-35 cumplidos: matriz de permisos + ownership consistente + tests 403 en todos los recursos.
- [ ] `bun run typecheck` en verde en `apps/backend-api` y `packages/shared`.
- [ ] `bun test` en verde en `apps/backend-api` (tests nuevos + existentes, incluyendo los que pudieran depender del comportamiento viejo).
- [ ] CI `backend-api-ci.yml` en verde (o nota de lockfile pre-existente como en PR #227).
- [ ] 1 aprobación de revisor.
- [ ] `docs/SECURITY_FIXES.md` actualizado.

## 11. Riesgos

| Riesgo | Mitigación |
|---|---|
| Tests existentes dependían de owner-no-ve | Revisar `rental-requests.test.ts` y `payments.test.ts` antes de cambiar; ajustar si asumían comportamiento viejo (preferible: ampliar para cubrir owner-ve, no eliminar tests existentes). |
| `canListRentalRequests`/`canListPayments` necesitan ownerLandIds (query extra) | Una query `Land.find({ ownerId })` extra por request — aceptable para volumen actual; indexar `ownerId` si escala. |
| Refactor masivo (36 sitios) introduce regresión | Mantener mensajes de error idénticos; tests E2E 403 + tests existentes como red de seguridad. Helpers puros facilitan diagnóstico. |
| `isParticipant` movido de `chat.ts` a `auth-helpers.ts` rompe import | Actualizar import en `chat.ts`; buscar otros usos con grep antes. |

## 12. Fuente de la historia

`docs/historias-usuario/index.html` (HU-35):
> Como administrador, quiero permisos granulares por recurso (ownership consistente), para un control de acceso fino.
>
> - Matriz de permisos por rol y verificación de propiedad en cada acción.
> - Pruebas que cubran accesos no autorizados (403) en todos los recursos.

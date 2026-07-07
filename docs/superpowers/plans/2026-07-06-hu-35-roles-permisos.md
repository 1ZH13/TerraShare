# HU-35 Roles y permisos granulares — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Centralizar la verificación de autorización del backend en una matriz de funciones `can*` por acción/recurso, arreglar 3 inconsistencias de ownership (owner no ve GET de sus lands), y añadir tests 403 por recurso.

**Architecture:** Expandir `src/lib/auth-helpers.ts` con funciones puras `can*(user, recurso)` que las rutas llaman en vez de inline `role === "admin" || ...`. Las funciones reciben recursos ya cargados (no tocan BD). Los listados (rental-requests, payments) resuelven IDs de lands del user en la ruta y pasan el array al helper, que devuelve un filtro Mongo. `packages/shared` añade tipos de vocabulario `Resource` y `PermissionAction` (no consumidos por backend-api, solo para contrato futuro frontend).

**Tech Stack:** Bun + Hono 4, TypeScript 5.6.3, Mongoose 9.5, `bun test` (bunfig.toml preload con MongoMemoryServer — los tests de auth-helpers no usan Mongo pero el preload corre igual).

## Global Constraints

- **Sin dependencias nuevas**: `bun.lock` debe permanecer congelado (CI usa `bun install --frozen-lockfile`).
- **Stack**: Hono 4.7.2, Bun, TypeScript 5.6.3, Mongoose 9.5.
- **Sin comentarios en código** salvo que el usuario los pida (regla de estilo del repo).
- **`apps/backend-api` NO importa `@terrashare/shared`** — son paquetes independientes. Los cambios a `packages/shared` no afectan al backend.
- **Patrón de tests**: `import { describe, expect, it, beforeEach, afterEach } from "bun:test"`. E2E tests usan `requestJson` de `../lib/http-test-utils` + headers `x-dev-user-id`/`x-dev-role`.
- **Env vars restauradas**: todo test que mute `process.env` debe restaurar en `afterEach` (no aplica a este plan — ningún test muta env).
- **Branch**: `feature/backend-api/153-roles-permisos-granulares` (ya creada desde `main`).
- **Spec**: `docs/superpowers/specs/2026-07-06-hu-35-roles-permisos-design.md`.
- **Mensajes de error idénticos**: el refactor de rutas debe conservar los mensajes de error 403 existentes para no romper tests.

---

## File Structure

| Archivo | Responsabilidad | Acción |
|---|---|---|
| `packages/shared/src/types/domain.ts` | Tipos de dominio compartidos | Modificar: añadir `Resource`, `PermissionAction` |
| `packages/shared/src/index.ts` | Barrel exports | Modificar: exportar `Resource`, `PermissionAction` |
| `apps/backend-api/src/lib/auth-helpers.ts` | Matriz de permisos `can*` | Modificar: expandir (mantener `isAdmin`, `isOwnerOrAdmin`, añadir `isParticipant`, `can*`) |
| `apps/backend-api/src/lib/auth-helpers.test.ts` | Unit tests de `can*` | Crear |
| `apps/backend-api/src/routes/lands.ts` | Rutas de lands | Modificar: usar `canMutateLand` en 3 sitios |
| `apps/backend-api/src/routes/chat.ts` | Rutas de chat | Modificar: importar `isParticipant`/`canReadChat` de auth-helpers |
| `apps/backend-api/src/routes/notifications.ts` | Rutas de notifications | Modificar: usar `canReadNotification` |
| `apps/backend-api/src/routes/contracts.ts` | Rutas de contracts | Modificar: usar `canCreateContract`, `canReadContract`, `canMutateContract` |
| `apps/backend-api/src/routes/rental-requests.ts` | Rutas de rental-requests | Modificar: usar `can*` + fix `canListRentalRequests` en GET list |
| `apps/backend-api/src/routes/payments.ts` | Rutas de payments | Modificar: usar `can*` + fix `canListPayments` y `canReadPayment` |
| `apps/backend-api/src/routes/authorization.test.ts` | E2E 403 + tests positivos ownership | Crear |
| `docs/SECURITY_FIXES.md` | Registro de cambios de seguridad | Modificar: añadir entrada HU-35 |

---

### Task 1: Contratos — tipos Resource y PermissionAction en packages/shared

**Files:**
- Modify: `packages/shared/src/types/domain.ts`
- Modify: `packages/shared/src/index.ts`

**Interfaces:**
- Produces: tipos `Resource` y `PermissionAction` exportados desde `@terrashare/shared`. No consumidos por backend-api (paquete independiente), solo vocabulario de contrato.

- [ ] **Step 1: Añadir tipos a `packages/shared/src/types/domain.ts`**

En `packages/shared/src/types/domain.ts`, añadir al final del archivo (después de `AuditAction`):

```ts
export type Resource =
  | "land"
  | "rental_request"
  | "contract"
  | "payment"
  | "chat"
  | "notification"
  | "audit_event"
  | "lead";

export type PermissionAction =
  | "read"
  | "create"
  | "update"
  | "delete"
  | "transition"
  | "sign"
  | "complete"
  | "initiate";
```

- [ ] **Step 2: Exportar desde `packages/shared/src/index.ts`**

En `packages/shared/src/index.ts`, actualizar el bloque de exports de `./types/domain` (líneas 12-18) para incluir los nuevos tipos. Reemplazar:

```ts
export type {
  AppRole,
  AuditableEntity,
  AuditAction,
  BusinessCurrency,
  EntityStatus,
} from "./types/domain";
```

Con:

```ts
export type {
  AppRole,
  AuditableEntity,
  AuditAction,
  BusinessCurrency,
  EntityStatus,
  PermissionAction,
  Resource,
} from "./types/domain";
```

- [ ] **Step 3: Run typecheck**

Run: `cd packages/shared && bun run typecheck`
Expected: PASS sin errores.

- [ ] **Step 4: Commit**

```bash
git add packages/shared/src/types/domain.ts packages/shared/src/index.ts
git commit -m "feat(shared): tipos Resource y PermissionAction para matriz de permisos (#153)"
```

---

### Task 2: Matriz de permisos can* en auth-helpers con unit tests

**Files:**
- Modify: `apps/backend-api/src/lib/auth-helpers.ts`
- Test: `apps/backend-api/src/lib/auth-helpers.test.ts`

**Interfaces:**
- Consumes: `AuthContextUser` de `../types`
- Produces (firmas exactas que Tasks 3-5 usan):
  - `isAdmin(user: AuthContextUser): boolean` (existente, mantener)
  - `isOwnerOrAdmin(user: AuthContextUser, ownerId: string): boolean` (existente, mantener)
  - `isParticipant(chat: { participants: { userId: string }[] }, userId: string): boolean`
  - `canMutateLand(user: AuthContextUser, land: { ownerId: string }): boolean`
  - `canReadRentalRequest(user: AuthContextUser, request: { tenantId: string }, land: { ownerId: string }): boolean`
  - `canListRentalRequests(user: AuthContextUser, ownerLandIds: string[]): Record<string, unknown>`
  - `canCreateRentalRequest(user: AuthContextUser, land: { ownerId: string }): boolean`
  - `canTransitionRentalRequest(user: AuthContextUser, request: { tenantId: string }, land: { ownerId: string }, nextStatus: string): boolean`
  - `canCreateContract(user: AuthContextUser, land: { ownerId: string }): boolean`
  - `canReadContract(user: AuthContextUser, contract: { ownerId: string; tenantId: string }): boolean`
  - `canMutateContract(user: AuthContextUser, contract: { ownerId: string }): boolean`
  - `canInitiatePayment(user: AuthContextUser, request: { tenantId: string }): boolean`
  - `canReadPayment(user: AuthContextUser, request: { tenantId: string }, land: { ownerId: string }): boolean`
  - `canListPayments(user: AuthContextUser, requestIds: string[]): Record<string, unknown>`
  - `canReadChat(user: AuthContextUser, chat: { participants: { userId: string }[] }): boolean`
  - `canReadNotification(user: AuthContextUser, notification: { userId: string }): boolean`
  - `canAccessAuditEvents(user: AuthContextUser): boolean`

- [ ] **Step 1: Escribir los tests unitarios que fallan en `src/lib/auth-helpers.test.ts`**

Crear `apps/backend-api/src/lib/auth-helpers.test.ts`:

```ts
import { describe, expect, it } from "bun:test";

import type { AuthContextUser } from "../types";
import {
  canAccessAuditEvents,
  canCreateContract,
  canCreateRentalRequest,
  canInitiatePayment,
  canListPayments,
  canListRentalRequests,
  canMutateContract,
  canMutateLand,
  canReadChat,
  canReadContract,
  canReadNotification,
  canReadPayment,
  canReadRentalRequest,
  canTransitionRentalRequest,
  isAdmin,
  isOwnerOrAdmin,
  isParticipant,
} from "./auth-helpers";

const adminUser: AuthContextUser = {
  id: "admin_01",
  clerkUserId: "admin_01",
  email: "admin@test",
  role: "admin",
  status: "active",
  profile: { fullName: "Admin" },
};

const ownerUser: AuthContextUser = {
  id: "owner_01",
  clerkUserId: "owner_01",
  email: "owner@test",
  role: "user",
  status: "active",
  profile: { fullName: "Owner" },
};

const tenantUser: AuthContextUser = {
  id: "tenant_01",
  clerkUserId: "tenant_01",
  email: "tenant@test",
  role: "user",
  status: "active",
  profile: { fullName: "Tenant" },
};

const outsiderUser: AuthContextUser = {
  id: "outsider_01",
  clerkUserId: "outsider_01",
  email: "outsider@test",
  role: "user",
  status: "active",
  profile: { fullName: "Outsider" },
};

const land = { ownerId: "owner_01" };
const request = { tenantId: "tenant_01" };
const contract = { ownerId: "owner_01", tenantId: "tenant_01" };
const notification = { userId: "owner_01" };
const chat = {
  participants: [
    { userId: "owner_01", role: "owner" as const },
    { userId: "tenant_01", role: "tenant" as const },
  ],
};

describe("auth-helpers legacy", () => {
  it("isAdmin detecta admin", () => {
    expect(isAdmin(adminUser)).toBe(true);
    expect(isAdmin(ownerUser)).toBe(false);
  });

  it("isOwnerOrAdmin permite owner o admin", () => {
    expect(isOwnerOrAdmin(ownerUser, "owner_01")).toBe(true);
    expect(isOwnerOrAdmin(adminUser, "owner_01")).toBe(true);
    expect(isOwnerOrAdmin(tenantUser, "owner_01")).toBe(false);
  });
});

describe("isParticipant", () => {
  it("participante esta en el chat", () => {
    expect(isParticipant(chat, "owner_01")).toBe(true);
    expect(isParticipant(chat, "tenant_01")).toBe(true);
    expect(isParticipant(chat, "outsider_01")).toBe(false);
  });
});

describe("canMutateLand", () => {
  it("owner puede mutar su land", () => {
    expect(canMutateLand(ownerUser, land)).toBe(true);
  });
  it("admin puede mutar cualquier land", () => {
    expect(canMutateLand(adminUser, land)).toBe(true);
  });
  it("outsider no puede mutar", () => {
    expect(canMutateLand(tenantUser, land)).toBe(false);
  });
});

describe("canReadRentalRequest", () => {
  it("admin puede leer cualquier request", () => {
    expect(canReadRentalRequest(adminUser, request, land)).toBe(true);
  });
  it("tenant puede leer su request", () => {
    expect(canReadRentalRequest(tenantUser, request, land)).toBe(true);
  });
  it("owner de la land puede leer el request", () => {
    expect(canReadRentalRequest(ownerUser, request, land)).toBe(true);
  });
  it("outsider no puede leer", () => {
    expect(canReadRentalRequest(outsiderUser, request, land)).toBe(false);
  });
});

describe("canListRentalRequests", () => {
  it("admin ve todos (filtro vacio)", () => {
    expect(canListRentalRequests(adminUser, [])).toEqual({});
  });
  it("user ve requests donde es tenant o owner de la land", () => {
    const filter = canListRentalRequests(tenantUser, ["land_01"]);
    expect(filter).toEqual({
      $or: [{ tenantId: "tenant_01" }, { landId: { $in: ["land_01"] } }],
    });
  });
  it("user sin lands como owner ve solo sus requests como tenant", () => {
    const filter = canListRentalRequests(tenantUser, []);
    expect(filter).toEqual({
      $or: [{ tenantId: "tenant_01" }, { landId: { $in: [] } }],
    });
  });
});

describe("canCreateRentalRequest", () => {
  it("no-owner puede crear request", () => {
    expect(canCreateRentalRequest(tenantUser, land)).toBe(true);
  });
  it("owner no puede crear request sobre propia land", () => {
    expect(canCreateRentalRequest(ownerUser, land)).toBe(false);
  });
});

describe("canTransitionRentalRequest", () => {
  it("owner puede aprobar", () => {
    expect(canTransitionRentalRequest(ownerUser, request, land, "approved")).toBe(true);
  });
  it("admin puede aprobar", () => {
    expect(canTransitionRentalRequest(adminUser, request, land, "approved")).toBe(true);
  });
  it("tenant no puede aprobar", () => {
    expect(canTransitionRentalRequest(tenantUser, request, land, "approved")).toBe(false);
  });
  it("tenant puede cancelar", () => {
    expect(canTransitionRentalRequest(tenantUser, request, land, "cancelled")).toBe(true);
  });
  it("owner puede cancelar", () => {
    expect(canTransitionRentalRequest(ownerUser, request, land, "cancelled")).toBe(true);
  });
  it("outsider no puede cancelar", () => {
    expect(canTransitionRentalRequest(outsiderUser, request, land, "cancelled")).toBe(false);
  });
});

describe("canCreateContract", () => {
  it("owner de la land puede crear contrato", () => {
    expect(canCreateContract(ownerUser, land)).toBe(true);
  });
  it("admin puede crear contrato", () => {
    expect(canCreateContract(adminUser, land)).toBe(true);
  });
  it("tenant no puede crear contrato", () => {
    expect(canCreateContract(tenantUser, land)).toBe(false);
  });
});

describe("canReadContract", () => {
  it("admin puede leer cualquier contrato", () => {
    expect(canReadContract(adminUser, contract)).toBe(true);
  });
  it("owner puede leer su contrato", () => {
    expect(canReadContract(ownerUser, contract)).toBe(true);
  });
  it("tenant puede leer su contrato", () => {
    expect(canReadContract(tenantUser, contract)).toBe(true);
  });
  it("outsider no puede leer", () => {
    expect(canReadContract(outsiderUser, contract)).toBe(false);
  });
});

describe("canMutateContract", () => {
  it("owner puede mutar su contrato", () => {
    expect(canMutateContract(ownerUser, contract)).toBe(true);
  });
  it("admin puede mutar cualquier contrato", () => {
    expect(canMutateContract(adminUser, contract)).toBe(true);
  });
  it("tenant no puede mutar", () => {
    expect(canMutateContract(tenantUser, contract)).toBe(false);
  });
});

describe("canInitiatePayment", () => {
  it("tenant puede iniciar pago de su request", () => {
    expect(canInitiatePayment(tenantUser, request)).toBe(true);
  });
  it("admin puede iniciar pago", () => {
    expect(canInitiatePayment(adminUser, request)).toBe(true);
  });
  it("owner no puede iniciar pago (no es tenant)", () => {
    expect(canInitiatePayment(ownerUser, request)).toBe(false);
  });
});

describe("canReadPayment", () => {
  it("admin puede leer cualquier pago", () => {
    expect(canReadPayment(adminUser, request, land)).toBe(true);
  });
  it("tenant puede leer su pago", () => {
    expect(canReadPayment(tenantUser, request, land)).toBe(true);
  });
  it("owner de la land puede leer el pago", () => {
    expect(canReadPayment(ownerUser, request, land)).toBe(true);
  });
  it("outsider no puede leer", () => {
    expect(canReadPayment(outsiderUser, request, land)).toBe(false);
  });
});

describe("canListPayments", () => {
  it("admin ve todos (filtro vacio)", () => {
    expect(canListPayments(adminUser, [])).toEqual({});
  });
  it("user ve pagos de sus requests (tenant o owner)", () => {
    const filter = canListPayments(tenantUser, ["rr_01", "rr_02"]);
    expect(filter).toEqual({ rentalRequestId: { $in: ["rr_01", "rr_02"] } });
  });
});

describe("canReadChat", () => {
  it("admin puede leer cualquier chat", () => {
    expect(canReadChat(adminUser, chat)).toBe(true);
  });
  it("participante puede leer", () => {
    expect(canReadChat(ownerUser, chat)).toBe(true);
    expect(canReadChat(tenantUser, chat)).toBe(true);
  });
  it("outsider no puede leer", () => {
    expect(canReadChat(outsiderUser, chat)).toBe(false);
  });
});

describe("canReadNotification", () => {
  it("admin puede leer cualquier notificacion", () => {
    expect(canReadNotification(adminUser, notification)).toBe(true);
  });
  it("dueno puede leer su notificacion", () => {
    expect(canReadNotification(ownerUser, notification)).toBe(true);
  });
  it("outsider no puede leer", () => {
    expect(canReadNotification(tenantUser, notification)).toBe(false);
  });
});

describe("canAccessAuditEvents", () => {
  it("admin puede acceder", () => {
    expect(canAccessAuditEvents(adminUser)).toBe(true);
  });
  it("user no puede acceder", () => {
    expect(canAccessAuditEvents(ownerUser)).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd apps/backend-api && bun test src/lib/auth-helpers.test.ts`
Expected: FAIL — las funciones `can*` no están exportadas (solo `isAdmin` e `isOwnerOrAdmin` existen).

- [ ] **Step 3: Implementar la matriz can* en `src/lib/auth-helpers.ts`**

Reemplazar el contenido completo de `apps/backend-api/src/lib/auth-helpers.ts` con:

```ts
import type { AuthContextUser } from "../types";

export function isAdmin(user: AuthContextUser) {
  return user.role === "admin";
}

export function isOwnerOrAdmin(user: AuthContextUser, ownerId: string) {
  return isAdmin(user) || user.id === ownerId;
}

export function isParticipant(
  chat: { participants: { userId: string }[] },
  userId: string,
) {
  return chat.participants.some((participant) => participant.userId === userId);
}

export function canMutateLand(
  user: AuthContextUser,
  land: { ownerId: string },
) {
  return isOwnerOrAdmin(user, land.ownerId);
}

export function canReadRentalRequest(
  user: AuthContextUser,
  request: { tenantId: string },
  land: { ownerId: string },
) {
  return (
    isAdmin(user) ||
    request.tenantId === user.id ||
    land.ownerId === user.id
  );
}

export function canListRentalRequests(
  user: AuthContextUser,
  ownerLandIds: string[],
): Record<string, unknown> {
  if (isAdmin(user)) return {};
  return {
    $or: [{ tenantId: user.id }, { landId: { $in: ownerLandIds } }],
  };
}

export function canCreateRentalRequest(
  user: AuthContextUser,
  land: { ownerId: string },
) {
  return land.ownerId !== user.id;
}

export function canTransitionRentalRequest(
  user: AuthContextUser,
  request: { tenantId: string },
  land: { ownerId: string },
  nextStatus: string,
) {
  const isOwner = isOwnerOrAdmin(user, land.ownerId);
  const isTenant = request.tenantId === user.id;

  if (isAdmin(user)) return true;

  if (nextStatus === "cancelled") {
    return isOwner || isTenant;
  }

  const ownerOnlyStatuses = ["approved", "rejected"];
  if (ownerOnlyStatuses.includes(nextStatus)) {
    return isOwner;
  }

  return isOwner || isTenant;
}

export function canCreateContract(
  user: AuthContextUser,
  land: { ownerId: string },
) {
  return isOwnerOrAdmin(user, land.ownerId);
}

export function canReadContract(
  user: AuthContextUser,
  contract: { ownerId: string; tenantId: string },
) {
  return (
    isAdmin(user) ||
    contract.ownerId === user.id ||
    contract.tenantId === user.id
  );
}

export function canMutateContract(
  user: AuthContextUser,
  contract: { ownerId: string },
) {
  return isOwnerOrAdmin(user, contract.ownerId);
}

export function canInitiatePayment(
  user: AuthContextUser,
  request: { tenantId: string },
) {
  return isAdmin(user) || request.tenantId === user.id;
}

export function canReadPayment(
  user: AuthContextUser,
  request: { tenantId: string },
  land: { ownerId: string },
) {
  return (
    isAdmin(user) ||
    request.tenantId === user.id ||
    land.ownerId === user.id
  );
}

export function canListPayments(
  user: AuthContextUser,
  requestIds: string[],
): Record<string, unknown> {
  if (isAdmin(user)) return {};
  return { rentalRequestId: { $in: requestIds } };
}

export function canReadChat(
  user: AuthContextUser,
  chat: { participants: { userId: string }[] },
) {
  return isAdmin(user) || isParticipant(chat, user.id);
}

export function canReadNotification(
  user: AuthContextUser,
  notification: { userId: string },
) {
  return isAdmin(user) || notification.userId === user.id;
}

export function canAccessAuditEvents(user: AuthContextUser) {
  return isAdmin(user);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd apps/backend-api && bun test src/lib/auth-helpers.test.ts`
Expected: PASS — todos los casos (16 describes, ~40 tests).

- [ ] **Step 5: Run typecheck**

Run: `cd apps/backend-api && bun run typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/backend-api/src/lib/auth-helpers.ts apps/backend-api/src/lib/auth-helpers.test.ts
git commit -m "feat(backend-api): matriz de permisos can* en auth-helpers (#153)"
```

---

### Task 3: Refactor lands, chat y notifications para usar can*

**Files:**
- Modify: `apps/backend-api/src/routes/lands.ts:203,252,302`
- Modify: `apps/backend-api/src/routes/chat.ts:11-13,78,95,133`
- Modify: `apps/backend-api/src/routes/notifications.ts:30,46`

**Interfaces:**
- Consumes: `canMutateLand`, `canReadChat`, `isParticipant`, `canReadNotification` de `../lib/auth-helpers` (Task 2)

- [ ] **Step 1: Refactorizar `src/routes/lands.ts`**

En `apps/backend-api/src/routes/lands.ts`, actualizar el import (línea 4):

```ts
import { canMutateLand, isOwnerOrAdmin } from "../lib/auth-helpers";
```

(Se mantiene `isOwnerOrAdmin` porque no se usa en lands pero el import original lo trae; en realidad lands solo usa `isOwnerOrAdmin`. Cambiar a `canMutateLand` que es lo que corresponde. Reemplazar el import:

```ts
import { canMutateLand } from "../lib/auth-helpers";
```

Reemplazar las 3 verificaciones inline (líneas 203, 252, 302):

En `PATCH /lands/:landId` (línea 203):
```ts
  if (!canMutateLand(authUser, current)) {
    return failure(c, 403, "FORBIDDEN", "Only owner or admin can update this land");
  }
```

En `PATCH /lands/:landId/status` (línea 252):
```ts
  if (!canMutateLand(authUser, current)) {
    return failure(c, 403, "FORBIDDEN", "Only owner or admin can update status");
  }
```

En `DELETE /lands/:landId` (línea 302):
```ts
  if (!canMutateLand(authUser, current)) {
    return failure(c, 403, "FORBIDDEN", "Only owner or admin can delete this land");
  }
```

(Mensajes de error idénticos a los originales.)

- [ ] **Step 2: Refactorizar `src/routes/chat.ts`**

En `apps/backend-api/src/routes/chat.ts`:

Eliminar la función local `isParticipant` (líneas 11-13):
```ts
function isParticipant(chat: { participants: { userId: string }[] }, userId: string) {
  return chat.participants.some((participant) => participant.userId === userId);
}
```

Añadir al inicio, después de los imports existentes:
```ts
import { canReadChat } from "../lib/auth-helpers";
```

Reemplazar las 3 verificaciones inline (líneas 78, 95, 133) que dicen:
```ts
  if (authUser.role !== "admin" && !isParticipant(chat as any, authUser.id)) {
    return failure(c, 403, "FORBIDDEN", "Not allowed to access this chat");
  }
```
Con:
```ts
  if (!canReadChat(authUser, chat)) {
    return failure(c, 403, "FORBIDDEN", "Not allowed to access this chat");
  }
```

(3 ocurrencias con mensajes "Not allowed to access this chat", "Not allowed to send messages in this chat", "Not allowed to view external contact for this chat" — conservar cada mensaje original.)

- [ ] **Step 3: Refactorizar `src/routes/notifications.ts`**

En `apps/backend-api/src/routes/notifications.ts`, añadir import al inicio:
```ts
import { canReadNotification } from "../lib/auth-helpers";
```

Reemplazar las 2 verificaciones inline (líneas 30 y 46) que dicen:
```ts
  if (notification.userId !== authUser.id && authUser.role !== "admin") {
    return failure(c, 403, "FORBIDDEN", "Not allowed to access this notification");
  }
```
Con:
```ts
  if (!canReadNotification(authUser, notification)) {
    return failure(c, 403, "FORBIDDEN", "Not allowed to access this notification");
  }
```

- [ ] **Step 4: Run full test suite para verificar sin regresiones**

Run: `cd apps/backend-api && bun test`
Expected: PASS — todos los tests existentes. Los tests de lands/chat/notifications no verifican 403 específicamente, pero las rutas siguen funcionando para casos positivos.

- [ ] **Step 5: Run typecheck**

Run: `cd apps/backend-api && bun run typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/backend-api/src/routes/lands.ts apps/backend-api/src/routes/chat.ts apps/backend-api/src/routes/notifications.ts
git commit -m "refactor(backend-api): lands, chat y notifications usan can* (#153)"
```

---

### Task 4: Refactor contracts y rental-requests para usar can*

**Files:**
- Modify: `apps/backend-api/src/routes/contracts.ts:37,88-94,108,146-151,187`
- Modify: `apps/backend-api/src/routes/rental-requests.ts:52,120-134,146-153,172-195`

**Interfaces:**
- Consumes: `canCreateContract`, `canReadContract`, `canMutateContract`, `canReadRentalRequest`, `canCreateRentalRequest`, `canTransitionRentalRequest` de `../lib/auth-helpers` (Task 2)

- [ ] **Step 1: Refactorizar `src/routes/contracts.ts`**

En `apps/backend-api/src/routes/contracts.ts`, actualizar import (línea 4):
```ts
import {
  canCreateContract,
  canMutateContract,
  canReadContract,
  isOwnerOrAdmin,
} from "../lib/auth-helpers";
```
(Nota: `isOwnerOrAdmin` ya no se usa en contracts tras el refactor — verificar y remover si es el caso. En realidad, `canCreateContract` y `canMutateContract` usan `isOwnerOrAdmin` internamente, pero contracts.ts no lo llama directamente tras el refactor. Removerlo del import.)

Import final:
```ts
import {
  canCreateContract,
  canMutateContract,
  canReadContract,
} from "../lib/auth-helpers";
```

Reemplazar las verificaciones inline:

En `POST /contracts` (línea 37):
```ts
  if (!canCreateContract(authUser, land)) {
    return failure(c, 403, "FORBIDDEN", "Only owner or admin can create contracts");
  }
```

En `GET /contracts/:contractId` (líneas 88-94):
```ts
  if (!canReadContract(authUser, current)) {
    return failure(c, 403, "FORBIDDEN", "Not allowed to access this contract");
  }
```

En `PATCH /contracts/:contractId/status` (línea 108):
```ts
  if (!canMutateContract(authUser, current)) {
    return failure(c, 403, "FORBIDDEN", "Only owner or admin can update contract status");
  }
```

En `POST /contracts/:contractId/sign` (líneas 146-151):
```ts
  if (!canReadContract(authUser, current)) {
    return failure(c, 403, "FORBIDDEN", "Not allowed to sign this contract");
  }
```

En `POST /contracts/:contractId/complete` (línea 187):
```ts
  if (!canMutateContract(authUser, current)) {
    return failure(c, 403, "FORBIDDEN", "Only owner or admin can complete this contract");
  }
```

(Mensajes idénticos a los originales.)

- [ ] **Step 2: Refactorizar `src/routes/rental-requests.ts`**

En `apps/backend-api/src/routes/rental-requests.ts`, actualizar import (línea 4):
```ts
import {
  canCreateRentalRequest,
  canReadRentalRequest,
  canTransitionRentalRequest,
  isOwnerOrAdmin,
} from "../lib/auth-helpers";
```
(Tras el refactor, `isOwnerOrAdmin` no se usa directamente en rental-requests — `canTransitionRentalRequest` lo encapsula. Remover del import.)

Import final:
```ts
import {
  canCreateRentalRequest,
  canReadRentalRequest,
  canTransitionRentalRequest,
} from "../lib/auth-helpers";
```

Reemplazar las verificaciones inline:

En `POST /rental-requests` (línea 52, la verificación de owner no auto-request):
```ts
  if (!canCreateRentalRequest(authUser, land)) {
    return failure(c, 422, "BUSINESS_RULE_VIOLATION", "Owner cannot create request for own land");
  }
```

En `GET /rental-requests/:requestId` (líneas 146-153):
```ts
  if (!canReadRentalRequest(authUser, record, land)) {
    return failure(c, 403, "FORBIDDEN", "Not allowed to access this rental request");
  }
```

En `PATCH /rental-requests/:requestId/status` (líneas 172-195), reemplazar el bloque completo de verificación de transición:

```ts
  const isOwner = isOwnerOrAdmin(authUser, land.ownerId);
  const isTenant = current.tenantId === authUser.id;

  const body = (await c.req.json().catch(() => null)) as
    | { status?: RentalRequestStatus; reason?: string }
    | null;

  const nextStatus = body?.status;
  if (!nextStatus) {
    return failure(c, 400, "VALIDATION_ERROR", "Missing status");
  }

  if (!canTransition(current.status, nextStatus)) {
    return failure(c, 409, "CONFLICT", `Invalid status transition ${current.status} -> ${nextStatus}`);
  }

  const ownerOnlyStatuses: RentalRequestStatus[] = ["approved", "rejected"];
  if (ownerOnlyStatuses.includes(nextStatus) && !isOwner) {
    return failure(c, 403, "FORBIDDEN", "Only owner or admin can approve/reject requests");
  }

  if (nextStatus === "cancelled" && !(isOwner || isTenant || authUser.role === "admin")) {
    return failure(c, 403, "FORBIDDEN", "Not allowed to cancel this request");
  }
```

Con:

```ts
  const body = (await c.req.json().catch(() => null)) as
    | { status?: RentalRequestStatus; reason?: string }
    | null;

  const nextStatus = body?.status;
  if (!nextStatus) {
    return failure(c, 400, "VALIDATION_ERROR", "Missing status");
  }

  if (!canTransition(current.status, nextStatus)) {
    return failure(c, 409, "CONFLICT", `Invalid status transition ${current.status} -> ${nextStatus}`);
  }

  if (!canTransitionRentalRequest(authUser, current, land, nextStatus)) {
    if (nextStatus === "cancelled") {
      return failure(c, 403, "FORBIDDEN", "Not allowed to cancel this request");
    }
    return failure(c, 403, "FORBIDDEN", "Only owner or admin can approve/reject requests");
  }
```

(Mensajes idénticos a los originales. El orden de checks se preserva: primero validación de transición, luego autorización.)

- [ ] **Step 3: Run full test suite para verificar sin regresiones**

Run: `cd apps/backend-api && bun test`
Expected: PASS — `contracts.test.ts` (crea contract como owner, lista audit como admin) y `rental-requests.test.ts` (updates status as owner, creates request) siguen pasando porque los mensajes y comportamientos se conservan.

- [ ] **Step 4: Run typecheck**

Run: `cd apps/backend-api && bun run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/backend-api/src/routes/contracts.ts apps/backend-api/src/routes/rental-requests.ts
git commit -m "refactor(backend-api): contracts y rental-requests usan can* (#153)"
```

---

### Task 5: Fix ownership — rental-requests GET list y payments

**Files:**
- Modify: `apps/backend-api/src/routes/rental-requests.ts:120-134`
- Modify: `apps/backend-api/src/routes/payments.ts:124,199,297-329,331-350`

**Interfaces:**
- Consumes: `canListRentalRequests`, `canInitiatePayment`, `canReadPayment`, `canListPayments` de `../lib/auth-helpers` (Task 2)

Este task arregla las 3 inconsistencias de ownership (criterio #1 del issue): owner pasa a ver GET de sus lands.

- [ ] **Step 1: Fix `GET /rental-requests` en `src/routes/rental-requests.ts`**

En `apps/backend-api/src/routes/rental-requests.ts`, actualizar el import para añadir `canListRentalRequests`:

```ts
import {
  canCreateRentalRequest,
  canListRentalRequests,
  canReadRentalRequest,
  canTransitionRentalRequest,
} from "../lib/auth-helpers";
```

Añadir import de `Land` si no está (ya está en línea 7: `import { Land, RentalRequest } from "../db/schemas"`).

Reemplazar el handler `GET /rental-requests` (líneas 120-134):

```ts
rentalRequestRoutes.get("/rental-requests", requireAuth, async (c) => {
  const authUser = c.get("authUser");

  let query: Record<string, any> = {};

  if (authUser.role === "admin") {
    query = {};
  } else {
    query = { tenantId: authUser.id };
  }

  const items = await RentalRequest.find(query).lean();

  return success(c, items);
});
```

Con:

```ts
rentalRequestRoutes.get("/rental-requests", requireAuth, async (c) => {
  const authUser = c.get("authUser");

  const ownerLandIds = authUser.role === "admin"
    ? []
    : (await Land.find({ ownerId: authUser.id }).lean()).map((l) => l.id);

  const query = canListRentalRequests(authUser, ownerLandIds);

  const items = await RentalRequest.find(query).lean();

  return success(c, items);
});
```

- [ ] **Step 2: Refactorizar `src/routes/payments.ts` — imports y create-intent**

En `apps/backend-api/src/routes/payments.ts`, añadir import después de los imports existentes (después de línea 8):

```ts
import {
  canInitiatePayment,
  canListPayments,
  canReadPayment,
} from "../lib/auth-helpers";
import { Land } from "../db/schemas";
```
(Verificar si `Land` ya está importado — en payments.ts línea 8 es `import { Payment, RentalRequest, Land, Contract } from "../db/schemas"`. `Land` YA está importado. Solo añadir el import de auth-helpers.)

Import a añadir:
```ts
import {
  canInitiatePayment,
  canReadPayment,
} from "../lib/auth-helpers";
```

(Nota: `canListPayments` no se importa en payments.ts — el handler `GET /payments` construye el query inline porque necesita validar el query param `rentalRequestId` contra `requestIds` directamente. `canListPayments` queda como helper de documentación/test cubierto por Task 2.)

Reemplazar verificación en `POST /payments/create-intent` (línea 124):
```ts
  if (!canInitiatePayment(authUser, request)) {
    return failure(c, 403, "FORBIDDEN", "Only tenant or admin can start payment");
  }
```

Reemplazar verificación en `POST /payments/checkout-session` (línea 199):
```ts
  if (!canInitiatePayment(authUser, request)) {
    return failure(c, 403, "FORBIDDEN", "Only tenant or admin can start payment");
  }
```

- [ ] **Step 3: Fix `GET /payments` en `src/routes/payments.ts`**

Reemplazar el handler `GET /payments` (líneas 297-329):

```ts
paymentRoutes.get("/payments", requireAuth, async (c) => {
  const authUser = c.get("authUser");

  const rentalRequestId = c.req.query("rentalRequestId");
  const contractId = c.req.query("contractId");
  const status = c.req.query("status");

  const query: Record<string, any> = {};

  if (authUser.role !== "admin") {
    const requests = await RentalRequest.find({ tenantId: authUser.id }).select("id").lean();
    const requestIds = requests.map((r) => r.id);
    if (requestIds.length === 0) {
      return success(c, []);
    }
    if (rentalRequestId) {
      if (!requestIds.includes(rentalRequestId)) {
        return failure(c, 403, "FORBIDDEN", "Cannot access payment for another user's rental request");
      }
      query.rentalRequestId = rentalRequestId;
    } else {
      query.rentalRequestId = { $in: requestIds };
    }
  } else {
    if (rentalRequestId) query.rentalRequestId = rentalRequestId;
  }

  if (contractId) query.contractId = contractId;
  if (status) query.status = status;

  const items = await Payment.find(query).sort({ createdAt: -1 }).lean();
  return success(c, items);
});
```

Con:

```ts
paymentRoutes.get("/payments", requireAuth, async (c) => {
  const authUser = c.get("authUser");

  const rentalRequestId = c.req.query("rentalRequestId");
  const contractId = c.req.query("contractId");
  const status = c.req.query("status");

  const query: Record<string, any> = {};

  if (authUser.role !== "admin") {
    const ownerLandIds = (await Land.find({ ownerId: authUser.id }).lean()).map((l) => l.id);
    const requests = await RentalRequest.find({
      $or: [{ tenantId: authUser.id }, { landId: { $in: ownerLandIds } }],
    }).select("id").lean();
    const requestIds = requests.map((r) => r.id);
    if (requestIds.length === 0) {
      return success(c, []);
    }
    if (rentalRequestId) {
      if (!requestIds.includes(rentalRequestId)) {
        return failure(c, 403, "FORBIDDEN", "Cannot access payment for another user's rental request");
      }
      query.rentalRequestId = rentalRequestId;
    } else {
      query.rentalRequestId = { $in: requestIds };
    }
  } else {
    if (rentalRequestId) query.rentalRequestId = rentalRequestId;
  }

  if (contractId) query.contractId = contractId;
  if (status) query.status = status;

  const items = await Payment.find(query).sort({ createdAt: -1 }).lean();
  return success(c, items);
});
```

(Cambio: para no-admin, resuelve `requestIds` donde es tenant **o** owner de la land del request, no solo tenant. El resto del handler se conserva.)

- [ ] **Step 4: Fix `GET /payments/:paymentId` en `src/routes/payments.ts`**

Reemplazar el handler `GET /payments/:paymentId` (líneas 331-350):

```ts
paymentRoutes.get("/payments/:paymentId", requireAuth, async (c) => {
  const authUser = c.get("authUser");
  const paymentId = c.req.param("paymentId");

  const payment = await Payment.findOne({ id: paymentId }).lean();
  if (!payment) {
    return failure(c, 404, "NOT_FOUND", "Payment not found");
  }

  const request = await RentalRequest.findOne({ id: payment.rentalRequestId }).lean();
  if (
    authUser.role !== "admin" &&
    request &&
    request.tenantId !== authUser.id
  ) {
    return failure(c, 403, "FORBIDDEN", "Not allowed to access this payment");
  }

  return success(c, payment);
});
```

Con:

```ts
paymentRoutes.get("/payments/:paymentId", requireAuth, async (c) => {
  const authUser = c.get("authUser");
  const paymentId = c.req.param("paymentId");

  const payment = await Payment.findOne({ id: paymentId }).lean();
  if (!payment) {
    return failure(c, 404, "NOT_FOUND", "Payment not found");
  }

  const request = await RentalRequest.findOne({ id: payment.rentalRequestId }).lean();
  if (!request) {
    return failure(c, 404, "NOT_FOUND", "Related rental request not found");
  }

  const land = await Land.findOne({ id: request.landId }).lean();
  if (!canReadPayment(authUser, request, land ?? { ownerId: "" })) {
    return failure(c, 403, "FORBIDDEN", "Not allowed to access this payment");
  }

  return success(c, payment);
});
```

(Cambio: carga `land` del `request.landId` y usa `canReadPayment` que permite owner de la land. Si la land no existe, pasa `{ ownerId: "" }` que deniega para no-admin — defensivo.)

- [ ] **Step 5: Run full test suite para verificar sin regresiones**

Run: `cd apps/backend-api && bun test`
Expected: PASS — `payments.test.ts` no testea GET list/`:id` directamente, así que no se rompe. `rental-requests.test.ts` no asume owner-no-ve. Los tests existentes pasan.

- [ ] **Step 6: Run typecheck**

Run: `cd apps/backend-api && bun run typecheck`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/backend-api/src/routes/rental-requests.ts apps/backend-api/src/routes/payments.ts
git commit -m "fix(backend-api): owner ve GET de rental-requests y payments de sus lands (#153)"
```

---

### Task 6: E2E 403 tests + tests positivos del fix ownership

**Files:**
- Test: `apps/backend-api/src/routes/authorization.test.ts`

**Interfaces:**
- Consumes: `requestJson` de `../lib/http-test-utils` (existente). Headers `x-dev-user-id`/`x-dev-role` para dev auth bypass.

- [ ] **Step 1: Escribir `src/routes/authorization.test.ts`**

Crear `apps/backend-api/src/routes/authorization.test.ts`:

```ts
import { describe, expect, it } from "bun:test";

import { requestJson } from "../lib/http-test-utils";

describe("authorization 403 por recurso", () => {
  describe("Land", () => {
    it("no-owner PATCH /lands/:id retorna 403", async () => {
      const { response, payload } = await requestJson("/api/v1/lands/land_seed_01", {
        method: "PATCH",
        headers: { "x-dev-user-id": "user_tenant_01" },
        body: { title: "Cambio ajeno" },
      });
      expect(response.status).toBe(403);
      expect(payload.error.code).toBe("FORBIDDEN");
    });

    it("no-owner DELETE /lands/:id retorna 403", async () => {
      const { response, payload } = await requestJson("/api/v1/lands/land_seed_01", {
        method: "DELETE",
        headers: { "x-dev-user-id": "user_tenant_01" },
      });
      expect(response.status).toBe(403);
      expect(payload.error.code).toBe("FORBIDDEN");
    });

    it("no-owner PATCH /lands/:id/status retorna 403", async () => {
      const { response, payload } = await requestJson("/api/v1/lands/land_seed_01/status", {
        method: "PATCH",
        headers: { "x-dev-user-id": "user_tenant_01" },
        body: { status: "inactive" },
      });
      expect(response.status).toBe(403);
      expect(payload.error.code).toBe("FORBIDDEN");
    });
  });

  describe("RentalRequest", () => {
    it("outsider GET /rental-requests/:id retorna 403", async () => {
      const { response, payload } = await requestJson("/api/v1/rental-requests/rr_seed_01", {
        headers: { "x-dev-user-id": "user_owner_02" },
      });
      expect(response.status).toBe(403);
      expect(payload.error.code).toBe("FORBIDDEN");
    });

    it("tenant PATCH /status approve retorna 403 (solo owner/admin)", async () => {
      const { response, payload } = await requestJson("/api/v1/rental-requests/rr_seed_01/status", {
        method: "PATCH",
        headers: { "x-dev-user-id": "user_tenant_01" },
        body: { status: "approved" },
      });
      expect(response.status).toBe(403);
      expect(payload.error.code).toBe("FORBIDDEN");
    });

    it("owner GET /rental-requests incluye requests de su land (fix ownership)", async () => {
      const { response, payload } = await requestJson("/api/v1/rental-requests", {
        headers: { "x-dev-user-id": "user_owner_01" },
      });
      expect(response.status).toBe(200);
      const items = payload.data as Array<{ id: string }>;
      expect(items.some((r) => r.id === "rr_seed_01")).toBe(true);
    });
  });

  describe("Contract", () => {
    it("no-owner POST /contracts retorna 403", async () => {
      const { response, payload } = await requestJson("/api/v1/contracts", {
        method: "POST",
        headers: { "x-dev-user-id": "user_tenant_01" },
        body: {
          rentalRequestId: "rr_seed_01",
          terms: {
            summary: "Contrato ajeno",
            startsAt: new Date().toISOString(),
            endsAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
          },
        },
      });
      expect(response.status).toBe(403);
      expect(payload.error.code).toBe("FORBIDDEN");
    });

    it("outsider GET /contracts/:id retorna 403", async () => {
      const { response, payload } = await requestJson("/api/v1/contracts/contract_seed_01", {
        headers: { "x-dev-user-id": "user_owner_02" },
      });
      expect(response.status).toBe(403);
      expect(payload.error.code).toBe("FORBIDDEN");
    });

    it("no-owner POST /contracts/:id/complete retorna 403", async () => {
      const { response, payload } = await requestJson("/api/v1/contracts/contract_seed_01/complete", {
        method: "POST",
        headers: { "x-dev-user-id": "user_tenant_01" },
      });
      expect(response.status).toBe(403);
      expect(payload.error.code).toBe("FORBIDDEN");
    });
  });

  describe("Payment", () => {
    it("outsider GET /payments/:id retorna 403", async () => {
      const { response, payload } = await requestJson("/api/v1/payments/pay_seed_01", {
        headers: { "x-dev-user-id": "user_owner_02" },
      });
      expect(response.status).toBe(403);
      expect(payload.error.code).toBe("FORBIDDEN");
    });

    it("owner de la land GET /payments/:id retorna 200 (fix ownership)", async () => {
      const { response } = await requestJson("/api/v1/payments/pay_seed_01", {
        headers: { "x-dev-user-id": "user_owner_01" },
      });
      expect(response.status).toBe(200);
    });

    it("owner de la land GET /payments incluye pago de su land (fix ownership)", async () => {
      const { response, payload } = await requestJson("/api/v1/payments", {
        headers: { "x-dev-user-id": "user_owner_01" },
      });
      expect(response.status).toBe(200);
      const items = payload.data as Array<{ id: string }>;
      expect(items.some((p) => p.id === "pay_seed_01")).toBe(true);
    });
  });

  describe("Chat", () => {
    it("outsider GET /chats/:id/messages retorna 403", async () => {
      const { response, payload } = await requestJson("/api/v1/chats/chat_seed_01/messages", {
        headers: { "x-dev-user-id": "user_owner_02" },
      });
      expect(response.status).toBe(403);
      expect(payload.error.code).toBe("FORBIDDEN");
    });

    it("outsider POST /chats/:id/messages retorna 403", async () => {
      const { response, payload } = await requestJson("/api/v1/chats/chat_seed_01/messages", {
        method: "POST",
        headers: { "x-dev-user-id": "user_owner_02" },
        body: { text: "Mensaje ajeno" },
      });
      expect(response.status).toBe(403);
      expect(payload.error.code).toBe("FORBIDDEN");
    });
  });

  describe("Notification", () => {
    it("outsider GET /notifications/:id retorna 403 o 404", async () => {
      const store = (await import("../store/in-memory-db")).getStore();
      const notifications = Array.from(store.notifications.values());
      if (notifications.length === 0) return;

      const target = notifications[0];
      const nonOwner = target.userId === "user_owner_01" ? "user_owner_02" : "user_owner_01";
      const { response } = await requestJson(`/api/v1/notifications/${target.id}`, {
        headers: { "x-dev-user-id": nonOwner },
      });
      expect([403, 404]).toContain(response.status);
    });
  });

  describe("AuditEvent", () => {
    it("non-admin GET /audit-events retorna 403", async () => {
      const { response, payload } = await requestJson("/api/v1/audit-events", {
        headers: { "x-dev-user-id": "user_owner_01" },
      });
      expect(response.status).toBe(403);
      expect(payload.error.code).toBe("FORBIDDEN");
    });
  });

  describe("Admin routes", () => {
    it("non-admin GET /admin/users retorna 403", async () => {
      const { response, payload } = await requestJson("/api/v1/admin/users", {
        headers: { "x-dev-user-id": "user_owner_01" },
      });
      expect(response.status).toBe(403);
      expect(payload.error.code).toBe("FORBIDDEN");
    });

    it("non-admin PATCH /admin/users/:id/status retorna 403", async () => {
      const { response, payload } = await requestJson("/api/v1/admin/users/user_owner_02/status", {
        method: "PATCH",
        headers: { "x-dev-user-id": "user_owner_01" },
        body: { status: "blocked" },
      });
      expect(response.status).toBe(403);
      expect(payload.error.code).toBe("FORBIDDEN");
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `cd apps/backend-api && bun test src/routes/authorization.test.ts`
Expected: PASS — todos los casos 403 + los 3 tests positivos de fix ownership.

Si algún test falla, investigar:
- 403 que llega como 404 → el recurso seed no existe en el store (verificar seeds en `src/store/in-memory-db.ts`).
- Test positivo de owner-ve falla → el fix de Task 5 no aplicó correctamente.

- [ ] **Step 3: Run full test suite para verificar sin regresiones**

Run: `cd apps/backend-api && bun test`
Expected: PASS — todos los tests nuevos + existentes. Si hay conflictos de estado entre tests (p.ej. `payments.test.ts` aprueba `rr_seed_01` y lo deja en estado "approved" que afecta a otros), el preload `resetStore()` en `beforeEach` debería aislar. Verificar el orden de tests no afecta.

- [ ] **Step 4: Run typecheck**

Run: `cd apps/backend-api && bun run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/backend-api/src/routes/authorization.test.ts
git commit -m "test(backend-api): E2E 403 por recurso + tests ownership fix (#153)"
```

---

### Task 7: docs/SECURITY_FIXES.md + verificación final

**Files:**
- Modify: `docs/SECURITY_FIXES.md`

- [ ] **Step 1: Añadir entrada a `docs/SECURITY_FIXES.md`**

En `docs/SECURITY_FIXES.md`, añadir al final del archivo una nueva sección:

```markdown

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
```

- [ ] **Step 2: Run full test suite + typecheck final**

Run: `cd apps/backend-api && bun test && bun run typecheck`
Expected: PASS — todos los tests + typecheck sin errores.

Run: `cd packages/shared && bun run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add docs/SECURITY_FIXES.md
git commit -m "docs(backend-api): registro de seguridad HU-35 roles y permisos (#153)"
```

---

## Verificación final (post-implementación)

- [ ] `cd apps/backend-api && bun run typecheck` en verde
- [ ] `cd apps/backend-api && bun test` en verde
- [ ] `cd packages/shared && bun run typecheck` en verde
- [ ] `git log --oneline` muestra 7 commits sobre `feature/backend-api/153-roles-permisos-granulares`
- [ ] PR con `Closes #153`, template de `.github/PULL_REQUEST_TEMPLATE.md`, nota sobre por qué BD/Frontend no aplican

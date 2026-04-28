# Registro de Cambios de Seguridad - Pagos y Solicitudes

Fecha: 2026-04-27
Commit: `df38974`

## Problema

Los usuarios podían ver todas las solicitudes de alquiler y pagos de otros usuarios, en lugar de solo los suyos.

**Causa raíz:**
- `GET /payments` permitía sobreescribir el filtro de seguridad si se pasaba `rentalRequestId` como query param
- `GET /rental-requests` mostraba solicitudes donde el usuario era `tenantId` O `landOwnerId`

## Cambios Aplicados

### 1. `apps/backend-api/src/routes/payments.ts`

**Endpoint:** `GET /api/v1/payments`

**Antes:**
```typescript
if (authUser.role !== "admin") {
  const requests = await RentalRequest.find({ tenantId: authUser.id }).select("id").lean();
  const requestIds = requests.map((r) => r.id);
  query.rentalRequestId = { $in: requestIds };
}
if (rentalRequestId) query.rentalRequestId = rentalRequestId;  // <-- Sobreescribía el filtro!
```

**Después:**
```typescript
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
}
```

**Seguridad:** Un usuario no-admin solo puede acceder a pagos de sus propias solicitudes. Si intenta acceder via `rentalRequestId` de otro usuario, recibe 403.

### 2. `apps/backend-api/src/routes/rental-requests.ts`

**Endpoint:** `GET /api/v1/rental-requests`

**Antes:**
```typescript
query = {
  $or: [
    { tenantId: authUser.id },
    { landId: { $in: userLandIds } },  // <-- Mostraba solicitudes de terrenos que posee
  ],
};
```

**Después:**
```typescript
query = { tenantId: authUser.id };
```

**Seguridad:** Un usuario no-admin solo ve las solicitudes de alquiler que **él ha creado como inquilino**.

## Comportamiento Esperado

| Rol | rental-requests | payments |
|-----|-----------------|----------|
| Admin | Ve todas | Ve todas |
| Usuario normal | Solo las que creó como tenant | Solo las de sus solicitudes |

## Archivos Modificados

- `apps/backend-api/src/routes/payments.ts`
- `apps/backend-api/src/routes/rental-requests.ts`

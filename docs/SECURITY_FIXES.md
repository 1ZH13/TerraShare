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

### Security Fixes (Commit: `df38974`)
- `apps/backend-api/src/routes/payments.ts` - Security fix for payment access control
- `apps/backend-api/src/routes/rental-requests.ts` - Removed owner land filter

### Stripe Integration & UI Improvements (Commit: `aade959`)

#### Backend
- `apps/backend-api/package.json` - Added `@clerk/backend` dependency
- `apps/backend-api/scripts/list-clerk-users.ts` - Script to list Clerk users
- `apps/backend-api/scripts/manage-clerk-users.ts` - Script to manage Clerk users

#### Frontend
- `apps/web/package.json` - Added `@stripe/react-stripe-js`, `@stripe/stripe-js` dependencies
- `apps/web/src/App.jsx` - Improved dashboard UI with better status cards and layout
- `apps/web/src/components/PaymentButton.jsx` - Improved styling and error handling
- `apps/web/src/pages/PaymentPage.jsx` - New Stripe Elements payment page
- `apps/web/src/pages/ReservePage.jsx` - Improved reservation page
- `apps/web/src/services/api.js` - Added `createPaymentIntent` function
- `apps/web/src/styles.css` - UI improvements

## Commits Realizados

| Commit | Descripción |
|--------|-------------|
| `df38974` | fix: secure payment and rental request endpoints |
| `aade959` | feat: add Stripe Elements payment flow and improve dashboard UI |

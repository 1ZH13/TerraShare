## Issue
Closes #7

## Qué se hizo

### Fase 1 — Cliente de API real
- `services/api.js` nuevo: cliente que conecta directamente a `backend-api` via `VITE_API_BASE_URL`
- Auth via Bearer token (Clerk) — inyectado automáticamente desde `user.getToken()` en `App()`
- Endpoints consumidos:
  - `GET /api/v1/lands` → catálogo con filtros (`use`, `province`, `district`, `priceMax`, `availableFrom`, `sort`, `order`)
  - `GET /api/v1/lands/:landId` → detalle
  - `POST /api/v1/rental-requests` → crear solicitud (`{ landId, period: {startDate, endDate}, intendedUse, notes }`)
  - `GET /api/v1/rental-requests?tenantId=X` → mis solicitudes
  - `GET /api/v1/rental-requests?ownerId=X` → bandeja propietario
  - `PATCH /api/v1/rental-requests/:id/status` → approve/reject
  - `GET /api/v1/auth/me` → datos de usuario

### Fase 2 — Adaptadores de formato
- `adaptLand()`: traduce `priceRule.pricePerMonth → monthlyPrice`, `location.province/district → province/district`, `area → areaHectares`, `allowedUses[0] → type`, `availability → availableFrom/availableTo`
- `adaptRentalRequest()`: normaliza campos del registro plano para el UI

### Fase 3 — Actualización de páginas
- `CatalogPage`: consume `apiReal.listLands()` con filtros → `rawLands.map(adaptLand)`
- `LandDetailPage` (catálogo y reserva): consume `apiReal.getLandById()` → `adaptLand()`
- `ReservePage`: `createRentalRequest()` con body del backend (`period: {startDate, endDate}`)
- `MyRequestsPage`: `listRentalRequests({ tenantId })`
- `OwnerRequestsPage`: `listRentalRequests({ ownerId })` + enriquecimiento con datos del terreno; `updateRentalRequestStatus(requestId, status)`

### Fase 4 — Labels de status
- `statusLabels` ahora usa strings puros (`pending_owner`, `approved`, `rejected`, etc.) en vez de constantes importadas de mockApi

### Nota
- `mockApi.js` se mantiene sin cambios — los E2E tests existentes siguen usando el mock mode
- Backend necesita estar corriendo en `VITE_API_BASE_URL` para que el app-web funcione
- `bun install` ejecutado en `apps/app-web` para instalar `@clerk/clerk-react@5.61.3`

## Tests
- Build pasa (`bun run build`) ✅
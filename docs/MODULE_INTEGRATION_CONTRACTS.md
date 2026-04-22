# Contratos de integracion entre modulos

## 1. Objetivo

Definir un contrato comun para que frontend y backend trabajen en paralelo sin bloquearse.

Estado actual:
- `apps/app-web` usa adaptador mock local (`src/services/mockApi.js`).
- `apps/backend-api` implementa CRUD de lands y auth con Clerk (issue #24).
- Este documento define el contrato que debe respetar la API real para reemplazo sin romper UI.
- `packages/shared` es la fuente de verdad unica para DTOs y enums.

## 2. Flujo entre modulos

1. Landing (`apps/landing`) redirige al modulo principal via `VITE_APP_WEB_URL`.
2. App web (`apps/app-web`) consume contrato de datos para:
   - catalogo y filtros,
   - detalle de terreno,
   - crear solicitud,
   - listar solicitudes de arrendatario,
   - listar y decidir solicitudes como propietario.
3. Backend API (`apps/backend-api`) implementa las rutas equivalentes.
4. Shared (`packages/shared`) centraliza DTOs, enums y contratos compartidos.

## 3. Fuente de verdad (packages/shared)

Todos los DTOs canonicos viven en `packages/shared/src/`:

- `LandDto`, `CreateLandDto`, `UpdateLandDto`, `LandFilterDto`
- `RentalRequestDto`, `CreateRentalRequestDto`, `UpdateRentalRequestStatusDto`
- `AuthMeResponseDto`
- `ApiResponse<T>`, `ApiSuccess<T>`, `ApiFailure` (envoltorio standard de respuestas)
- Enums: `RentalRequestStatus`, `LandStatus`, `LandUse`, `AppRole`

## 4. Contrato de estados de solicitud

Estados validos (`RentalRequestStatus`):
- `draft`
- `pending_owner`
- `approved`
- `rejected`
- `cancelled`
- `pending_payment`
- `paid`

Reglas de negocio ya aplicadas en mock (deben mantenerse en API real):
1. Solo propietario del terreno puede aprobar/rechazar.
2. Solo solicitudes `pending_owner` pueden transicionar a `approved` o `rejected`.
3. No se puede aprobar una solicitud si solapa fechas con otra solicitud ya aprobada del mismo terreno.

## 5. DTO de Land (LandDto canonico)

```json
{
  "id": "land-1",
  "ownerId": "usr-owner-1",
  "title": "Finca El Tamarindo",
  "description": "Terreno plano con acceso vehicular.",
  "area": 5,
  "allowedUses": ["agricultura", "ganaderia"],
  "location": {
    "province": "Los Santos",
    "district": "Las Tablas",
    "corregimiento": "Las Tablas",
    "addressLine": " Camino rural Km 12",
    "lat": 8.0,
    "lng": -80.5
  },
  "availability": {
    "availableFrom": "2026-05-01",
    "availableTo": "2026-12-31"
  },
  "priceRule": {
    "currency": "USD",
    "pricePerMonth": 420
  },
  "status": "active",
  "createdAt": "2026-04-21T10:00:00.000Z",
  "updatedAt": "2026-04-21T10:00:00.000Z"
}
```

Query params de `GET /lands` (LandFilterDto):
- `page` (default 1)
- `pageSize` (default 20, max 100)
- `sort` (`createdAt`, `price`, `area`)
- `order` (`asc`, `desc`)
- `use` (ej: `agricultura`, `ganaderia`, `forestal`, `acuicultura`, `mixto`, `otro`)
- `priceMin`, `priceMax`
- `province`, `district`
- `availableFrom`, `availableTo`

## 6. DTO de RentalRequest (RentalRequestDto canonico)

```json
{
  "id": "req-100",
  "landId": "land-2",
  "tenantId": "usr-tenant-1",
  "period": {
    "startDate": "2026-08-01",
    "endDate": "2026-09-30"
  },
  "intendedUse": "engorde de ganado",
  "notes": "Tengo equipo y personal para iniciar en dos semanas.",
  "status": "pending_owner",
  "createdAt": "2026-04-21T10:00:00.000Z",
  "updatedAt": "2026-04-21T10:00:00.000Z"
}
```

Campos enriquecidos usados por UI en respuestas de listados:
- `landName` (nombre del terreno, enriquecido por el backend)
- `ownerId` (dueno del terreno)
- `tenantName` (nombre del arrendatario)
- `tenantEmail` (email del arrendatario)
- `monthlyPrice` (precio mensual del terreno)
- `landType` (tipo principal del terreno)

## 7. Endpoints backend-api (estado actual)

### Auth
- `GET /api/v1/auth/me` → `AuthMeResponseDto` (implementado #23)

### Lands (implementado #24)
- `GET /api/v1/lands` → lista con paginacion (publico)
- `GET /api/v1/lands/:landId` → detalle land (publico)
- `POST /api/v1/lands` → crear terreno (requiere auth)
- `PATCH /api/v1/lands/:landId` → editar terreno (owner/admin)
- `PATCH /api/v1/lands/:landId/status` → cambiar status (owner/admin)
- `DELETE /api/v1/lands/:landId` → eliminar terreno (owner/admin)

### Rental requests (pendiente #25)
- `POST /api/v1/rental-requests` → crear solicitud (requiere auth)
- `GET /api/v1/rental-requests` → lista propia del tenant (requiere auth)
- `GET /api/v1/rental-requests/:requestId` → detalle (tenant/owner/admin)
- `PATCH /api/v1/rental-requests/:requestId/status` → aprobar/rechazar (owner/admin)

Ejemplo PATCH body:
```json
{
  "status": "approved",
  "reason": "Opcional"
}
```

## 8. Plan de migracion mock -> API real

1. Mantener la interfaz publica del servicio usada por `App.jsx`.
2. Crear `src/services/httpApi.js` con mismas funciones que `mockApi.js`.
3. Mantener los field adapters en `src/services/fieldAdapters.js` para traducir campos.
4. Activar selector por variable de entorno:
   - `VITE_DATA_SOURCE=mock` (default)
   - `VITE_DATA_SOURCE=api`
5. Reusar E2E existentes para validar que el comportamiento no cambia.

## 9. Referencias

- DTOs canonicos: `packages/shared/src/dto/` y `packages/shared/src/types/`
- Contrato de endpoints: `apps/backend-api/docs/API_ENDPOINTS.md`
- Guia de integracion: `apps/backend-api/docs/INTEGRATION.md`
- Mock service: `apps/app-web/src/services/mockApi.js`
- Adapters: `apps/app-web/src/services/fieldAdapters.js`
- App principal: `apps/app-web/src/App.jsx`
- Tests E2E: `apps/app-web/tests/e2e/appweb.smoke.spec.js`

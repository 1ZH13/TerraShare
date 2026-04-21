# Contratos de integracion entre modulos

## 1. Objetivo
Definir un contrato comun para que frontend y backend trabajen en paralelo sin bloquearse.

Estado actual:
- `apps/app-web` usa adaptador mock local (`src/services/mockApi.js`).
- `apps/backend-api` aun no implementa endpoints reales.
- Este documento define el contrato que debe respetar la API real para reemplazo sin romper UI.

## 2. Flujo entre modulos

1. Landing (`apps/landing`) redirige al modulo principal via `VITE_APP_WEB_URL`.
2. App web (`apps/app-web`) consume contrato de datos para:
   - catalogo y filtros,
   - detalle de terreno,
   - crear solicitud,
   - listar solicitudes de arrendatario,
   - listar y decidir solicitudes como propietario.
3. Backend API (`apps/backend-api`) debe implementar las rutas equivalentes.
4. Shared (`packages/shared`) centralizara DTOs y estados cuando exista implementacion compartida.

## 3. Contrato de estados de solicitud

Estados validos:
- `draft`
- `pending_owner`
- `approved`
- `rejected`
- `cancelled`

Reglas de negocio ya aplicadas en mock (deben mantenerse en API real):
1. Solo propietario del terreno puede aprobar/rechazar.
2. Solo solicitudes `pending_owner` pueden transicionar a `approved` o `rejected`.
3. No se puede aprobar una solicitud si solapa fechas con otra solicitud ya aprobada del mismo terreno.

## 4. DTO de Land (lectura)

```json
{
  "id": "land-1",
  "ownerId": "usr-owner-1",
  "name": "Finca El Tamarindo",
  "province": "Los Santos",
  "district": "Las Tablas",
  "type": "Agricultura",
  "monthlyPrice": 420,
  "areaHectares": 5,
  "availableFrom": "2026-05-01",
  "availableTo": "2026-12-31",
  "allowedUses": ["agricultura"],
  "waterSource": "Pozo y rio cercano",
  "summary": "Descripcion breve"
}
```

## 5. DTO de RentalRequest

```json
{
  "id": "req-100",
  "landId": "land-2",
  "tenantId": "usr-tenant-1",
  "startDate": "2026-08-01",
  "endDate": "2026-09-30",
  "intendedUse": "engorde de ganado",
  "message": "Texto libre",
  "status": "pending_owner",
  "createdAt": "2026-04-21T10:00:00.000Z",
  "updatedAt": "2026-04-21T10:00:00.000Z"
}
```

Campos enriquecidos usados por UI (respuesta de listados):
- `landName`
- `ownerId`
- `tenantName`
- `tenantEmail`
- `monthlyPrice`
- `landType`

## 6. Endpoints esperados para backend-api

Auth:
- `POST /auth/login`
- `POST /auth/register`
- `POST /auth/logout`
- `GET /auth/session`

Lands:
- `GET /lands?type=&location=&maxPrice=&availableOn=`
- `GET /lands/:landId`

Rental requests (tenant):
- `POST /rental-requests`
- `GET /rental-requests/me`

Rental requests (owner):
- `GET /owner/rental-requests`
- `PATCH /owner/rental-requests/:requestId/status`

Ejemplo PATCH body:

```json
{
  "status": "approved"
}
```

## 7. Plan de migracion mock -> API real

1. Mantener la interfaz publica del servicio usada por `App.jsx`.
2. Crear `src/services/httpApi.js` con mismas funciones que `mockApi.js`.
3. Activar selector por variable de entorno:
   - `VITE_DATA_SOURCE=mock` (default)
   - `VITE_DATA_SOURCE=api`
4. Reusar E2E existentes para validar que el comportamiento no cambia.

## 8. Referencias
- `apps/app-web/src/services/mockApi.js`
- `apps/app-web/src/App.jsx`
- `apps/app-web/tests/e2e/appweb.smoke.spec.js`

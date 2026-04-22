# admin-dashboard

Panel administrativo de TerraShare.

## Responsabilidades iniciales

- Moderacion de publicaciones
- Gestion de usuarios
- Revision de reportes
- Auditoria basica
- Visualizacion de leads capturados desde landing (issue #6)

## Estado actual

- Login con proteccion por rol `admin` (implementado issue #20).
- Dashboard basico con resumen de metricas (implementado issue #20).
- Sin conexion a backend para leads aun (pendiente de issue futuro).

## Endpoints consumidos

| Endpoint | Uso |
|----------|-----|
| `GET /api/v1/leads` | Listar leads capturados desde la landing. Consumo futuro (issue pendiente). |
| `GET /api/v1/lands` | Moderacion de publicaciones. |
| `GET /api/v1/rental-requests` | Revision de solicitudes pendientes. |

## Dependencias esperadas

- Consumira `backend-api` para moderacion, trazabilidad y gestion de usuarios.
- Reutilizara contratos y estados definidos en:
  `docs/MODULE_INTEGRATION_CONTRACTS.md`

## Reutilizacion recomendada

- Mantener los mismos estados de solicitud (`draft`, `pending_owner`, `approved`,
  `rejected`, `cancelled`) para vistas admin.
- Reusar DTOs cuando se publiquen en `packages/shared`.

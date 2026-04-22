# admin-dashboard

Panel administrativo de TerraShare.

Responsabilidades iniciales:
- Moderacion de publicaciones
- Gestion de usuarios
- Revision de reportes
- Auditoria basica

## Estado actual
- Modulo en fase de planificacion.
- Sin implementacion de UI ni conexion a backend aun.

## Dependencias esperadas
- Consumira `backend-api` para moderacion, trazabilidad y gestion de usuarios.
- Reutilizara contratos y estados definidos en:
	`docs/MODULE_INTEGRATION_CONTRACTS.md`

## Reutilizacion recomendada
- Mantener los mismos estados de solicitud (`draft`, `pending_owner`, `approved`,
	`rejected`, `cancelled`) para vistas admin.
- Reusar DTOs cuando se publiquen en `packages/shared`.

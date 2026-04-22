# shared

Paquete compartido entre modulos para contratos API y tipos de dominio.

## Objetivo
- Mantener tipado consistente entre frontend y backend.
- Evitar drift entre contratos documentados y contratos implementados.

## Contenido actual
- DTOs de auth, lands, rental-requests, contracts, payments, chat y audit.
- Tipos comunes de API (`ApiSuccess`, `ApiFailure`, `ApiResponse`).
- Enums/unions de dominio (roles, estados, filtros).

## Uso

```ts
import type { AuthMeResponseDto, LandDto } from "@terrashare/shared";
```

## Scripts

```bash
bun install
bun run typecheck
bun run build
```

## Notas
- Fuente de contrato funcional para frontend: `apps/backend-api/docs/API_ENDPOINTS.md`.
- Todo cambio breaking en DTOs debe actualizar la documentacion de endpoints.

## Plan inmediato de adopcion
1. Publicar tipos compartidos para `Land` y `RentalRequest` usados por `app-web`.
2. Centralizar enum de estados de solicitud (`draft`, `pending_owner`, `approved`, `rejected`, `cancelled`).
3. Compartir esquemas de validacion para decisiones del propietario (`approved`/`rejected`) y filtros.

## Criterio de adopcion
- `app-web`, `backend-api` y `admin-dashboard` deben consumir este paquete para reducir drift.
- Referencia temporal adicional de alineacion: `docs/MODULE_INTEGRATION_CONTRACTS.md`.

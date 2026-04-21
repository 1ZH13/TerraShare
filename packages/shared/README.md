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

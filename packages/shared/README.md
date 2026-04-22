# shared

Paquete compartido entre modulos para contratos API y tipos de dominio.

## Objetivo

- Mantener tipado consistente entre frontend y backend.
- Evitar drift entre contratos documentados y contratos implementados.

## Contenido

- **DTOs**: auth, lands, rental-requests, contracts, payments, chat, audit.
- **Tipos de API**: `ApiSuccess`, `ApiFailure`, `ApiResponse`, `PaginationMeta`.
- **Enums de dominio**: `RentalRequestStatus`, `LandStatus`, `LandUse`, `AppRole`.

## DTOs disponibles

### Auth
`AuthMeResponseDto`, `UserSummaryDto`, `UserStatus`

### Lands
`LandDto`, `CreateLandDto`, `UpdateLandDto`, `UpdateLandStatusDto`, `LandFilterDto`

### Rental requests
`RentalRequestDto`, `CreateRentalRequestDto`, `UpdateRentalRequestStatusDto`

### Contracts
`ContractDto`, `CreateContractDto`, `UpdateContractStatusDto`

### Payments
`PaymentDto`, `CreateCheckoutSessionDto`

### Chat
`ChatDto`, `ChatMessageDto`, `CreateChatDto`

### Audit
`AuditEventDto`

## Uso

```ts
import type { LandDto, RentalRequestDto } from "@terrashare/shared";
```

## Scripts

```bash
bun install
bun run build       # genera dist/ con .d.ts y .js
bun run typecheck  # validacion de tipos sin emitir archivos
```

## Criterio de adopcion

- `app-web`, `backend-api` y `admin-dashboard` deben consumir este paquete.
- Fuente de verdad para integracion: `docs/MODULE_INTEGRATION_CONTRACTS.md`.
- Contrato de endpoints: `apps/backend-api/docs/API_ENDPOINTS.md`.

## Reglas para cambios

- Todo cambio breaking en DTOs debe actualizar `docs/MODULE_INTEGRATION_CONTRACTS.md`.
- CI verifica typecheck automaticamente en PRs que toquen `packages/shared/`.
- Construir `dist/` antes de consumir desde otros modulos.

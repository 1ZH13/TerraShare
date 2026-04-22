# API endpoints - backend-api (v1)

Este documento define el contrato de rutas para integracion con frontend.

- Base path: `/api/v1`
- Formato: `application/json`
- Auth: `Authorization: Bearer <clerk_token>` en rutas protegidas
- Estado actual: `planned` (sin implementacion productiva todavia)

## Convenciones de respuesta

Respuesta exitosa:

```json
{
  "ok": true,
  "data": {},
  "meta": {
    "requestId": "req_123"
  }
}
```

Respuesta de error:

```json
{
  "ok": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid payload",
    "details": [
      {
        "field": "price",
        "message": "Must be greater than 0"
      }
    ],
    "requestId": "req_123"
  }
}
```

## Roles y acceso

- `public`: no requiere token.
- `user`: requiere token valido de Clerk y usuario activo.
- `admin`: requiere token valido + rol admin.
- `owner`: requiere token valido + ownership del recurso (o admin).

## Estados de implementacion

- `planned`: contrato acordado, aun no implementado.
- `in_progress`: en desarrollo.
- `implemented`: disponible.

## Health

| Metodo | Ruta | Auth | Roles | Estado | Issue |
| --- | --- | --- | --- | --- | --- |
| GET | `/health` | No | public | planned | #9 |

## Auth (Clerk + RBAC)

Notas:
- El login/signup vive en Clerk (Google, Microsoft, OTP email).
- No existe `POST /auth/login` en backend para fase 1.

| Metodo | Ruta | Auth | Roles | Estado | Issue |
| --- | --- | --- | --- | --- | --- |
| GET | `/auth/me` | Si | user, admin | implemented | #23 |
| GET | `/auth/admin/ping` | Si | admin | implemented | #23 |

`GET /auth/me` response example:

```json
{
  "ok": true,
  "data": {
    "id": "usr_01",
    "clerkUserId": "user_2x...",
    "email": "user@example.com",
    "role": "user",
    "status": "active",
    "profile": {
      "fullName": "Chris V",
      "phone": "+50760000000"
    }
  },
  "meta": {
    "requestId": "req_auth_me"
  }
}
```

## Lands

| Metodo | Ruta | Auth | Roles | Estado | Issue |
| --- | --- | --- | --- | --- | --- |
| GET | `/lands` | No | public | implemented | #24 |
| GET | `/lands/:landId` | No | public | implemented | #24 |
| POST | `/lands` | Si | user, admin | implemented | #24 |
| PATCH | `/lands/:landId` | Si | owner, admin | implemented | #24 |
| DELETE | `/lands/:landId` | Si | owner, admin | implemented | #24 |
| PATCH | `/lands/:landId/status` | Si | owner, admin | implemented | #24 |

`GET /lands` query params:

- `page` (default 1)
- `pageSize` (default 20, max 100)
- `sort` (`createdAt`, `price`, `area`)
- `order` (`asc`, `desc`)
- `use` (ej: `agricultura`, `ganaderia`)
- `priceMin`, `priceMax`
- `province`, `district`
- `availableFrom`, `availableTo`

## Rental requests

| Metodo | Ruta | Auth | Roles | Estado | Issue |
| --- | --- | --- | --- | --- | --- |
| POST | `/rental-requests` | Si | user, admin | implemented | #25 |
| GET | `/rental-requests` | Si | user, admin | implemented | #25 |
| GET | `/rental-requests/:requestId` | Si | user, owner, admin | implemented | #25 |
| PATCH | `/rental-requests/:requestId/status` | Si | owner, admin | implemented | #25 |

Estados de solicitud (v1):

- `draft`
- `pending_owner`
- `approved`
- `rejected`
- `cancelled`
- `pending_payment`
- `paid`

## Contracts

| Metodo | Ruta | Auth | Roles | Estado | Issue |
| --- | --- | --- | --- | --- | --- |
| POST | `/contracts` | Si | owner, admin | implemented | #26 |
| GET | `/contracts` | Si | user, owner, admin | implemented | #26 |
| GET | `/contracts/:contractId` | Si | user, owner, admin | implemented | #26 |
| PATCH | `/contracts/:contractId/status` | Si | owner, admin | implemented | #26 |

## Audit events

| Metodo | Ruta | Auth | Roles | Estado | Issue |
| --- | --- | --- | --- | --- | --- |
| GET | `/audit-events` | Si | admin | implemented | #26 |
| GET | `/audit-events/:eventId` | Si | admin | implemented | #26 |

## Payments (Stripe SDK)

| Metodo | Ruta | Auth | Roles | Estado | Issue |
| --- | --- | --- | --- | --- | --- |
| POST | `/payments/checkout-session` | Si | user, admin | planned | #27 |
| GET | `/payments/:paymentId` | Si | user, owner, admin | planned | #27 |
| GET | `/payments` | Si | user, owner, admin | planned | #27 |
| POST | `/webhooks/stripe` | No (firma Stripe) | system | planned | #27 |

`POST /payments/checkout-session` request example:

```json
{
  "rentalRequestId": "rr_01",
  "currency": "USD",
  "successUrl": "http://localhost:5174/payments/success?paymentId={PAYMENT_ID}",
  "cancelUrl": "http://localhost:5174/payments/cancel?paymentId={PAYMENT_ID}"
}
```

`POST /payments/checkout-session` response example:

```json
{
  "ok": true,
  "data": {
    "paymentId": "pay_01",
    "stripeSessionId": "cs_test_123",
    "checkoutUrl": "https://checkout.stripe.com/c/pay/cs_test_123",
    "status": "pending"
  },
  "meta": {
    "requestId": "req_pay_01"
  }
}
```

## Chat y contacto externo

| Metodo | Ruta | Auth | Roles | Estado | Issue |
| --- | --- | --- | --- | --- | --- |
| GET | `/chats` | Si | user, owner, admin | planned | #28 |
| POST | `/chats` | Si | user, owner, admin | planned | #28 |
| GET | `/chats/:chatId/messages` | Si | user, owner, admin | planned | #28 |
| POST | `/chats/:chatId/messages` | Si | user, owner, admin | planned | #28 |
| GET | `/chats/:chatId/external-contact` | Si | user, owner, admin | planned | #28 |

`GET /chats/:chatId/external-contact` response example:

```json
{
  "ok": true,
  "data": {
    "whatsappEnabled": true,
    "contact": {
      "phone": "+50760000000",
      "displayName": "Propietario"
    }
  },
  "meta": {
    "requestId": "req_chat_contact_01"
  }
}
```

## Shared contracts (packages/shared)

Para mantener front/back sincronizados (issue #29), los DTOs deben exponerse en `packages/shared`:

- `AuthMeResponseDto`
- `LandDto`, `CreateLandDto`, `UpdateLandDto`, `LandFilterDto`
- `RentalRequestDto`, `CreateRentalRequestDto`, `UpdateRentalRequestStatusDto`
- `ContractDto`
- `PaymentDto`, `CreateCheckoutSessionDto`
- `ChatDto`, `ChatMessageDto`

## Notas para frontend

- Tratar este archivo como contrato de integracion hasta que cada endpoint pase a `implemented`.
- Para vistas publicas usar `GET /lands` y `GET /lands/:landId` sin token.
- Para cualquier accion transaccional usar token de Clerk.

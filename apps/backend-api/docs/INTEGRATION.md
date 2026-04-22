# Integracion frontend - backend-api

Guia practica para equipos frontend que integran con backend-api.

## 1. Resumen rapido

- Auth: Clerk (Google OAuth, Microsoft OAuth, OTP por email).
- API auth: token JWT de Clerk via `Authorization: Bearer <token>`.
- Pagos: Stripe SDK con Checkout Session.
- Confirmacion de pago: webhook Stripe en backend.
- Operaciones admin: moderacion de publicaciones y gestion de estados de usuario.

## 2. Flujo de autenticacion (Clerk)

### Lo que hace frontend

1. Mostrar opciones de acceso en UI:
   - Continuar con Google
   - Continuar con Microsoft
   - Continuar con OTP por email
2. Completar el flujo en Clerk.
3. Obtener `session token` de Clerk.
4. Enviar token al backend en rutas protegidas.

### Lo que hace backend

1. Verifica JWT con Clerk JWKS.
2. Busca o crea usuario interno mapeado al `clerkUserId`.
3. Responde contexto de sesion de aplicacion en `GET /api/v1/auth/me`.
4. Aplica RBAC por `role` (`user`, `admin`) y ownership.

Estado implementado actual:
- `GET /api/v1/auth/me` (token valido requerido).
- `GET /api/v1/auth/admin/ping` (token valido + rol admin).
- `GET/POST/PATCH/DELETE /api/v1/lands...` con filtros, paginacion y ownership.
- `GET /api/v1/lands`, `GET /api/v1/lands/:landId` (publicos).
- `POST/GET/PATCH /api/v1/rental-requests...` con flujo de estados.
- `POST/GET/PATCH /api/v1/contracts...` con auditoria.
- `POST/GET /api/v1/payments...` y webhook Stripe.
- `GET/POST /api/v1/chats...` y mensajes/contacto externo.
- `GET/PATCH /api/v1/admin/lands...` para moderacion.
- `GET/PATCH /api/v1/admin/users...` para bloqueo/reactivacion.

## 3. Header de autorizacion

Ejemplo de request autenticado:

```http
GET /api/v1/auth/me HTTP/1.1
Host: api.terrashare.local
Authorization: Bearer <clerk_jwt>
Content-Type: application/json
```

Si falta token o es invalido, el backend responde `401`.

## 4. Flujo de pagos (Stripe Checkout Session)

### Step-by-step

1. Front crea solicitud de alquiler (o usa una ya aprobada).
2. Front llama `POST /api/v1/payments/checkout-session`.
3. Backend crea session en Stripe y devuelve `checkoutUrl`.
4. Front redirige al usuario a `checkoutUrl`.
5. Stripe redirige a `successUrl` o `cancelUrl`.
6. Stripe envia webhook a `POST /api/v1/webhooks/stripe`.
7. Backend actualiza estado de pago y solicitud.
8. Front consulta `GET /api/v1/payments/:paymentId` para estado final.

### Regla clave

- No usar `successUrl` como confirmacion final.
- Estado final siempre viene del backend (actualizado por webhook).

## 5. Matriz pantalla -> endpoint

| Pantalla frontend | Endpoint principal | Auth |
| --- | --- | --- |
| Home publica / catalogo | `GET /api/v1/lands` | No |
| Detalle terreno publico | `GET /api/v1/lands/:landId` | No |
| Dashboard usuario | `GET /api/v1/auth/me` | Si |
| Login admin dashboard | `GET /api/v1/auth/me` | Si |
| Guarda admin dashboard | `GET /api/v1/auth/admin/ping` | Si |
| Publicar terreno | `POST /api/v1/lands` | Si |
| Editar terreno propio | `PATCH /api/v1/lands/:landId` | Si |
| Crear solicitud alquiler | `POST /api/v1/rental-requests` | Si |
| Aprobar/Rechazar solicitud | `PATCH /api/v1/rental-requests/:requestId/status` | Si |
| Iniciar pago | `POST /api/v1/payments/checkout-session` | Si |
| Estado de pago | `GET /api/v1/payments/:paymentId` | Si |
| Lista de chats | `GET /api/v1/chats` | Si |
| Mensajes de chat | `GET /api/v1/chats/:chatId/messages` | Si |
| Contacto externo | `GET /api/v1/chats/:chatId/external-contact` | Si |
| Cola moderacion admin | `GET /api/v1/admin/lands/pending` | Si |
| Decision moderacion admin | `PATCH /api/v1/admin/lands/:landId/moderate` | Si |
| Listado de usuarios admin | `GET /api/v1/admin/users` | Si |
| Suspender/reactivar usuario | `PATCH /api/v1/admin/users/:userId/status` | Si |
| Auditoria admin | `GET /api/v1/audit-events` | Si |

## 6. Variables de entorno necesarias

Backend:

- `API_PORT`
- `API_BASE_URL`
- `MONGODB_URI`
- `CLERK_JWKS_URL`
- `CLERK_ISSUER`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `WHATSAPP_CONTACT_ENABLED`
- `ALLOW_DEV_AUTH_BYPASS` (solo local/test)

Frontend:

- `VITE_API_BASE_URL`
- `VITE_CLERK_PUBLISHABLE_KEY`
- `VITE_API_PROXY_TARGET` (frontend local con proxy)

## 7. Codigos de error comunes

- `400 VALIDATION_ERROR`: payload invalido.
- `401 UNAUTHORIZED`: token ausente/invalido/expirado.
- `403 FORBIDDEN`: rol insuficiente o recurso sin ownership.
- `404 NOT_FOUND`: recurso inexistente.
- `409 CONFLICT`: estado invalido o solape de alquiler.
- `422 BUSINESS_RULE_VIOLATION`: regla de dominio no cumplida.
- `500 INTERNAL_ERROR`: error inesperado.

## 8. Checklist para frontend antes de integrar

- Confirmar que token de Clerk llega correctamente en cada request protegida.
- Implementar refresh de sesion en cliente segun SDK de Clerk.
- Tratar todas las transiciones de pago como asincronas por webhook.
- Manejar estados de solicitud (`pending_owner`, `approved`, `rejected`, `cancelled`, `pending_payment`, `paid`).
- Mostrar errores por `error.code` y `error.message`.

## 9. Referencias

- Endpoints detallados: [API_ENDPOINTS.md](API_ENDPOINTS.md)
- Contexto de arquitectura: [`docs/ARCHITECTURE.md`](../../../docs/ARCHITECTURE.md)
- Reglas de negocio: [`docs/PRD.md`](../../../docs/PRD.md)

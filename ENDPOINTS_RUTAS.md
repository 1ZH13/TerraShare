# ENDPOINTS_RUTAS.md

> Documentación completa de endpoints del backend, rutas del frontend y guía de contribución.

---

## 1. Endpoints del Backend API

### lands.ts
| Método | Ruta | Descripción | Auth |
|-------|------|-------------|------|
| GET | `/api/v1/lands` | Lista tierras con filtros | Público |
| GET | `/api/v1/lands/:landId` | Obtener tierra por ID | Público |
| POST | `/api/v1/lands` | Crear nueva tierra | Required |
| PATCH | `/api/v1/lands/:landId` | Actualizar tierra | Owner/Admin |
| PATCH | `/api/v1/lands/:landId/status` | Cambiar estado | Owner/Admin |
| DELETE | `/api/v1/lands/:landId` | Eliminar tierra | Owner/Admin |

**Filtros:** `use`, `province`, `district`, `priceMin`, `priceMax`, `availableFrom`, `availableTo`, `sort`, `order`, `page`, `pageSize`

### rental-requests.ts
| Método | Ruta | Descripción | Auth |
|-------|------|-------------|------|
| GET | `/api/v1/rental-requests` | Lista solicitudes | User |
| GET | `/api/v1/rental-requests/:requestId` | Obtener solicitud | User |
| POST | `/api/v1/rental-requests` | Crear solicitud | User |
| PATCH | `/api/v1/rental-requests/:requestId/status` | Cambiar estado | Owner/Admin |

### contracts.ts
| Método | Ruta | Descripción | Auth |
|-------|------|-------------|------|
| GET | `/api/v1/contracts` | Lista contratos | User |
| GET | `/api/v1/contracts/:contractId` | Obtener contrato | User |
| POST | `/api/v1/contracts` | Crear contrato | User |
| PATCH | `/api/v1/contracts/:contractId/status` | Cambiar estado | Owner/Admin |
| POST | `/api/v1/contracts/:contractId/sign` | Firmar contrato | User |
| POST | `/api/v1/contracts/:contractId/complete` | Completar contrato | User |
| GET | `/api/v1/audit-events` | Lista eventos auditoría | Admin |
| GET | `/api/v1/audit-events/:eventId` | Detalle evento | Admin |

### payments.ts
| Método | Ruta | Descripción | Auth |
|-------|------|-------------|------|
| POST | `/api/v1/payments/checkout-session` | Crear sesión Stripe | User |
| GET | `/api/v1/payments` | Lista pagos | User |
| GET | `/api/v1/payments/:paymentId` | Obtener pago | User |
| POST | `/api/v1/webhooks/stripe` | Webhook Stripe | Webhook |

### chat.ts
| Método | Ruta | Descripción | Auth |
|-------|------|-------------|------|
| GET | `/api/v1/chats` | Lista chats | User |
| POST | `/api/v1/chats` | Crear chat | User |
| GET | `/api/v1/chats/:chatId/messages` | Obtener mensajes | User |
| POST | `/api/v1/chats/:chatId/messages` | Enviar mensaje | User |
| GET | `/api/v1/chats/:chatId/external-contact` | Contacto WhatsApp | User |

### admin.ts
| Método | Ruta | Descripción | Auth |
|-------|------|-------------|------|
| GET | `/api/v1/admin/users` | Lista usuarios | Admin |
| GET | `/api/v1/admin/users/:userId` | Detalle usuario | Admin |
| PATCH | `/api/v1/admin/users/:userId/status` | Cambiar estado | Admin |
| GET | `/api/v1/admin/lands` | Lands para moderación | Admin |
| PATCH | `/api/v1/admin/lands/:landId/status` | Aprobar/rechazar | Admin |
| GET | `/api/v1/admin/summary` | Dashboard summary | Admin |
| GET | `/api/v1/admin/rental-requests` | Solicitudes (admin) | Admin |

### analytics.ts
| Método | Ruta | Descripción | Auth |
|-------|------|-------------|------|
| GET | `/api/v1/analytics/overview` | Dashboard overview | Admin |
| GET | `/api/v1/analytics/lands` | Lands por provincia | Admin |
| GET | `/api/v1/analytics/requests` | Requests analytics | Admin |
| GET | `/api/v1/analytics/owner/:ownerId` | Owner analytics | Admin |

### Otros endpoints
| Método | Ruta | Descripción | Auth |
|-------|------|-------------|------|
| GET | `/api/v1/health` | Health check | Público |
| GET | `/api/v1/auth/me` | Current user | Required |
| GET | `/api/v1/auth/admin/ping` | Admin check | Admin |
| POST | `/api/v1/leads` | Crear lead | Público |
| GET | `/api/v1/leads` | Lista leads | Admin |
| GET | `/api/v1/notifications` | Lista notificaciones | User |
| PATCH | `/api/v1/notifications/:notificationId/read` | Marcar leída | User |

---

## 2. Frontend API Service

**Archivo:** `apps/web/src/services/api.js`

### Funciones exportadas

| Función | Endpoint | Descripción |
|---------|----------|-------------|
| `listLands(filters)` | GET `/api/v1/lands` | Lista tierras con filtros |
| `getLandById(landId)` | GET `/api/v1/lands/:landId` | Obtener tierra |
| `createRentalRequest(payload)` | POST `/api/v1/rental-requests` | Crear solicitud |
| `listRentalRequests()` | GET `/api/v1/rental-requests` | Lista solicitudes |
| `createCheckoutSession(payload)` | POST `/api/v1/payments/checkout-session` | Crear sesión pago |
| `getPaymentsByRequest(rentalRequestId)` | GET `/api/v1/payments` | Lista pagos |
| `getChats()` | GET `/api/v1/chats` | Lista chats |
| `createChat(payload)` | POST `/api/v1/chats` | Crear chat |
| `getMessages(chatId)` | GET `/api/v1/chats/:chatId/messages` | Obtener mensajes |
| `sendMessage(chatId, text)` | POST `/api/v1/chats/:chatId/messages` | Enviar mensaje |
| `getExternalContact(chatId)` | GET `/api/v1/chats/:chatId/external-contact` | Contacto WhatsApp |
| `adaptLand(land)` | - | Adapta tierra para detail |
| `adaptLandForCatalog(land)` | - | Adapta tierra para catálogo |

### Adaptadores

```javascript
// Adapta землю para detail page
const adapted = adaptLand(land);
// Para catálogo
const catalog = adaptLandForCatalog(land);
```

---

## 3. Rutas del Frontend

**Archivo:** `apps/web/src/App.jsx`

| Ruta | Página | Auth | Componente |
|------|-------|------|-----------|
| `/` | LandingPage | Público | LandingPage.jsx |
| `/catalog` | CatalogPage | User | CatalogPage.jsx |
| `/lands/:id` | LandDetailPage | Público | LandDetailPage.jsx |
| `/reserve/:landId` | ReservePage | User | ReservePage.jsx |
| `/login` | Login | Público | Login.jsx |
| `/register` | Register | Público | Register.jsx |
| `/checkout/success` | PaymentSuccess | User | PaymentSuccessPage.jsx |
| `/checkout/cancel` | PaymentCancel | User | PaymentCancelPage.jsx |
| `/dashboard` | Dashboard | User | DashboardPage.jsx |
| `/dashboard/lands` | MyLands | User | MyLandsPage.jsx |
| `/dashboard/chats` | Chats | User | ChatsPage.jsx |
| `/dashboard/notifications` | Notifications | User | NotificationsPage.jsx |
| `/dashboard/payments` | Payments | User | PaymentsPage.jsx |
| `/dashboard/profile` | Profile | User | ProfilePage.jsx |
| `/dashboard/admin` | AdminDashboard | Admin | AdminDashboardPage.jsx |
| `/dashboard/admin/users` | AdminUsers | Admin | AdminUsersPage.jsx |
| `/dashboard/admin/lands` | AdminLands | Admin | AdminLandsPage.jsx |

### Layouts

- **Público:** `PublicHeader` (solo nav pública)
- **User:** `UserDashboardLayout` (nav + sidebar)
- **Admin:** `AdminLayout` (nav + sidebar admin)

---

## 4. Guía de Contribución

### Estructura de Ramas

```
feature/web/<issue-id>-<slug>        # Frontend
feature/backend-api/<issue-id>-<slug>  # Backend
fix/<issue-id>-<slug>             # Fix
chore/<slug>                     # Chore
```

### Commits

```bash
# Features
git commit -m "feat(backend-api): add new endpoint"
git commit -m "feat(web): add new page"

# Fixes
git commit -m "fix: resolve issue"

# Chores
git commit -m "chore: update dependencies"
```

### Flujo de Trabajo

1. **Crear rama desde main:**
   ```bash
   git checkout main
   git pull origin main
   git checkout -b feature/web/123-description
   ```

2. **Hacer cambios:**
   ```bash
   git add .
   git commit -m "feat: description"
   ```

3. **Push y PR:**
   ```bash
   git push -u origin feature/web/123-description
   gh pr create --title "feat(web): ..." --body "Closes #123"
   ```

### Requisitos de PR

- 1 revisor obligatorio
- Todos los checks en verde
- Body debe incluir keyword: `Closes #`, `Fixes #`, `Resolves #`
- No merge directo a main

### Comandos de Desarrollo

```bash
# Frontend
cd apps/web && bun run dev          # Puerto 5173

# Backend
cd apps/backend-api && bun run dev   # Puerto 3000

# E2E Tests
cd apps/web && bun run test:e2e
```

---

## 5. Migración Pendiente

### Routes que necesitan migración a MongoDB

- [ ] routes/rental-requests.ts
- [ ] routes/contracts.ts
- [ ] routes/payments.ts
- [ ] routes/chat.ts
- [ ] routes/admin.ts
- [ ] routes/leads.ts
- [ ] routes/analytics.ts
- [ ] routes/notifications.ts

### Pages que necesitan revisión

- [ ] CatalogPage.jsx - listLands
- [ ] LandDetailPage.jsx - getLandById
- [ ] ReservePage.jsx - createRentalRequest
- [ ] MyLandsPage.jsx - lands del usuario
- [ ] ChatsPage.jsx - getChats, getMessages
- [ ] PaymentsPage.jsx - getPayments
- [ ] AdminDashboardPage.jsx - analytics

---

## Notas

- El backend usa MongoDB con fallback in-memory
- El frontend consume todos los endpoints listados
- La autenticación es via Clerk (Bearer token)
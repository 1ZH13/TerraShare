# TerraShare - Guia de Ejecucion del Proyecto

## Arquitectura Actual

```
terrashare/
├── apps/
│   ├── backend-api/       # Hono + Mongoose + MongoDB (Bun runtime)
│   └── web/               # TanStack Start + React + Clerk (Vite SSR)
├── packages/
│   └── shared/            # DTOs y tipos compartidos
└── docs/
    └── historias-usuario/  # 92 historias de usuario
```

**Stack Tecnologico:**
- **Runtime:** Bun
- **Backend:** Hono (framework HTTP) + Mongoose (MongoDB ODM)
- **Frontend:** TanStack Start (SSR) + React 18 + TanStack Router (file-based)
- **Auth:** Clerk (`@clerk/tanstack-react-start`)
- **Pagos:** Stripe (`@stripe/react-stripe-js`)
- **Mapas:** Leaflet + react-leaflet (SSR via dynamic imports)
- **i18n:** react-i18next (ES/EN)
- **Testing:** Bun test (backend) + Playwright (E2E)
- **CI/CD:** GitHub Actions

---

## Como Ejecutar el Proyecto

### 1. Instalar dependencias

```bash
# Desde la raiz
bun install

# Backend
cd apps/backend-api && bun install

# Frontend
cd apps/web && bun install
```

### 2. Variables de entorno

#### 2a. Crear cuenta de Clerk (gratuita)

1. Ve a [clerk.com](https://clerk.com) y crea una cuenta
2. Crea una nueva Application (elige "Email" como metodo de auth)
3. En el Dashboard de Clerk, ve a **API Keys**
4. Copia las siguientes claves:
   - **Publishable Key** (empieza con `pk_test_...`)
   - **Secret Key** (empieza con `sk_test_...`)
   - **Issuer URL** (empieza con `https://...clerk.accounts.dev`)
5. En **Paths** del Clerk Dashboard, copia el **JWKS URL** (esta en la seccion de JWT Templates)

#### 2b. Backend

```bash
cp apps/backend-api/.env.example apps/backend-api/.env
```

Edita `apps/backend-api/.env` con estos valores minimos:
```env
API_PORT=3000
API_BASE_URL=http://localhost:3000
MONGODB_URI=mongodb://localhost:27017/terrashare
CLERK_JWKS_URL=https://tu-instancia.clerk.accounts.dev/.well-known/jwks.json
CLERK_ISSUER=https://tu-instancia.clerk.accounts.dev
CLERK_SECRET_KEY=sk_test_tu_secret_key
ALLOW_DEV_AUTH_BYPASS=true
STRIPE_SECRET_KEY=sk_test_...          # opcional para demo
STRIPE_WEBHOOK_SECRET=whsec_...       # opcional para demo
WHATSAPP_CONTACT_ENABLED=false
CORS_ALLOWED_ORIGINS=http://localhost:5173
```

#### 2c. Frontend

```bash
cp apps/web/.env.example apps/web/.env
```

Edita `apps/web/.env` con estos valores:
```env
VITE_API_BASE_URL=http://localhost:3000
VITE_CLERK_PUBLISHABLE_KEY=pk_test_tu_publishable_key
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...  # opcional para demo
```

**Sin la `VITE_CLERK_PUBLISHABLE_KEY` el login/registro no funcionaran.**

### 3. Base de datos

```bash
# MongoDB local o Atlas
# El backend usa Mongoose, se conecta automaticamente al iniciar
```

### 4. Ejecutar en desarrollo

```bash
# Terminal 1 - Backend (puerto 3000)
cd apps/backend-api
bun run dev

# Terminal 2 - Frontend (puerto 5173)
cd apps/web
bun run dev
```

**Importante:** El frontend ahora usa TanStack Start (SSR), asi que:
- El dev server arranca en `http://localhost:5173`
- No es un SPA, tiene server-side rendering
- Las rutas se generan automaticamente via file-based routing

### 5. Verificar

```bash
# Typecheck backend
cd apps/backend-api && bun run typecheck

# Typecheck frontend
cd apps/web && bun run typecheck

# Tests backend (69 tests)
cd apps/backend-api && bun test

# Build frontend
cd apps/web && bun run build

# E2E tests (18 tests)
cd apps/web && bun run test:e2e
```

---

## Features Implementadas (10 Nuevas)

### Backend - 10 Features Funcionales

| # | Feature | Archivo | HU |
|---|---------|---------|-----|
| 1 | **Privacy/GDPR Center** | `routes/privacy.ts` | HU-57 |
| 2 | **Notificaciones Reales** | `routes/notifications.ts` + `db/schemas.ts` | HU-60 |
| 3 | **Busqueda Full-Text** | `routes/lands.ts` (`?q=` param) | HU-59 |
| 4 | **Admin Observability** | `routes/metrics.ts` | HU-45 |
| 5 | **Audit Log** | `routes/audit.ts` | HU-92 |
| 6 | **Rate Limit Feedback** | `routes/rental-requests.ts` (429 handling) | HU-40 |
| 7 | **Form Validation** | `routes/rental-requests.ts` (field errors) | - |
| 8 | **Contract Status** | `routes/contracts.ts` (status tracker) | - |
| 9 | **Error Handler** | `middleware/error-handler.ts` (Chris) | HU-49 |
| 10 | **Security Headers** | `middleware/security-headers.ts` (Chris) | HU-39 |

### Frontend - 10 Features Funcionales

| # | Feature | Archivo | Pagina |
|---|---------|---------|--------|
| 1 | **Privacy Page** | `pages/PrivacyPage.tsx` | `/dashboard/privacy` |
| 2 | **Notifications Page** | `pages/NotificationsPage.tsx` | `/dashboard/notifications` |
| 3 | **Language Toggle** | `components/LanguageSwitcher.tsx` | Header (todos) |
| 4 | **Search en Catalogo** | `pages/CatalogPage.tsx` (filtro `?q=`) | `/catalog` |
| 5 | **Observability Dashboard** | `pages/AdminObservabilityPage.tsx` | `/dashboard/admin/observability` |
| 6 | **Error Boundary** | `components/ErrorFallback.tsx` (reescrito) | Global |
| 7 | **Form Validation** | `pages/ReservePage.tsx` (errores por campo) | `/reserve/:landId` |
| 8 | **Rate Limit Banner** | `components/RateLimitBanner.tsx` | Global (429) |
| 9 | **Audit Log Viewer** | `pages/AdminAuditPage.tsx` | `/dashboard/admin/audit` |
| 10 | **Contract Tracker** | `pages/ContractsPage.tsx` (progreso visual) | `/dashboard/contracts` |

---

## Migracion TanStack Start (Completada)

### Que cambio

| Antes | Despues |
|-------|---------|
| React Router DOM v6 | TanStack Router (file-based) |
| Vite SPA (client-only) | TanStack Start (SSR + streaming) |
| `@clerk/clerk-react` | `@clerk/tanstack-react-start` |
| `main.tsx` + `App.tsx` | `routes/__root.tsx` + `routeTree.gen.ts` |
| Rutas en JSX (`<Route>`) | Archivos en `src/routes/` |
| `index.html` | Meta tags en `__root.tsx` |

### Estructura de rutas

```
src/routes/
├── __root.tsx                    # Root: ClerkProvider, i18n, estilos, meta tags
├── index.tsx                     # / → LandingPage
├── catalog.tsx                   # /catalog → CatalogPage
├── lands.$id.tsx                 # /lands/:id → LandDetailPage
├── login.tsx                     # /login
├── register.tsx                  # /register
├── reserve.$landId.tsx           # /reserve/:landId (Protected)
├── checkout/
│   ├── success.tsx               # /checkout/success
│   └── cancel.tsx                # /checkout/cancel
├── dashboard/
│   ├── __layout.tsx              # Layout wrapper (UserDashboardLayout)
│   ├── index.tsx                 # /dashboard
│   ├── lands.tsx                 # /dashboard/lands
│   ├── chats.tsx                 # /dashboard/chats
│   ├── notifications.tsx         # /dashboard/notifications
│   ├── payments.tsx              # /dashboard/payments
│   ├── profile.tsx               # /dashboard/profile
│   ├── privacy.tsx               # /dashboard/privacy
│   ├── contracts.tsx             # /dashboard/contracts
│   └── admin/
│       ├── __layout.tsx          # Admin layout wrapper
│       ├── index.tsx             # /dashboard/admin
│       ├── users.tsx             # /dashboard/admin/users
│       ├── lands.tsx             # /dashboard/admin/lands
│       ├── leads.tsx             # /dashboard/admin/leads
│       ├── observability.tsx     # /dashboard/admin/observability
│       └── audit.tsx             # /dashboard/admin/audit
```

### Manejo de SSR

- **Leaflet:** Dynamic import + `ClientOnly` wrapper (no SSR)
- **Stripe:** Se mantiene client-side
- **Clerk:** `ClerkProvider` en `__root.tsx` (client-side auth)

---

## Comandos Rapidos

```bash
# Ejecutar todo en paralelo
bun run dev

# Solo backend
bun run dev:api

# Solo frontend
bun run dev:web

# Verificar todo
bun run build

# Tests
cd apps/backend-api && bun test
cd apps/web && bun run test:e2e
```

---

## Project Board

URL: https://github.com/users/1ZH13/projects/1/views/1

### Issues Completadas en Este Sprint

| Issue | Titulo | Status |
|-------|--------|--------|
| #157 | [HU-39] Cabeceras de seguridad y CORS | Done (Chris PR #227) |
| #175 | [HU-57] Privacidad y retencion de datos | Done |
| #176 | [HU-59] Busqueda full-text y geoespacial | Done |
| #177 | [HU-60] Notificaciones reales | Done |
| #179 | [HU-62] Internacionalizacion (i18n) | Done |
| #163 | [HU-45] Metricas y dashboards | Done |
| #167 | [HU-49] Manejo centralizado de errores | Done |

### Estado Actual del Repositorio

- **Branch:** `feature/all-changes-consolidated`
- **Commits:** 2 commits nuevos (features + merge de Chris)
- **Tests:** 69 backend + 18 E2E = 87 tests pasando
- **Build:** Frontend y backend compilan sin errores
- **Typecheck:** 0 errores en ambos paquetes

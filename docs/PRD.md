# PRD - TerraShare

## 1. Resumen del producto

TerraShare es una plataforma de alquiler de terrenos para agricultura, ganadería u otros usos productivos.

Objetivo principal:
- Conectar propietarios de terrenos con personas o empresas que necesiten alquilar terreno por periodos definidos.

Resultado esperado del MVP:
- Publicar terrenos.
- Buscar terrenos en listado y mapa con filtros.
- Solicitar alquiler.
- Gestionar aprobación/rechazo de solicitudes.
- Ver estado de contratos y pagos.

## 2. Problema

Hoy el alquiler de terrenos suele manejarse por contactos informales, sin trazabilidad y sin datos estandarizados.

Dolores principales:
- Poca visibilidad de terrenos disponibles.
- Información incompleta de ubicación, tipo de suelo, agua, acceso y restricciones.
- Proceso lento para llegar a acuerdos.
- Falta de historial de solicitudes, acuerdos y cumplimiento.

## 3. Usuarios y roles

| Rol | Descripción |
|-----|-------------|
| **Propietario** | Publica terrenos, define condiciones, revisa solicitudes |
| **Arrendatario** | Busca terrenos, solicita alquiler, hace seguimiento de su solicitud |
| **Administrador** | Modera publicaciones, gestiona reportes, aplica políticas |

### Criterios de acceso

| Acción | Invitado | Usuario | Propietario | Admin |
|--------|---------|---------|-------------|-------|
| Ver catálogo de terrenos | Sí | Sí | Sí | Sí |
| Ver detalle de terreno | Sí | Sí | Sí | Sí |
| Registrar/login | Sí | Sí | Sí | Sí |
| Publicar terreno | No | No | Sí | Sí |
| Solicitar alquiler | No | Sí | Sí | Sí |
| Aprobar/rechazar solicitudes | No | No | Sí | Sí |
| Chatear | No | Sí | Sí | Sí |
| Gestionar tierras propias | No | No | Sí | Sí |
| Moderar contenido | No | No | No | Sí |
| Acceder al panel admin | No | No | No | Sí |

## 4. Roadmap de desarrollo

### Fase 1 - MVP Core

**Objetivo:** Lanzar la funcionalidad básica de marketplace.

| Módulo | Features |
|--------|----------|
| **Autenticación** | Registro con Clerk, login, logout, gestión de sesión |
| **Catálogo** | Listado público de terrenos, filtros por ubicación/tipo/precio, vista mapa con Leaflet |
| **Publicación** | Formulario de publicación con datos del terreno, ubicación, fotos, precio, usos permitidos |
| **Solicitudes** | Envío de solicitud de alquiler con fechas y uso propuesto |
| **Gestión de solicitudes** | Aprobación/rechazo por propietario |
| **Chat** | Chat interno entre propietario y arrendatario, opción WhatsApp |
| **Pagos** | Checkout con Stripe, seguimiento de pagos |
| **Dashboard usuario** | Mis solicitudes, mis tierras, mis chats, historial de pagos, perfil |

### Fase 2 - Gestión y crecimiento

**Objetivo:** Completar la experiencia y preparar escalabilidad.

| Módulo | Features |
|--------|----------|
| **Contratos** | Generación de contrato, flujo de firma, gestión de estado |
| **Notificaciones** | Email/in-app para cambios de estado, recordatorios |
| **Analytics usuario** | Estadísticas básicas para propietarios (visitas, solicitudes) |
| **Panel Admin** | Gestión de usuarios, moderación de tierras, métricas globales |

### Fase 3 - Expansión (futuro)

- Geoespacial avanzado (cálculo de rutas, áreas)
- Verificación de identidad
- Facturación y conciliaciones
- App móvil

## 5. Requerimientos funcionales

### 5.1 Autenticación y usuarios

| ID | Requisito |
|----|-----------|
| AUTH-01 | El sistema debe permitir registro con email mediante Clerk |
| AUTH-02 | El sistema debe permitir login con Clerk |
| AUTH-03 | El sistema debe permitir logout |
| AUTH-04 | El sistema debe almacenar el rol del usuario (user/admin) |
| AUTH-05 | El sistema debe permitir editar perfil (nombre completo, teléfono) |
| AUTH-06 | El sistema debe bloquear usuarios que incumplan políticas |

### 5.2 Catálogo y búsqueda

| ID | Requisito |
|----|-----------|
| CAT-01 | El sistema debe mostrar un listado de terrenos disponibles |
| CAT-02 | El sistema debe filtrar por provincia/distrito |
| CAT-03 | El sistema debe filtrar por tipo de uso permitido |
| CAT-04 | El sistema debe filtrar por rango de precio |
| CAT-05 | El sistema debe filtrar por rango de área |
| CAT-06 | El sistema debe mostrar vista de mapa con marcadores |
| CAT-07 | El sistema debe mostrar detalle de cada terreno públicamente |
| CAT-08 | El sistema debe permitir búsqueda por texto |

### 5.3 Publicación de terrenos

| ID | Requisito |
|----|-----------|
| PUB-01 | El sistema debe permitir crear publicaciones de terreno |
| PUB-02 | El sistema debe permitir editar publicaciones propias |
| PUB-03 | El sistema debe permitir desactivar/publicar publicaciones propias |
| PUB-04 | El sistema debe validar campos requeridos: título, área, ubicación, precio, usos |
| PUB-05 | El sistema debe almacenar ubicación con coordenadas geográficas |
| PUB-06 | El sistema debe soportar múltiples fotos por terreno |
| PUB-07 | El sistema debe permitir definir precios con moneda USD/PAB |
| PUB-08 | El sistema debe permitir definir usos permitidos (agricultura, ganadería, etc.) |

### 5.4 Solicitudes de alquiler

| ID | Requisito |
|----|-----------|
| SOL-01 | El sistema debe permitir enviar solicitud de alquiler con fecha inicio, fecha fin y uso propuesto |
| SOL-02 | El sistema debe notificar al propietario de nuevas solicitudes |
| SOL-03 | El propietario debe poder aprobar o rechazar solicitudes |
| SOL-04 | El sistema debe impedir alquileres que se solapen en tiempo para el mismo terreno |
| SOL-05 | El sistema debe registrar el historial de estados de cada solicitud |
| SOL-06 | El arrendatario debe poder cancelar su solicitud antes de ser aprobada |

### 5.5 Chat y comunicación

| ID | Requisito |
|----|-----------|
| CHAT-01 | El sistema debe permitir chat interno entre propietario y arrendatario |
| CHAT-02 | El sistema debe asociar chat a una solicitud de alquiler específica |
| CHAT-03 | El sistema debe mostrar botón de contacto WhatsApp si el usuario tiene configurado teléfono |
| CHAT-04 | El chat debe estar vinculado a la tierra relacionada |

### 5.6 Pagos

| ID | Requerimiento |
|----|---------------|
| PAY-01 | El sistema debe crear sesión de checkout con Stripe |
| PAY-02 | El sistema debe registrar el pago asociado a la solicitud |
| PAY-03 | El sistema debe manejar webhooks de Stripe para confirmación |
| PAY-04 | El sistema debe mostrar historial de pagos al usuario |
| PAY-05 | El pago debe cambiar el estado de la solicitud a "paid" |

### 5.7 Dashboard

| ID | Requerimiento |
|----|---------------|
| DASH-01 | El sistema debe mostrar las solicitudes del usuario |
| DASH-02 | El sistema debe mostrar las tierras publicadas por el usuario |
| DASH-03 | El sistema debe mostrar los chats activos del usuario |
| DASH-04 | El sistema debe mostrar el historial de pagos del usuario |
| DASH-05 | El sistema debe permitir editar el perfil del usuario |

### 5.8 Panel de administración

| ID | Requerimiento |
|----|---------------|
| ADMIN-01 | El administrador debe poder ver lista de usuarios |
| ADMIN-02 | El administrador debe poder bloquear/desbloquear usuarios |
| ADMIN-03 | El administrador debe poder ver lista de tierras |
| ADMIN-04 | El administrador debe poder aprobar/desactivar tierras |
| ADMIN-05 | El administrador debe poder ver métricas generales |

## 6. Reglas de negocio

| ID | Regla |
|----|-------|
| RN-01 | Un terreno puede tener uno o más usos permitidos (agricultura, ganadería, etc.) |
| RN-02 | Un terreno no puede tener dos alquileres aprobados que se solapen en tiempo |
| RN-03 | Solo el propietario de un terreno puede aprobar o rechazar solicitudes de ese terreno |
| RN-04 | Usuarios bloqueados no pueden publicar terrenos ni solicitar alquiler |
| RN-05 | Solicitudes deben tener estado: draft, pending_owner, approved, rejected, cancelled, pending_payment, paid |
| RN-06 | Contratos deben tener estado: draft, pending_owner_signature, pending_tenant_signature, signed, completed, cancelled |
| RN-07 | Pagos deben tener estado: pending, completed, failed, refunded |

## 7. Stack tecnológico

### Frontend - apps/web

| Tecnología | Versión | Uso |
|------------|---------|-----|
| React | 18.3.1 | Librería UI |
| TanStack Start | 1.168 | Framework frontend full-stack (modo SPA) |
| TanStack Router | 1.170 | Enrutamiento por archivos (`src/routes/`) |
| Vite | 7.3.6 | Build tool / dev server |
| @clerk/clerk-react | 5.0.0 | Autenticación |
| Leaflet + react-leaflet | 1.9.4 / 4.2.1 | Mapas |
| @stripe/react-stripe-js | 6.3.0 | Pagos frontend |
| @stripe/stripe-js | 9.3.1 | Pagos frontend |
| Playwright | 1.55.0 | Testing E2E |

### Backend - apps/backend-api

| Tecnología | Versión | Uso |
|------------|---------|-----|
| Bun | latest | Runtime |
| Hono | 4.7.2 | Framework API |
| MongoDB + Mongoose | 7.2.0 / 9.5.0 | Base de datos |
| @clerk/backend | 3.4.1 | Autenticación backend |
| jose | 5.9.6 | JWT |
| stripe | 22.0.2 | Pagos |
| TypeScript | 5.6.3 | Lenguaje |

### Paquete compartido - packages/shared

| Tecnología | Versión | Uso |
|------------|---------|-----|
| Zod | 4.3.6 | Validación schemas |
| TypeScript | 5.6.3 | Lenguaje |

## 8. Modelo de datos

### 8.1 Enums y tipos auxiliares

```typescript
enum LandUse {
  AGRICULTURE = 'agriculture';
  LIVESTOCK = 'livestock';
  FORESTRY = 'forestry';
  TOURISM = 'tourism';
  OTHER = 'other';
}

enum LandStatus {
  DRAFT = 'draft';
  PUBLISHED = 'published';
  PAUSED = 'paused';
  DELETED = 'deleted';
}

enum RentalRequestStatus {
  DRAFT = 'draft';
  PENDING_OWNER = 'pending_owner';
  APPROVED = 'approved';
  REJECTED = 'rejected';
  CANCELLED = 'cancelled';
  PENDING_PAYMENT = 'pending_payment';
  PAID = 'paid';
}

enum ContractStatus {
  DRAFT = 'draft';
  PENDING_OWNER_SIGNATURE = 'pending_owner_signature';
  PENDING_TENANT_SIGNATURE = 'pending_tenant_signature';
  SIGNED = 'signed';
  COMPLETED = 'completed';
  CANCELLED = 'cancelled';
}

enum PaymentStatus {
  PENDING = 'pending';
  COMPLETED = 'completed';
  FAILED = 'failed';
  REFUNDED = 'refunded';
}
```

### User

```typescript
{
  id: string;
  clerkUserId: string;
  email: string;
  role: 'user' | 'admin';
  status: 'active' | 'blocked';
  profile: {
    fullName: string;
    phone?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}
```

### Land

```typescript
{
  id: string;
  ownerId: string;
  title: string;
  description?: string;
  area: number;
  allowedUses: LandUse[];
  location: {
    province: string;
    district: string;
    lat: number;
    lng: number;
    address?: string;
  };
  images: string[];
  availability: {
    available: boolean;
    availableFrom?: Date;
  };
  priceRule: {
    currency: 'USD' | 'PAB';
    pricePerMonth: number;
  };
  status: LandStatus;
  createdAt: Date;
  updatedAt: Date;
}
```

### RentalRequest

```typescript
{
  id: string;
  landId: string;
  tenantId: string;
  period: {
    startDate: Date;
    endDate: Date;
  };
  intendedUse: LandUse;
  message?: string;
  status: RentalRequestStatus;
  createdAt: Date;
  updatedAt: Date;
}
```

### Contract

```typescript
{
  id: string;
  rentalRequestId: string;
  ownerId: string;
  tenantId: string;
  terms: {
    summary: string;
    startsAt: Date;
    endsAt: Date;
  };
  status: ContractStatus;
  signatures: {
    owner?: { signedAt: Date };
    tenant?: { signedAt: Date };
  };
  createdAt: Date;
  updatedAt: Date;
}
```

### Payment

```typescript
{
  id: string;
  rentalRequestId: string;
  amount: number;
  currency: 'USD' | 'PAB';
  status: PaymentStatus;
  stripeSessionId?: string;
  stripePaymentIntentId?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Chat

```typescript
{
  id: string;
  landId: string;
  rentalRequestId?: string;
  participants: string[];
  status: 'active' | 'closed';
  createdAt: Date;
  updatedAt: Date;
}
```

### ChatMessage

```typescript
{
  id: string;
  chatId: string;
  senderId: string;
  text: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### AuditEvent

```typescript
{
  id: string;
  actorId: string;
  actorRole: 'user' | 'admin';
  entity: string;
  action: string;
  entityId: string;
metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

### Lead

```typescript
{
  id: string;
  email: string;
  source: 'landing' | 'app-web' | 'admin-dashboard';
  createdAt: Date;
}
```

## 9. Endpoints de API

### Salud

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/v1/health` | Health check |

### Autenticación

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/v1/auth/me` | Obtener usuario actual |

### Tierras

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/v1/lands` | Listar tierras (públicos + filtros) |
| GET | `/api/v1/lands/:landId` | Obtener detalle de tierra |
| POST | `/api/v1/lands` | Crear tierra (auth) |
| PATCH | `/api/v1/lands/:landId` | Editar tierra (owner) |
| DELETE | `/api/v1/lands/:landId` | Eliminar tierra (owner) |
| PATCH | `/api/v1/lands/:landId/status` | Cambiar estatus (owner/admin) |

### Solicitudes de alquiler

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/v1/rental-requests` | Crear solicitud (auth) |
| GET | `/api/v1/rental-requests` | Listar solicitudes del usuario |
| GET | `/api/v1/rental-requests/:requestId` | Detalle de solicitud |
| PATCH | `/api/v1/rental-requests/:requestId/status` | Actualizar estado (owner) |

### Contratos

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/v1/contracts` | Crear contrato |
| GET | `/api/v1/contracts` | Listar contratos del usuario |
| GET | `/api/v1/contracts/:contractId` | Detalle de contrato |
| PATCH | `/api/v1/contracts/:contractId/status` | Actualizar estado |
| POST | `/api/v1/contracts/:contractId/sign` | Firmar contrato |
| POST | `/api/v1/contracts/:contractId/complete` | Completar contrato |

### Pagos

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/v1/payments/checkout-session` | Crear sesión de pago |
| GET | `/api/v1/payments/:paymentId` | Detalle de pago |
| GET | `/api/v1/payments` | Listar pagos del usuario |
| POST | `/api/v1/webhooks/stripe` | Webhook de Stripe |

### Chat

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/v1/chats` | Listar chats del usuario |
| POST | `/api/v1/chats` | Crear chat |
| GET | `/api/v1/chats/:chatId/messages` | Listar mensajes |
| POST | `/api/v1/chats/:chatId/messages` | Enviar mensaje |
| GET | `/api/v1/chats/:chatId/external-contact` | Obtener contacto externo |

### Analytics

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/v1/analytics/overview` | Métricas generales |
| GET | `/api/v1/analytics/lands` | Métricas de tierras |
| GET | `/api/v1/analytics/requests` | Métricas de solicitudes |
| GET | `/api/v1/analytics/owner/:ownerId` | Métricas de propietario |

### Admin

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/v1/admin/users` | Listar usuarios |
| GET | `/api/v1/admin/users/:userId` | Detalle de usuario |
| PATCH | `/api/v1/admin/users/:userId/status` | Bloquear/desbloquear usuario |
| GET | `/api/v1/admin/lands` | Listar tierras (todas) |
| PATCH | `/api/v1/admin/lands/:landId/status` | Modificar estatus de tierra |

## 10. Rutas frontend

| Ruta | Descripción | Acceso |
|------|-------------|--------|
| `/` | Landing page | Público |
| `/catalog` | Catálogo con filtros y mapa | Auth |
| `/lands/:id` | Detalle de tierra | Público |
| `/reserve/:landId` | Formulario de solicitud | Auth |
| `/login` | Login | Público |
| `/register` | Registro | Público |
| `/dashboard` | Dashboard principal | Auth |
| `/dashboard/lands` | Mis tierras | Auth |
| `/dashboard/chats` | Mis chats | Auth |
| `/dashboard/notifications` | Notificaciones | Auth |
| `/dashboard/payments` | Historial de pagos | Auth |
| `/dashboard/profile` | Mi perfil | Auth |
| `/dashboard/admin` | Panel admin | Admin |
| `/dashboard/admin/users` | Gestión de usuarios | Admin |
| `/dashboard/admin/lands` | Moderación de tierras | Admin |

## 11. KPIs del MVP

| KPI | Descripción |
|-----|-------------|
| Tiempo medio solicitud → decisión | Tiempo promedio desde que un arrendatario envía una solicitud hasta que el propietario aprueba/rechaza |
| Tasa de aprobación | Porcentaje de solicitudes aprobadas vs rechazadas |
| Terrenos activos por categoría | Cantidad de tierras publicadas por tipo de uso |
| Conversión visita → solicitud | Porcentaje de usuarios que ven una tierra y envían solicitud |
| Usuarios activos mensuales | MAU de la plataforma |

## 12. Requerimientos no funcionales

| Área | Requerimiento |
|------|---------------|
| **Seguridad** | Autenticación via Clerk, autorización por rol, validación de entrada con Zod, rate limiting |
| **Escalabilidad** | API modular con Hono, arquitectura monorepo |
| **Disponibilidad** | Objetivo 99.5% mensual |
| **Observabilidad** | Logging estructurado, request IDs en respuestas |
| **Calidad** | Pruebas E2E con Playwright, CI en GitHub Actions |

## 13. Riesgos identificados

| Riesgo | Mitigation |
|--------|------------|
| Datos incompletos en publicaciones | Validación de campos requeridos, wizard guiado |
| Conflictos por disponibilidad | Verificación de solapamiento de fechas en backend |
| Riesgo legal por condiciones | Términos y condiciones claros, contratos firmados |
| Abuso de plataforma | Moderación admin, sistema de bloqueo de usuarios |
| Fallo en pagos | Manejo de webhooks, estados transactionales |

## 14. Decisiones confirmadas

| ID | Decisión |
|----|----------|
| D-01 | País inicial: Panamá |
| D-02 | Moneda operativa: USD/PAB (paridad 1:1) |
| D-03 | Pagos dentro de la plataforma desde fase 1 con Stripe |
| D-04 | Autenticación con Clerk |
| D-05 | Base de datos: MongoDB |
| D-06 | Runtime backend: Bun |
| D-07 | Framework API: Hono |
| D-08 | Framework frontend: TanStack Start (React, modo SPA sobre Vite 7) |
| D-09 | Mapa: Leaflet + react-leaflet |
| D-10 | Descubrimiento: listado + mapa con filtros |
| D-11 | Chat: mixto (interno + WhatsApp con teléfono) |
| D-12 | Login opcional para ver, obligatorio para acciones transaccionales |
| D-13 | Merge a main: requiere 1 aprobación obligatoria |
| D-14 | Flujo de colaboración: issues + PRs |

## 15. Preguntas abiertas

| ID | Pregunta | Estado |
|----|----------|--------|
| P-01 | ¿Qué datos mínimos legales deben pedirse para Panamá? | Abierta |
| P-02 | ¿Habrá verificación de identidad para publicar desde fase 1? | Abierta |
| P-03 | ¿Se requiere factura fiscal para transacciones? | Abierta |
| P-04 | ¿Límite de tierras por usuario? | Abierta |

## 16. Cuenta admin desarrollo

La contraseña de la cuenta admin de desarrollo **no se documenta aquí** (G-2 #141):
las credenciales en claro no deben vivir en documentación versionada. La cuenta
la gestiona Clerk; el rol admin se asigna por email (`ADMIN_SEED_EMAIL`) o por
`public_metadata.role`.

**Reglas obligatorias antes de producción:**
- Configurar `ADMIN_SEED_EMAIL` con una cuenta real y controlada.
- Rotar cualquier contraseña de desarrollo antes del primer despliegue.
- No usar credenciales temporales ni compartirlas en documentación/pública.
- Verificar que `ALLOW_DEV_AUTH_BYPASS=false` en producción (ver §Despliegue y `docs/AUDITORIA_HALLAZGOS.md` G-1).

## 17. Índice de archivos del proyecto

```
TerraShare-v1/
├── apps/
│   ├── web/                         # Frontend React
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── pages/
│   │   │   ├── hooks/
│   │   │   ├── services/
│   │   │   ├── routes/                  # Rutas file-based (TanStack Start)
│   │   │   └── router.tsx
│   │   ├── tests/
│   │   ├── vite.config.ts
│   │   └── package.json
│   │
│   ├── backend-api/                  # Backend Bun + Hono
│   │   ├── src/
│   │   │   ├── routes/
│   │   │   ├── db/
│   │   │   ├── services/
│   │   │   ├── middleware/
│   │   │   ├── config/
│   │   │   └── index.ts
│   │   ├── docs/
│   │   └── package.json
│   │
│   └── legacy/                       # apps anteriores (referencia)
│
├── packages/
│   └── shared/                       # DTOs, types, schemas Zod
│       ├── src/
│       │   ├── types/
│       │   ├── schemas/
│       │   ├── dtos/
│       │   └── index.ts
│       └── package.json
│
├── docs/
│   ├── PRD.md                        # PRD original
│   ├── PRDv1.md                      # PRDv1
│   ├── ARCHITECTURE.md
│   ├── SETUP_AND_COMMANDS.md
│   ├── WORKFLOW.md
│   ├── REPOSITORY_STRUCTURE.md
│   └── MODULE_INTEGRATION_CONTRACTS.md
│
├── .github/
│   └── workflows/
│       ├── landing-e2e.yml
│       ├── app-web-e2e.yml
│       ├── backend-api-ci.yml
│       └── require-linked-issue.yml
│
├── package.json                      # Workspace root
├── README.md
└── AGENTS.md
```

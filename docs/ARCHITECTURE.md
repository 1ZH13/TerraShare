# Arquitectura tecnica - TerraShare

## 1. Stack acordado
- Frontend: React + Vite + Clerk (unificado en `apps/web`)
- Backend: Bun + Hono (`apps/backend-api`)
- Base de datos: MongoDB + Mongoose
- Runtime y package manager: Bun
- Testing E2E: Playwright
- CI/CD: GitHub Actions

## 2. Estructura de apps
```
apps/
  web/           # Frontend unificado (landing + dashboard + admin)
  backend-api/   # API Bun + Hono
  legacy/        # Apps anteriores (referencia)
packages/
  shared/       # DTOs y tipos compartidos
```

## 3. Diagrama de arquitectura
```mermaid
flowchart LR
    U[Usuario Web] --> FE[Frontend React + Vite + Tailwind]
    FE --> API[Backend API Hono sobre Bun]
    API --> AUTH[Auth y RBAC]
    API --> DB[(MongoDB + Mongoose)]
    API --> STO[Storage de imagenes y documentos]
    API --> ANA[Servicio de analitica y reportes]
```

## 4. Flujo principal de alquiler
```mermaid
sequenceDiagram
    participant Arr as Arrendatario
    participant FE as Frontend
    participant API as API Hono
    participant DB as MongoDB

    Arr->>FE: Busca terrenos y aplica filtros
    FE->>API: GET /lands?type=agricultura&priceMax=...
    API->>DB: Consulta terrenos publicados
    DB-->>API: Lista de terrenos
    API-->>FE: Resultado paginado

    Arr->>FE: Solicita alquiler
    FE->>API: POST /rental-requests
    API->>DB: Crea solicitud (estado=pending_owner)
    DB-->>API: Solicitud creada
    API-->>FE: Confirmacion y siguiente paso
```

## 5. Modulos backend (v1)
- auth: registro/login, sesiones, permisos por rol
- users: perfil y configuraciones
- lands: CRUD de terrenos
- rental-requests: solicitudes y estados
- contracts: resumen de acuerdos (fase inicial)
- payments: pagos dentro de la app (fase 1, alcance basico)
- chat: mensajeria interna y exposicion de canal externo cuando aplique
- analytics: metricas para dashboard
- admin: moderacion de contenido, usuarios y reportes

## 6. Modelo de datos inicial (alto nivel)
- User: role, profile, status
- Land: ownerId, location, area, allowedUses, priceRule, availability
- RentalRequest: landId, tenantId, period, intendedUse, status
- Contract: rentalRequestId, terms, status
- AuditEvent: actorId, entity, action, metadata

## 7. Seguridad base
- Password hashing robusto
- JWT o cookie session segura (a definir)
- RBAC por rol y ownership
- Validacion de payload en todos los endpoints
- Rate limiting por IP y usuario
- Logs de auditoria para acciones sensibles

## 8. Calidad y entrega
- PR con checks obligatorios en GitHub Actions
- Tests E2E minimos con Playwright para rutas criticas
- Convencion de commit y branch por issue

## 9. Topologia de modulos (monorepo)
- landing: sitio publico de marketing y captacion.
- app-web: aplicacion principal para propietarios y arrendatarios.
- admin-dashboard: panel de administracion.
- backend-api: API Hono sobre Bun.
- packages/shared: contratos de datos, utilidades y tipos compartidos.

## 10. Acceso y autenticacion
- Modo invitado (sin login): ver landing, listado de terrenos y mapa con filtros.
- Requiere login: publicar terreno, solicitar alquiler, pagos, chat interno y panel admin.
- Acceso admin: solo rol administrador.

# TerraShare

Plataforma para alquiler de terrenos (agricultura, ganaderia y otros usos productivos).

## Documentacion base
- PRD: [docs/PRD.md](docs/PRD.md)
- Arquitectura tecnica: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- Flujo de trabajo (issues + PR): [docs/WORKFLOW.md](docs/WORKFLOW.md)
- Estructura de repositorio: [docs/REPOSITORY_STRUCTURE.md](docs/REPOSITORY_STRUCTURE.md)
- Setup y comandos: [docs/SETUP_AND_COMMANDS.md](docs/SETUP_AND_COMMANDS.md)
- Stripe en desarrollo: [docs/STRIPE_DEV_SETUP.md](docs/STRIPE_DEV_SETUP.md)
- Contratos entre modulos: [docs/MODULE_INTEGRATION_CONTRACTS.md](docs/MODULE_INTEGRATION_CONTRACTS.md)
- Endpoints / rutas de la API: [docs/ENDPOINTS_RUTAS.md](docs/ENDPOINTS_RUTAS.md)
- Migracion a MongoDB: [docs/MIGRATION.md](docs/MIGRATION.md)
- Correcciones de seguridad: [docs/SECURITY_FIXES.md](docs/SECURITY_FIXES.md)
- Historias de usuario (entregable): [docs/historias-usuario/index.html](docs/historias-usuario/index.html)
- Notas historicas: [docs/CLERK_TOKENS_REMOVAL.md](docs/CLERK_TOKENS_REMOVAL.md)

## Stack tecnologico
- Frontend: TanStack Start (React, modo SPA) sobre Vite 7 + Clerk (unificado en `apps/web`). Routing por archivos en `apps/web/src/routes/`.
- Backend: Bun + Hono + Zod (`apps/backend-api`)
- Base de datos: MongoDB + Mongoose
- Testing E2E: Playwright
- CI/CD: GitHub Actions
- MCP server propio: planeado (epico #234)
- Docker: planeado (issue #233)

## Estado actual
- `apps/web`: frontend unificado (landing + dashboard + admin)
- `apps/backend-api`: API con auth, lands, rental requests, contracts, payments, chat
- `packages/shared`: DTOs y tipos compartidos

## Rutas de la app web
| Ruta | Descripcion | Acceso |
|------|------------|--------|
| `/` | Landing | Publico |
| `/login` | Login | Publico |
| `/register` | Registro | Publico |
| `/dashboard` | Dashboard usuario | Auth |
| `/dashboard/admin` | Panel admin | Admin |

## Acceso admin

El panel `/dashboard/admin` esta protegido por rol. Un usuario se considera admin cuando (`isAdminUser`):

- su email es `terradmin@gmail.com`, **o**
- su `publicMetadata.role` en Clerk es `"admin"`.

Un admin logueado ve la entrada **"Panel admin"** en el menu de usuario de la Navbar (solo visible para admins); un usuario normal no la ve.

### Conceder rol admin real

1. **Cuenta semilla:** inicia sesion con `terradmin@gmail.com` (coincide con `ADMIN_SEED_EMAIL` del backend).
2. **Cualquier cuenta:** en el [Dashboard de Clerk](https://dashboard.clerk.com) → Users → (usuario) → **Metadata → Public**, agrega `{ "role": "admin" }` y guarda. Al re-loguear, el usuario tendra acceso al panel.

> Nota: los usuarios `role:"admin"` creados por `apps/backend-api/src/db/seed.ts` (emails `@terrashare.test`) son datos de relleno para poblar las vistas; **no permiten iniciar sesion** porque no existen como identidades en Clerk.

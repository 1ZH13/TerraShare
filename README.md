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
- Frontend: React + Vite + Clerk (unificado en `apps/web`)
- Backend: Bun + Hono (`apps/backend-api`)
- Base de datos: MongoDB + Mongoose
- Testing E2E: Playwright
- CI/CD: GitHub Actions

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

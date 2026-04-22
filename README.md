# TerraShare

Plataforma para alquiler de terrenos (agricultura, ganaderia y otros usos productivos).

## Documentacion base
- PRD: [docs/PRD.md](docs/PRD.md)
- Arquitectura tecnica: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- Flujo de trabajo (issues + PR): [docs/WORKFLOW.md](docs/WORKFLOW.md)
- Estructura de repositorio: [docs/REPOSITORY_STRUCTURE.md](docs/REPOSITORY_STRUCTURE.md)
- Setup y comandos: [docs/SETUP_AND_COMMANDS.md](docs/SETUP_AND_COMMANDS.md)
- Contratos entre modulos: [docs/MODULE_INTEGRATION_CONTRACTS.md](docs/MODULE_INTEGRATION_CONTRACTS.md)

## Stack tecnologico
- Frontend: React + Vite
- Backend: Bun + Hono
- Base de datos: MongoDB + Mongoose
- Estilos: Tailwind CSS (con tokens de diseno)
- Graficos: Recharts
- Testing E2E: Playwright
- CI/CD: GitHub Actions

## Regla de colaboracion
- Todo cambio entra por Pull Request.
- Cada PR requiere revision y aprobacion de otro companero.
- No se hace merge si los checks de CI fallan.

## Decisiones de producto ya definidas
- Mapa + listado con filtros en el MVP.
- Chat mixto (interno + opcion externa por WhatsApp).
- Login opcional para ver; obligatorio para acciones de negocio.

## Estado actual
- `apps/landing`: implementado (issue #1) con E2E y CI.
- `apps/app-web`: implementado MVP inicial (issue #2) en modo mock:
	catalogo, filtros, solicitud de alquiler y aprobacion/rechazo.
- `apps/backend-api`: implementacion v1 activa con `health`, `auth`, `lands`,
	`rental-requests`, `contracts`, `payments`, `chat` y operaciones admin
	(`admin/lands/pending`, `admin/lands/:landId/moderate`, `admin/users`,
	`admin/users/:userId/status`).
- `apps/admin-dashboard`: implementacion fase 1 extendida con login por token,
	guardas admin y acciones reales de moderacion/publicaciones, gestion de
	usuarios y lectura de auditoria.
- `packages/shared`: contratos y tipos base publicados para consumo front/back.
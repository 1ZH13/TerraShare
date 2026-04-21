# TerraShare

Plataforma para alquiler de terrenos (agricultura, ganaderia y otros usos productivos).

## Documentacion base
- PRD: [docs/PRD.md](docs/PRD.md)
- Arquitectura tecnica: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- Flujo de trabajo (issues + PR): [docs/WORKFLOW.md](docs/WORKFLOW.md)
- Estructura de repositorio: [docs/REPOSITORY_STRUCTURE.md](docs/REPOSITORY_STRUCTURE.md)
- Setup y comandos: [docs/SETUP_AND_COMMANDS.md](docs/SETUP_AND_COMMANDS.md)

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
Solo documentacion inicial. Aun no hay implementacion de frontend/backend.
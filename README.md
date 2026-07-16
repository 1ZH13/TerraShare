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
- Docker: implementado (issue #233)

## Despliegue Local con Docker

Para levantar el ecosistema completo (Frontend, Backend, y MongoDB) de forma unificada:

1. Asegúrate de configurar tu archivo `.env` en la raíz (puedes basarte en `.env.example`).
2. Ejecuta Docker Compose:
   ```bash
   docker compose up --build
   ```
El Frontend estará en `http://localhost:80` (o `WEB_PORT`) y la API en `http://localhost:3000` (o `API_PORT`).

## Despliegue y Rollback (DigitalOcean)

El pipeline de CD (`.github/workflows/deploy.yml`) despliega por SSH al droplet:
- `main` → `terrashare-prod` (puertos 80/3000)
- `staging` → `terrashare-staging` (puertos 8080/3001)

Antes de cada deploy se crea un tag local `deploy-pre-<timestamp>-<sha>` en el droplet.
Si el deploy completa OK, se crea `deploy-good-<timestamp>` y se guarda en `.last-good-deploy`.

### Rollback
En el droplet:
```bash
cd /opt/terrashare-<env>
./scripts/rollback.sh . main
# o con tag explicito:
./scripts/rollback.sh . main deploy-good-20260715-120000
```

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

### Como llega el rol al backend

El token de sesion por defecto de Clerk **no incluye `public_metadata`**, asi que el backend no puede leer el rol de los claims. Para resolverlo, `resolveClerkAuthUser` consulta la **Clerk Backend API** (con `CLERK_SECRET_KEY`, cacheada 5 min) y obtiene de ahi el rol y el estado de 2FA del usuario.

Consecuencias practicas:

- **`CLERK_SECRET_KEY` es obligatoria** para que un admin real sea reconocido por la API. Sin ella, todos los usuarios llegan como `role: "user"` y `/api/v1/admin/*` responde `403`.
- Si prefieres evitar la llamada a Clerk, puedes anadir un claim `role` (o `public_metadata`) al token mediante una **JWT template / custom session claims** en Clerk; cuando el claim existe, el backend no consulta la API.

### MFA para admins

`requireAdmin` puede exigir 2FA a los endpoints `/admin/*`, controlado por `REQUIRE_ADMIN_MFA`:

- **Produccion:** activo por defecto. Un admin sin 2FA recibe `403 MFA_REQUIRED`.
- **Fuera de produccion:** desactivado por defecto (las cuentas admin locales rara vez tienen 2FA).

El estado de 2FA se lee del usuario real en Clerk (`twoFactorEnabled`), no de un claim que el token nunca emitia.

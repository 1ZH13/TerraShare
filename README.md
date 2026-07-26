# 🌱 TerraShare

**El marketplace de tierras productivas de Panamá.** Conecta a dueños de terrenos con agricultores y ganaderos: publica, explora en el mapa, solicita en **alquiler o venta**, y cierra el trato con contrato y pago en línea — todo dentro de la plataforma.

[![CI](https://github.com/1ZH13/TerraShare/actions/workflows/ci.yml/badge.svg)](https://github.com/1ZH13/TerraShare/actions/workflows/ci.yml)
[![Deploy](https://github.com/1ZH13/TerraShare/actions/workflows/deploy.yml/badge.svg)](https://github.com/1ZH13/TerraShare/actions/workflows/deploy.yml)

### 🔗 Demo en vivo → **[terrashare.duckdns.org](https://terrashare.duckdns.org)**

---

## ✨ Qué hace

TerraShare cubre el ciclo completo de un trato de tierra, de la búsqueda al pago:

| | Capacidad |
|---|---|
| 🗺️ **Catálogo con mapa** | Explora terrenos sobre el mapa de Panamá, con filtros por provincia, distrito, uso, operación y precio, búsquedas guardadas y comparador. |
| 🌾 **Alquiler y venta** | Cada terreno se publica en alquiler, venta o ambas; el detalle ofrece «Solicitar alquiler» y/o «Solicitar compra». |
| 📸 **Publicación guiada** | Asistente por pasos: datos, ubicación (provincia → distrito dependiente), precio y hasta 10 fotos, con galería en mosaico y visor a pantalla completa. |
| 📩 **Solicitudes y ofertas** | El interesado solicita o hace una oferta; el dueño ve quién, qué uso, periodo o importe, y el mensaje, y aprueba o rechaza. |
| 📄 **Contratos y pagos** | Contrato generado (descargable en PDF) y pago en línea con **Stripe**, con recibos y reembolsos. |
| 💬 **Chat y confianza** | Chat entre las partes, reseñas y calificaciones, verificación de propietarios y reporte/moderación. |
| 🛡️ **Panel de administración** | Usuarios, terrenos, solicitudes, leads, reportes, conciliación de pagos, observabilidad, respaldos y ajustes de seguridad (2FA de admins). |
| 🤖 **Servidor MCP** | Expone el dominio de TerraShare como herramientas MCP (buscar, publicar, solicitar, contratar, pagar, moderar) para agentes de IA. |

---

## 🧱 Stack tecnológico

- **Frontend:** TanStack Start (React en modo SPA) sobre Vite 7 + Clerk — enrutado por archivos en `apps/web/src/routes/`.
- **Backend:** Bun + Hono + Zod (`apps/backend-api`).
- **Base de datos:** MongoDB + Mongoose.
- **Pagos:** Stripe (checkout, webhooks, reembolsos).
- **Servidor MCP:** `apps/mcp-server` (Model Context Protocol).
- **Tipos compartidos:** `packages/shared` (DTOs y esquemas Zod).
- **Testing E2E:** Playwright · **CI/CD:** GitHub Actions · **Infra:** Docker + nginx sobre DigitalOcean.

## 📦 Estructura del monorepo

```
apps/
  web/           Frontend (landing + dashboard + panel admin)
  backend-api/   API (auth, lands, solicitudes, contratos, pagos, chat)
  mcp-server/    Servidor MCP
packages/
  shared/        DTOs y tipos compartidos
docs/            Documentación del proyecto
```

---

## 🚀 Puesta en marcha (local)

Levanta todo el ecosistema (frontend, backend y MongoDB) con Docker:

```bash
docker compose up --build
```

Frontend en `http://localhost:80` (o `WEB_PORT`) y API en `http://localhost:3000` (o `API_PORT`). Configura tu `.env` en la raíz partiendo de `.env.example`.

> Detalle de comandos, variables y flujo de trabajo en [docs/SETUP_AND_COMMANDS.md](docs/SETUP_AND_COMMANDS.md).

## ☁️ Despliegue

El pipeline de CD (`.github/workflows/deploy.yml`) despliega por SSH al droplet, con **respaldo de la base de datos antes de cada deploy**, verificación HTTPS y auto-rollback:

- `main` → **producción** (`terrashare.duckdns.org`)
- `staging` → **staging** (`terrashare-test.duckdns.org`)

Un reverse proxy (nginx) rutea por dominio. Rollback disponible en el droplet con `./scripts/rollback.sh`.

---

## 🔐 Acceso admin

El panel `/dashboard/admin` está protegido por rol. Un usuario es admin cuando su email es `terradmin@gmail.com` **o** su `publicMetadata.role` en Clerk es `"admin"`. En producción, `/admin/*` exige además **2FA** (`REQUIRE_ADMIN_MFA`), configurable desde la propia página de Seguridad del panel.

> Cómo conceder el rol, cómo llega al backend y el detalle de la 2FA: ver la sección ampliada más abajo.

## 📚 Documentación

- **Producto:** [PRD](docs/PRD.md) · [Historias de usuario](docs/historias-usuario/index.html)
- **Técnica:** [Arquitectura](docs/ARCHITECTURE.md) · [Estructura del repo](docs/REPOSITORY_STRUCTURE.md) · [Endpoints / rutas](docs/ENDPOINTS_RUTAS.md) · [Contratos entre módulos](docs/MODULE_INTEGRATION_CONTRACTS.md)
- **Operación:** [Setup y comandos](docs/SETUP_AND_COMMANDS.md) · [Stripe en desarrollo](docs/STRIPE_DEV_SETUP.md) · [Migración a MongoDB](docs/MIGRATION.md) · [Correcciones de seguridad](docs/SECURITY_FIXES.md)
- **Flujo de trabajo:** [issues + PR](docs/WORKFLOW.md)

## 🗺️ Rutas principales

| Ruta | Descripción | Acceso |
|------|-------------|--------|
| `/` | Landing | Público |
| `/catalog` | Catálogo con mapa | Auth |
| `/lands/:id` | Detalle de terreno | Público |
| `/dashboard` | Panel del usuario | Auth |
| `/dashboard/admin` | Panel de administración | Admin |

---

<details>
<summary><strong>Detalle: acceso admin, rol y 2FA</strong></summary>

### Conceder rol admin real

1. **Cuenta semilla:** inicia sesión con `terradmin@gmail.com` (coincide con `ADMIN_SEED_EMAIL` del backend).
2. **Cualquier cuenta:** en el [Dashboard de Clerk](https://dashboard.clerk.com) → Users → (usuario) → **Metadata → Public**, agrega `{ "role": "admin" }` y guarda. Al re-loguear, tendrá acceso al panel.

> Los usuarios `role:"admin"` creados por `apps/backend-api/src/db/seed.ts` (emails `@terrashare.test`) son datos de relleno; **no permiten iniciar sesión** porque no existen como identidades en Clerk.

### Cómo llega el rol al backend

El token de sesión por defecto de Clerk **no incluye `public_metadata`**, así que el backend no lee el rol de los claims. `resolveClerkAuthUser` consulta la **Clerk Backend API** (con `CLERK_SECRET_KEY`, cacheada 5 min) para obtener rol y estado de 2FA.

- **`CLERK_SECRET_KEY` es obligatoria** para reconocer a un admin real: sin ella, todos llegan como `role:"user"` y `/api/v1/admin/*` responde `403`.
- Alternativa: añadir un claim `role` (o `public_metadata`) al token vía **JWT template / custom session claims** en Clerk; con el claim presente, el backend no consulta la API.

### MFA para admins

`requireAdmin` puede exigir 2FA en `/admin/*` según `REQUIRE_ADMIN_MFA`:

- **Producción:** activo por defecto — un admin sin 2FA recibe `403 MFA_REQUIRED`.
- **Fuera de producción:** desactivado por defecto.

El estado de 2FA se lee del usuario real en Clerk (`twoFactorEnabled`), no de un claim.

</details>

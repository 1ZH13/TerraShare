---
name: terrashare-context
description: Contexto completo del proyecto TerraShare para exportacion entre sesiones. Carga este archivo al inicio de cada sesion para entender el proyecto, sus normas, estilos y como contribuir.
---

# TerraShare — Contexto del proyecto

## 1. Que es TerraShare

Plataforma web para alquiler de terrenos productivos en Panama (agricultura, ganaderia, uso mixto). Conecta propietarios con arrendatarios de forma clara y segura.

## 2. Stack tecnologico

- **Frontend:** React 18 + Vite + Clerk (autenticacion) + React Router v6
- **Backend:** Bun + Hono
- **Base de datos:** MongoDB + Mongoose
- **Testing E2E:** Playwright
- **CI/CD:** GitHub Actions
- **Package manager:** Bun

## 3. Estructura de carpetas

```
apps/
  web/               # Frontend unificado actual (landing + catalog + dashboard + admin)
    src/
      App.jsx         # Router principal (todas las rutas)
      pages/
        LandingPage.jsx
        CatalogPage.jsx
        LandDetailPage.jsx
        ReservePage.jsx
        AdminUsersPage.jsx
        AdminLandsPage.jsx
      components/
        Login.jsx
        Register.jsx
      services/
        api.js
        adminApi.js
      styles.css      # Unico archivo de estilos
  backend-api/       # API Bun + Hono
  legacy/           # Apps anteriores (referencia, no modificar)
packages/
  shared/           # DTOs y tipos compartidos
docs/
  PRD.md            # Producto
  ARCHITECTURE.md    # Arquitectura
  WORKFLOW.md       # Normas de issues y PR
  SETUP_AND_COMMANDS.md
```

## 4. Rutas del frontend (`apps/web/src/App.jsx`)

| Ruta | Componente | Acceso | Descripcion |
|------|----------|--------|----------|
| `/` | LandingPage | Publico | Landing principal |
| `/catalog` | CatalogPage | Publico | Catalogo de terrenos con filtros |
| `/lands/:id` | LandDetailPage | Publico | Detalle de terreno |
| `/reserve/:landId` | ReservePage | Auth | Formulario de solicitud |
| `/login` | Login | Publico | Pagina de login (en deshuso, abre modal Clerk) |
| `/register` | Register | Publico | Pagina de registro (en deshuso) |
| `/dashboard` | DashboardPage | Auth | Dashboard del usuario |
| `/dashboard/admin` | AdminDashboardPage | Admin | Panel de administracion |

## 5. Autenticacion con Clerk

- Proveedor: `@clerk/clerk-react`
- Metodo preferido: **modales de Clerk** (openSignIn / openSignUp) en lugar de paginas dedicadas
- Para abrir login: `const { openSignIn } = useClerk(); openSignIn({ redirectUrl: "/dashboard" })`
- Para abrir registro: `const { openSignUp } = useClerk(); openSignUp({ redirectUrl: "/dashboard" })`
- Las paginas Login.jsx y Register.jsx existen peroestan vacacias — todo se maneja via modal de Clerk
- Rutas protegidas con `ProtectedRoute` y `AdminRoute` del App.jsx

## 6. Convenciones de estilos (CSS)

### Paleta de colores (CSS variables en `:root`)

```css
--leaf-700: #0b5f37;      /* Verde hoja — accion principal */
--leaf-900: #063922;        /* Verde profundo */
--sun-200: #f7ecce;        /* Crema suave — background */
--soil-500: #9d6a3b;      /* Marron tierra — precio */
--river-500: #0d6f93;      /* Azul rio — info, badges */
--ink-900: #132118;         /* Texto principal */
--paper: #fcfbf7;          /* Fondo de cards */
--danger: #b3342a;         /* Error, rechazo */
--success: #136b47;         /* Exito, aprobacion */
--ring: rgba(11, 95, 55, 0.24);
--glass-bg: rgba(255, 255, 255, 0.72);
--glass-border: rgba(255, 255, 255, 0.35);
--glass-shadow: 0 8px 32px rgba(11, 95, 55, 0.08);
```

### Tipografias

- Headings / brand: `font-family: "Archivo", sans-serif; letter-spacing: -0.02em;`
- Body: `font-family: "Space Grotesk", sans-serif;`
- Las fuentes se cargan desde `index.html` via Google Fonts

### Background base

```css
body {
  background:
    radial-gradient(circle at 15% 12%, rgba(13, 111, 147, 0.18), transparent 34%),
    radial-gradient(circle at 90% 9%, rgba(157, 106, 59, 0.2), transparent 30%),
    linear-gradient(145deg, #fff6df 0%, #f3fbf5 52%, #ebf7fb 100%);
}
```

### Patrones de glassmorphism

```css
.glass-nav {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 1.5rem;
  align-items: center;
  background: var(--glass-bg);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid var(--glass-border);
  border-radius: 16px;
  padding: 0.85rem 1.25rem;
  margin-bottom: 2rem;
  box-shadow: var(--glass-shadow);
}

.glass-panel {
  background: var(--glass-bg);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid var(--glass-border);
  border-radius: 20px;
  padding: clamp(1.5rem, 3vw, 2.5rem);
  box-shadow: var(--glass-shadow);
}

.glass-card {
  background: var(--glass-bg);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid var(--glass-border);
  border-radius: 16px;
  padding: 1.25rem;
  transition: transform 0.25s ease, box-shadow 0.25s ease;
  cursor: pointer;
}
```

### Ambient blobs (efecto decorativo)

```css
.ambient { position: fixed; z-index: -1; width: 290px; height: 290px; border-radius: 999px; filter: blur(58px); opacity: 0.55; }
.ambient-left { top: -70px; left: -85px; background: rgba(11, 95, 55, 0.32); }
.ambient-right { top: 22%; right: -95px; background: rgba(13, 111, 147, 0.3); }
```

### Clases principales para componentes

| Clase | Uso |
|-------|-----|
| `.page-shell` | Contenedor principal de pagina |
| `.glass-nav` | Barra de navegacion glassmorphism |
| `.glass-panel` | Panel con efecto glass |
| `.glass-card` | Card con efecto glass |
| `.top-nav` | Nav simple (alternativa) |
| `.panel` | Panel basico |
| `.section-header` | Titulo y subtitulo de seccion |
| `.land-card` | Card de terreno (usa glass-card cuando hay hover) |
| `.btn .btn-primary` | Boton accion principal |
| `.btn .btn-ghost` | Boton secundario |
| `.text-btn` | Boton texto para links/acciones tipo link |
| `.menu` | Links de navegacion |
| `.auth-actions` | Botones de auth en nav |
| `.user-chip` | Chip con nombre de usuario |
| `.session-chip` | Chip de sesion |
| `.status-pill` | Pill de estado generico |
| `.status-pending_owner` | Pendiente |
| `.status-approved` | Aprobado |
| `.status-rejected` | Rechazado |
| `.status-cancelled` | Cancelado |
| `.card-badge` | Badge en card |

### Botones

```css
.btn {
  border: 0; cursor: pointer; font-weight: 700;
  border-radius: 12px; padding: 0.75rem 1.25rem;
  transition: all 0.25s ease;
}
.btn:hover { transform: translateY(-2px); }
.btn-primary {
  color: white;
  background: linear-gradient(135deg, var(--leaf-700), var(--leaf-900));
  box-shadow: 0 6px 20px rgba(11, 95, 55, 0.3);
}
.btn-primary:hover {
  box-shadow: 0 10px 28px rgba(11, 95, 55, 0.4);
}
.btn-ghost {
  color: var(--ink-900);
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(19, 33, 24, 0.15);
  backdrop-filter: blur(8px);
}
.btn-full { width: 100%; }
```

### Animaciones

```css
@keyframes spin { to { transform: rotate(360deg); } }
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
.step-card:hover { transform: translateY(-6px); box-shadow: 0 16px 48px rgba(11, 95, 55, 0.12); }
.glass-card:hover { transform: translateY(-4px); box-shadow: 0 12px 40px rgba(11, 95, 55, 0.15); }
```

## 7. Convenciones de codigo

### Nomenclatura
- **Archivos:** PascalCase para componentes (LandingPage.jsx), camelCase para utilities
- **Componentes React:** export default function + nombre matching file
- **Clases CSS:** kebab-case (`.card-badge`, `.glass-nav`)
- **Colores:** prefijos semanticos (`--leaf-`, `--soil-`, `--river-`, `--ink-`)
- **Hooks:** `useXxx` para hooks propios
- **API methods:** verbos CRUD (`listLands`, `createLand`, etc.)

### Reglas
- **Un solo archivo CSS** (`apps/web/src/styles.css`) — no usar CSS modules ni Tailwind
- **No comentarios** en el codigo a menos que el usuario lo pida explicitamente
- **NO console.log** en produccion
- **Variables de entorno:** `VITE_API_BASE_URL` para la API
- **Clerk redirectUrl:** siempre usar `/dashboard` post-auth

### APIs del frontend

```js
// apps/web/src/services/api.js
setTokenFn(fn)           // Setea token para requests autenticados
listLands(params)        // GET /lands?use=&location=&priceMin=&priceMax=
getLand(id)           // GET /lands/:id
createRentalRequest(payload) // POST /rental-requests

// apps/web/src/services/adminApi.js
setTokenFn(fn)
listAdminUsers(params)
listAdminLands(params)
```

## 8. Normas de contribucion (WORKFLOW.md)

### Modelo de ramas
```
feature/web/<issue-id>-<slug>   # Frontend
feature/backend-api/<issue-id>-<slug>  # Backend
fix/<issue-id>-<slug>           # Fix
chore/<slug>                   # Chore
```

### Flujo
1. Crear issue con alcance y criterios de aceptacion
2. Crear rama desde main
3. Implementar cambios atomicos
4. Abrir PR referenciando el issue (keyword: `Closes #<id>`)
5. Pasar checks de CI
6. 1 aprobacion minima (cualquier colaborador)
7. Squash merge a main

### Reglas de PR
- Sin merge directo a main
- 1 revisor obligatorio
- Todos los checks en verde
- Body debe incluir keyword de cierre (`Closes #`, `Fixes #`, `Resolves #`)
- No hay limite de lineas por PR
- Si la entrega es grande, dividir por dominio

### Definicion de Done
- Criterios cumplidos
- Tests en verde
- Revisado y aprobado
- Documentacion actualizada si aplica

## 9. Estado actual del proyecto

### Rama activa
`feature/web/59-fix-auth-y-diseno` — Issue #59: unificar frontend y fix login

### PRs abiertos
- PR #69: `feat(web): fix login, add catalog, glassmorphism design` — MERGEABLE, esperando review

### Issues resueltos (en esta rama)
- Issue #16: Login/Register app-web ✅ (PR #55)
- Issue #20: Login admin ✅ (PR #56)
- Issue #22: Gestion usuarios ✅ (PR #57)
- Issue #59: Unificar frontend - EN PROGRESO (PR #69)

### Rutas implementadas
`/` landing, `/catalog`, `/lands/:id`, `/login`, `/register`, `/dashboard`, `/dashboard/admin`, `/reserve/:landId`

### Pendiente
- AdminUsersPage y AdminLandsPage (mock data, aun no conectan a API real)
- DashboardPage (contenido basico)
- Build local (no funciona en entorno Windows/WSL actual)

## 10. Comandos utiles

```bash
cd apps/web
bun run dev          # Dev server en http://localhost:5173
bun run build       # Build production
bun run preview     # Preview del build

cd apps/backend-api
bun run dev         # Dev server API

# Git
git checkout -b feature/web/<issue>-<slug>
git fetch origin && git merge origin/main  # Sincronizar main
gh pr create       # Crear PR
gh pr edit <num>    # Editar body del PR
```

## 11. Variables de entorno (apps/web)

```env
VITE_API_BASE_URL=http://localhost:3000
VITE_CLERK_PUBLISHABLE_KEY=pk_...
```

## 12. Notas para sesiones futuras

- La landing es la unica pagina con hero image (Unsplash). El resto usa glassmorphism.
- El modal de Clerk es el metodo standard para auth — no crear paginas de login dedicadas.
- Mock data para terrenos hasta que el backend este listo.
- El styles.css tiene ~1600 lineas con muchas reglas duplicadas (legacy). Ideal para refactorizar despues.
- El landing original de `apps/legacy/landing/` tiene estilos de referencia utiles.
- SKILL.md es para frontend design skills. No es parte del codigo del proyecto.
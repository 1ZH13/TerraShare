# Auditoría de TerraShare — Hallazgos

> Documento de trabajo. Aquí se registran **todos los problemas detectados** durante la
> revisión del proyecto, para después decidir cómo agruparlos en issues (no
> necesariamente un issue por hallazgo).
>
> Fecha de revisión: 2026-06-30
> Estado: en progreso (se irá ampliando).
>
> Leyenda de severidad:
> - 🔴 **Alta** — rompe funcionalidad, datos o seguridad.
> - 🟠 **Media** — inconsistencia o deuda técnica con impacto real.
> - 🟡 **Baja** — limpieza, cosmético o mejora.
>
> `(verificar)` = razonado a partir del código, conviene confirmar ejecutándolo.

---

## A. Capa de datos / arquitectura de BD

### A-1 🔴 Tres capas de persistencia conviviendo
Coexisten tres formas de guardar datos y se usan de manera **inconsistente** entre módulos:
- **Mongoose** (`src/db/schemas.ts`, `src/db/mongoose.ts`) — la usan: rental-requests, contracts, payments, chat, admin, analytics, leads.
- **Driver nativo de Mongo** (`src/config/database.ts`, `src/db/collections.ts`) — la usa **solo** `lands.ts`.
- **Store en memoria** (`src/store/in-memory-db.ts`) — fallback en lands + único almacén de auditoría y notificaciones en runtime.

**Impacto:** comportamiento dispar (p. ej. `lands` tiene fallback a memoria, el resto no), validación dispar, difícil de mantener.
**Propuesta:** unificar en **una sola capa** (recomendado Mongoose) y borrar `db/collections.ts` + el patrón `useMongoDB()`.

### A-2 🔴 Nombres de colección no coinciden entre Mongoose y el resto (`rentalRequests`, `chatMessages`, `auditEvents`)
Mongoose pluraliza el nombre del modelo en minúsculas: `RentalRequest` → colección **`rentalrequests`**, `ChatMessage` → **`chatmessages`**, `AuditEvent` → **`auditevents`**.
Pero el **seed** (`db/seed.ts`), `db/collections.ts` y los índices (`config/database.ts`) usan **camelCase**: `rentalRequests`, `chatMessages`, `auditEvents`.
**Impacto:** son colecciones distintas en Mongo (es case-sensitive). Los datos sembrados de solicitudes/mensajes/auditoría caen en colecciones que la app (vía Mongoose) **nunca lee**. Los índices únicos se crean en la colección equivocada.
**Propuesta:** fijar `collection: "..."` explícito en cada schema, o alinear el seed/índices a los nombres de Mongoose.

### A-3 🟠 `lands` escribe con el driver nativo (sin validación) pero se lee con Mongoose en otras rutas
`lands.ts` crea/actualiza terrenos con el driver nativo (`createLand`, `updateLand`) — **no aplica** los `required`/`enum` del schema Mongoose. Sin embargo `rental-requests`, `payments`, `analytics`, `admin` leen `Land` con Mongoose. Funciona solo porque ambos apuntan a la colección `lands`, pero es frágil.
**Propuesta:** migrar `lands.ts` a Mongoose (parte de A-1).

### A-4 🟠 Filtrado en memoria en lugar de en la BD
`GET /lands` trae **todas** las tierras activas y filtra (uso, provincia, precio, fechas) en JavaScript (`lands.ts:48-92`). No escala y desaprovecha los índices.
**Propuesta:** mover los filtros a la query de Mongo.

### A-5 🟠 Auditoría en runtime nunca se persiste en Mongo
`store/audit.ts::createAuditEvent` solo hace `store.auditEvents.set(...)` (memoria). Pero el lector de admin `GET /audit-events` (`contracts.ts:224`) lee con Mongoose (`AuditEvent`). Resultado: lo que se audita en runtime se pierde al reiniciar y **nunca aparece** en el panel; el panel solo vería datos del seed (y encima en la colección equivocada, ver A-2).
**Propuesta:** persistir auditoría en Mongo (o decidir explícitamente que es efímera).

### A-6 🟡 Doble función de conexión a Mongo
`db/mongoose.ts::connectMongoose` y `config/database.ts::connectDatabase` abren **dos conexiones** a la misma URI al arrancar (`index.ts`). Redundante.
**Propuesta:** una sola conexión (consecuencia de A-1).

---

## B. Bugs funcionales (endpoints rotos)

### B-1 🔴 Todos los endpoints de analytics responden 403 (verificar)
`analytics.ts:12` aplica `analyticsRoutes.use("/*", requireAdmin)` **sin** `requireAuth` antes. `requireAdmin` lee `c.get("authUser")`, que nunca se setea (eso lo hace `requireAuth`). Como el middleware de grupo corre antes que el `requireAuth` por-ruta de `/analytics/owner`, `authUser` siempre es `undefined` → **403 siempre**, incluso en dev.
**Impacto:** dashboards de analítica no funcionan. No hay test que lo cubra.
**Propuesta:** anteponer `requireAuth` (grupo) y revisar el modelo de acceso (ver F-2: el PRD dice que `/analytics/owner` es para propietarios, no solo admin).

### B-2 🔴 `GET /lands/me` queda tapado por `/lands/:landId` (verificar)
`/lands/:landId` se registra (`lands.ts:110`) antes que `/lands/me` (`lands.ts:128`). Una petición a `/lands/me` matchea primero `:landId` con `landId="me"` → 404. El frontend `getMyLands()` (`api.ts:85`) llama a `/lands/me` → "Mis tierras" se rompería.
**Propuesta:** registrar `/lands/me` antes de `/lands/:landId`.

### B-3 🔴 Ruta de notificaciones existe pero no está montada
`routes/notifications.ts` define `/notifications`, pero `app.ts` **no lo importa ni monta**. El frontend `NotificationsPage.tsx:39` hace `fetch('/api/v1/notifications')` → 404.
Además, las notificaciones solo viven en el store en memoria y **ningún flujo las crea** → aunque se montara, siempre estarían vacías.
**Propuesta:** montar la ruta y generar notificaciones reales (o quitar la página si se pospone — ver roadmap Fase 2).

### B-4 🟠 Endpoint público de leads montado en la ruta equivocada
`leadRoutes.post("/")` y `get("/")` montados con `app.route("/api/v1", leadRoutes)` resuelven a `POST/GET /api/v1` (raíz de v1), **no** `/api/v1/leads` como documenta el PRD §9. (La lectura de admin usa otra ruta, `/admin/leads`, que sí funciona.) No se encontró ningún POST de leads desde el frontend, así que la captura pública de leads probablemente no está conectada.
**Propuesta:** cambiar a `leadRoutes.post("/leads")` / `get("/leads")` y conectar el formulario del landing.

---

## C. Mocks y datos de prueba

### C-1 🟠 Mock de terrenos todavía vivo en el frontend
`apps/web/src/data/lands.ts` contiene 6 terrenos hardcodeados + mensajes de chat semilla. Aún se usa en:
- `LandDetailPage.tsx` → `getChatSeedMessages` (mensajes de chat falsos en el detalle).
- `ReservePage.tsx` → `normalizeReserveLand`.
(`CatalogPage` ya migró a la API ✅.)
**Propuesta:** eliminar el mock y servir todo desde la API; reemplazar el chat semilla por datos reales (o vacío).

### C-2 🟠 Campos que la UI muestra pero la BD no guarda
El mock/UI usa `ownerName`, `water`, `access`, `features[]`, `mapPosition{x,y}`, `areaHectares`. El schema `Land` **no tiene** ninguno (usa `area`, no `areaHectares`). Por eso `adaptLand` (`api.ts:180-182`) rellena con `"No especificado"` y `mapPosition` por defecto.
**Decisión pendiente:** ¿se agregan estos campos al schema `Land` (agua, acceso, características, nombre del dueño derivado) o se quitan de la UI?

### C-3 🟡 Seed con datos poco realistas
`db/seed.ts` genera datos aleatorios: lat/lng al azar, usuarios `blocked`/roles al azar, sesiones de Stripe inventadas, distritos/typos ("Bocolvas y Ranch", "lokasi", "Atletico"). Sirve para llenar pantallas pero no es data confiable ni demo-presentable.
**Propuesta:** seed determinista y coherente (terrenos reales de Panamá, estados consistentes, un owner y un tenant fijos para demo).

### C-4 🟡 Identidades de demo dispersas
Hay usuarios de demo en `store/in-memory-db.ts` (`user_owner_01`, etc.), otros generados en `seed.ts`, y el dev-bypass crea `web_dev_user`/`dev_user`. No hay un set único de identidades de prueba.
**Propuesta:** definir identidades de demo canónicas y reutilizarlas.

---

## D. Autenticación y roles

### D-1 🔴 No existe distinción propietario / arrendatario
El sistema solo maneja `role: "user" | "admin"` (`db/schemas.ts`). Cualquier `user` puede publicar y alquilar. El PRD §3 describe 3 roles (Propietario / Arrendatario / Admin) pero la implementación los colapsa.
**Decisión pendiente (la planteada por el usuario):** modelar el tipo de usuario — rol único, capacidades (puede ser ambos), o rol cambiable. Esto define el schema de `users`, el onboarding y los permisos.

### D-2 🟠 El registro no captura información del usuario
`Register.tsx` solo abre el modal de Clerk (Google/email). No hay paso de onboarding que capture teléfono, tipo de usuario, ubicación, etc. Con Google solo llega identidad (email/nombre), no el rol de negocio.
**Propuesta:** paso de onboarding post-signup que capture datos y guarde el tipo de usuario (en `public_metadata` de Clerk y/o en la colección `users`).

### D-3 🟠 En dev, Clerk no se ejercita contra el backend
`api.ts:21-25` siempre manda headers de bypass `x-dev-role: user` / `x-dev-user-id: web_dev_user` en modo DEV. El token real de Clerk nunca llega a la API en desarrollo, así que el flujo real de auth/roles no se prueba localmente.
**Propuesta:** opción para usar el token real de Clerk en dev (al menos un modo conmutable).

### D-4 🟠 El usuario autenticado no se persiste en Mongo
`require-auth.ts::upsertAuthUser` solo guarda en el store en memoria. La colección `users` de Mongo se llena con el seed, pero los usuarios reales que entran por Clerk **no** se insertan en Mongo (salvo el `updateOne` de `auth/profile`, que es no-op si no existe). El admin lee usuarios desde Mongo → los usuarios reales no aparecerían en el panel.
**Propuesta:** upsert del usuario en Mongo al autenticar.

### D-5 🟡 Rol admin atado a un email semilla
El rol admin se asigna si el email == `ADMIN_SEED_EMAIL` (default `terradmin@gmail.com`) o por `public_metadata.role` (`clerk-user.ts:87`). Aceptable para dev, pero el PRD ya marca rotar credenciales antes de producción.

---

## E. Validación

### E-1 🟠 Los schemas Zod de `packages/shared` no se usan en el backend
El backend **no importa** `@terrashare/shared` en ninguna ruta; valida a mano con `if (!body.x)`. Existen schemas Zod en `packages/shared/src/schemas/*` que quedan sin enforcement del lado servidor.
**Impacto:** validación duplicada/inconsistente, sin coerción ni mensajes uniformes.
**Propuesta:** validar cada endpoint con los schemas Zod compartidos.

### E-2 🟡 Validación manual incompleta
Ejemplos: `lands POST` no valida tipos de `location`/`priceRule` a fondo; `leads POST` hace `await c.req.json()` sin `.catch` (un body inválido lanza y cae al handler de error global 500 en vez de 400).
**Propuesta:** cubrir con Zod (E-1).

---

## F. Consistencia PRD ↔ implementación

### F-1 🟠 Enums divergentes entre PRD y código
- `LandUse`: PRD usa inglés (`agriculture`, `livestock`, …); el código usa español (`agricultura`, `ganaderia`, …, + `acuicultura`, `mixto`). 
- `LandStatus`: PRD `draft/published/paused/deleted`; código `draft/active/inactive`.
- `ContractStatus`: PRD describe flujo de doble firma (`pending_owner_signature`, `pending_tenant_signature`, `signed`); el código usa `draft/active/completed/cancelled`.
- `PaymentStatus`: PRD `pending/completed/failed/refunded`; código `pending/processing/paid/failed/cancelled`.
**Propuesta:** definir la fuente de verdad única y alinear PRD + schema + DTOs compartidos.

### F-2 🟠 Flujo de firma de contrato simplificado
El PRD describe firma de ambas partes; `contracts.ts::sign` solo pasa `draft → active` con una firma (`terms.signedAt`). No hay firma separada de owner/tenant.
**Propuesta:** decidir si se implementa el flujo de doble firma (Fase 2) o se documenta el flujo simplificado actual.

### F-3 🟡 Acciones de auditoría fuera del enum
`contracts.ts` emite `action: "signed"` y `"completed"`, que **no** están en el `enum` de `AuditEventSchema` (`db/schemas.ts:239`). Como hoy la auditoría es en memoria (A-5) no falla en runtime, pero si se persiste con Mongoose (deseable) Mongoose lo rechazaría.
**Propuesta:** ampliar el enum o normalizar las acciones.

### F-4 🟡 `/analytics/requests` puede dividir por cero
`approvalRate` divide por `recentRequests.length` (`analytics.ts:170`); si no hay solicitudes recientes → `NaN`.

---

## G. Seguridad y configuración

### G-1 🟠 CORS abierto y headers de bypass en producción
`app.ts:22` usa `origin: "*"` y acepta `x-dev-role`/`x-dev-user-id`. El bypass se desactiva en prod vía `ALLOW_DEV_AUTH_BYPASS`, pero el CORS abierto queda. Revisar antes de desplegar.
**Propuesta:** CORS por allowlist y confirmar que el bypass esté apagado en prod.
**✅ Resuelto (#141):** CORS por allowlist (`resolveCorsOrigin` + `CORS_ALLOWED_ORIGINS`; `localhost` solo fuera de prod; nunca `*`). Nuevo guard `config/security-check.ts` que **aborta el arranque** en producción si `ALLOW_DEV_AUTH_BYPASS` está activo. Ver `docs/DEPLOYMENT_SECURITY.md`.

### G-2 🟡 Credenciales de admin en el PRD
El PRD §16 incluye `terradmin@gmail.com / 123`. El propio doc dice rotar antes de producción; dejar registrado como pendiente de despliegue.
**✅ Resuelto (#141):** eliminada la contraseña en claro del PRD §16; sustituida por reglas de rotación/config (`ADMIN_SEED_EMAIL`).

### G-3 🟡 Webhook de Stripe acepta eventos sin firma en dev
`payments.ts:368-389` acepta payload sin verificar firma cuando `NODE_ENV !== production`. Correcto para dev, pero conviene documentarlo.
**✅ Resuelto (#141):** comportamiento por entorno documentado en `docs/DEPLOYMENT_SECURITY.md` (producción = verificación estricta siempre). El guard avisa si falta `STRIPE_WEBHOOK_SECRET` con Stripe activo en prod.

---

## H. Limpieza / deuda técnica

### H-1 🟡 `db/collections.ts` quedaría muerto tras A-1
Casi todo lo usa Mongoose; al migrar `lands` (A-3), este archivo y `store/types.ts` asociados quedan sin uso.

### H-2 🟡 Código muerto en `lands.ts`
`lands.ts:49-51` construye un objeto `filters` que luego se ignora (`listLands({ status: "active" })`).

### H-3 🟡 `apps/legacy` como referencia
Carpeta de apps anteriores; confirmar que no entra en build/CI y decidir si se archiva.

---

## I. UX / UI

### I-1 🔴 No hay botón de cerrar sesión en el dashboard de usuario
`UserDashboardLayout.tsx` solo muestra un ícono de engranaje que lleva a `/dashboard/profile`. El prop `onSignOut` y la función `handleSignOut` están declarados pero **nunca se renderizan en un botón**. Un usuario logueado no tiene forma visible de salir (sí existe en el layout admin).
**Propuesta:** agregar botón de "Cerrar sesión" (y/o menú de usuario) en el layout de usuario.

### I-2 🔴 Contenido falso presentado como real en el landing
- Métricas hardcodeadas: "+120 terrenos", "2 días de respuesta", "6 provincias" (`LandingPage.tsx:17-21`).
- Las tarjetas del hero son terrenos inventados fijos ("Finca El Tamarindo", "Lote Vista Caisan", "Parcela Río Indio") — los mismos nombres del mock viejo (`LandingPage.tsx:122-142`).
**Propuesta:** derivar métricas de datos reales (o quitarlas) y poblar el hero con terrenos reales.

### I-3 🟠 El landing y el catálogo muestran campos que la BD no tiene
"Terrenos destacados" usa `land.water`, `land.access`, `land.areaHectares` (`LandingPage.tsx:205-211`) → renderiza `💧 undefined`, `🚜 undefined`. Mismo origen que C-2.
**Propuesta:** resolver C-2 (agregar campos o quitarlos de la UI).

### I-4 🟠 El dashboard muestra el ID crudo del terreno en vez del nombre
`DashboardPage` (App.tsx:326) pinta `req.landId` (`land_xxxx…`) en la columna "Terreno". El usuario ve un identificador feo en lugar del título.
**Propuesta:** resolver el título del terreno (join) y mostrarlo.

### I-5 🟠 Catálogo público renderizado dentro del chrome del dashboard
`/catalog` no está protegido (es público, correcto según el copy "explora sin registro"), pero se envuelve en `UserDashboardLayout` (`App.tsx:502`), que muestra la navegación de usuario logueado ("Mis solicitudes", "Mis terrenos", "Chats"…). Para un visitante anónimo es confuso.
**Propuesta:** usar `PublicHeader` para catálogo público o separar layouts.

### I-6 🟠 Copy promete funciones no implementadas
El landing dice "Te notificamos por email cuando el propietario responda" (benefit) y hay link a "Notificaciones", pero notificaciones no está implementado (B-3) y no hay envío de email.
**Propuesta:** alinear copy con lo realmente disponible o priorizar la función.

### I-7 🟠 Mezcla de español e inglés en la UI
Ejemplos: "Pendientes de **approval**" (`App.tsx:434`), badges/labels que capitalizan el estado crudo en inglés (`approved`, `draft`) en la tabla admin (`App.tsx:471`).
**Propuesta:** diccionario de etiquetas de estado en español, reutilizable.

### I-8 🟠 Sin dark mode ni `prefers-reduced-motion`
`styles.css` (3.834 líneas) no define `prefers-color-scheme` ni `prefers-reduced-motion`. Hay animaciones con `animationDelay` en tarjetas (landing/features) sin alternativa para usuarios sensibles al movimiento (a11y).
**Propuesta:** respetar `prefers-reduced-motion`; dark mode opcional.

### I-9 🟡 Botones solo-ícono sin nombre accesible
El botón de cerrar sesión del layout admin (`App.tsx:215`) es un SVG sin `aria-label`/`title`. (El engranaje de usuario sí tiene `title`.)
**Propuesta:** `aria-label` en todos los botones solo-ícono.

### I-10 🟡 Enlaces legales muertos
Footer del landing: "Términos" y "Privacidad" apuntan a `href="#"` (`LandingPage.tsx:273-274`).
**Propuesta:** páginas reales o quitar hasta tenerlas.

### I-11 🟡 Código muerto y debug en el front
- `DashboardLayout` definido en `App.tsx:107` nunca se usa (las rutas usan `UserDashboardLayout`).
- `PaymentPage` se importa (`App.tsx:12`) pero no tiene `<Route>`.
- `console.log("API response:", data)` en `DashboardPage` (`App.tsx:249`) y otros `console.error` de debug.
- `DashboardPage` reimplementa el fetch con headers de bypass en vez de usar `services/api.ts::listRentalRequests`.
**Propuesta:** limpiar y centralizar las llamadas en `services/api.ts`.

### I-12 🟡 Estilos inline dispersos
Uso intensivo de `style={{…}}` mezclado con clases CSS en App.tsx y páginas. Dificulta consistencia y theming.
**Propuesta:** mover a clases utilitarias / componentes.

---

## Resumen por severidad

| Sev | IDs |
|-----|-----|
| 🔴 Alta | A-1, A-2, B-1, B-2, B-3, B-4, D-1, I-1, I-2 |
| 🟠 Media | A-3, A-4, A-5, C-1, C-2, D-2, D-3, D-4, E-1, F-1, F-2, G-1, I-3, I-4, I-5, I-6, I-7, I-8 |
| 🟡 Baja | A-6, C-3, C-4, D-5, E-2, F-3, F-4, G-2, G-3, H-1, H-2, H-3, I-9, I-10, I-11, I-12 |

---

## Propuesta de agrupación en issues (borrador, a discutir)

> Idea: agrupar por **tema coherente** para no abrir un issue por bug suelto.

1. **[backend-api] Unificar capa de persistencia en Mongoose**
   Cubre: A-1, A-2, A-3, A-4, A-5, A-6, H-1, H-2. (Issue grande, candidato a subdividir.)

2. **[backend-api] Corregir endpoints rotos**
   Cubre: B-1 (analytics 403), B-2 (`/lands/me`), B-3 (notifications no montado), B-4 (ruta de leads).

3. **[auth] Modelo de roles + onboarding propietario/arrendatario**
   Cubre: D-1, D-2, D-3, D-4, D-5. (Depende de la decisión de modelo de rol.)

4. **[web][backend-api] Eliminar mocks y alinear campos UI↔BD**
   Cubre: C-1, C-2, C-3, C-4.

5. **[backend-api][shared] Validación con Zod compartido**
   Cubre: E-1, E-2.

6. **[docs][shared] Alinear PRD ↔ schema (enums y flujos)**
   Cubre: F-1, F-2, F-3, F-4.

7. **[backend-api] Endurecer seguridad y config para despliegue**
   Cubre: G-1, G-2, G-3.

8. **[web] UX/UI: navegación, copy y accesibilidad**
   Cubre: I-1, I-4, I-5, I-6, I-7, I-9, I-10, I-11, I-12. (I-2, I-3 se cruzan con el grupo 4 de mocks; I-8 puede ir aparte como mejora de a11y.)

---

## Pendiente de revisar (siguiente pasada)
- Tests: los 3 que fallan del baseline (25/28) — identificar y clasificar.
- Frontend a fondo: páginas restantes (MyLands, Chats, Payments, Profile, AdminUsers, AdminLands, AdminLeads).
- `packages/shared`: revisar DTOs vs schemas vs uso real.
- CI: contenido real de los 4 workflows de GitHub Actions.
- Manejo de sesión Clerk en el front (token real vs bypass) end-to-end.

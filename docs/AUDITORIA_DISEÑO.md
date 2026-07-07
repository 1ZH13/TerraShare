# Auditoría de diseño — Paridad con el prototipo `TerraShare-rediseño`

> Objetivo: que las pantallas del proyecto se vean **exactamente igual** al prototipo
> (`TerraShare-rediseño.html`, raíz del repo) — layout, distribución, spacing, colores y
> tipografía — no solo tomando la paleta. Issue padre: **#134**.
>
> Método: el prototipo es la **fuente de verdad**. Cada pantalla se reconstruye como componente
> React limpio sobre el sistema de tokens `--ts-*` existente, conservando la lógica de datos real.
> Lo que el prototipo muestra pero aún **no tiene backend** se documenta aquí y se abre como issue.

Rama de trabajo: `feature/134-web-editorial-parity` (sobre el stack `feature/134-web-catalog`).

---

## 1. Estado de paridad por pantalla

### Flujo público — ✅ COMPLETO

| # | Pantalla | Archivos | Estado |
|---|----------|----------|--------|
| 01 | **Landing** | `pages/LandingPage.tsx`, `landing.css` | ✅ Paridad. Hero 2-col con chips, banda de beneficios, destacados (datos reales), pasos 01–04, CTA testimonial, footer. |
| 02/03 | **Home** (Busco/Ofrezco) | `pages/HomePage.tsx`, `home.css` | ✅ Paridad. Nav en `AppLayout`. Solicitudes/chats/lands reales. |
| 04 | **Catálogo** | `pages/CatalogPage.tsx`, `catalog.css` | ✅ Paridad. Filtros pill, lista horizontal, **mapa Leaflet real** + tarjeta flotante. |
| 05 | **Detalle** | `pages/LandDetailPage.tsx`, `detail.css` | ✅ Paridad. Galería 2fr/1fr, 6 specs reales, card de acción sticky. |

### Transacción, cuenta y admin — ✅ COMPLETO

| Pantalla | Archivos | Estado |
|----------|----------|--------|
| **Solicitar alquiler** | `ReservePage`, `reserve.css` | ✅ Resumen sticky + formulario, crea la solicitud real. |
| **Publicar (wizard 4 pasos)** | `PublishLandPage`, `publish.css` | ✅ Datos/Ubicación/Precio/Fotos, validación, `createLand()`. Ruta `/dashboard/lands/new`. |
| **Trato / Pago** | `PaymentPage`, `deal.css` | ✅ Cabecera + stepper + panel Stripe real. Ruta `/pay/:requestId`. |
| **Pago confirmado / cancelado** | `PaymentSuccess/CancelPage`, `checkout.css` | ✅ Tarjeta centrada con datos reales del pago. |
| **Mis terrenos** | `MyLandsPage`, `mylands.css` | ✅ Grid de publicaciones. |
| **Pagos** | `PaymentsPage`, `payments.css` | ✅ Stats + tabla. |
| **Notificaciones** | `NotificationsPage`, `notifications.css` | ✅ Lista con icono por tipo + no-leído. |
| **Perfil** | `ProfilePage`, `profile.css` | ✅ Identidad + datos + preferencias (toggles) + cuenta. |
| **Chats** | `ChatsPage`, `chats.css` | ✅ **Funcional**: inbox 2 paneles, hilo real, envío, WhatsApp. |
| **Estados vacíos** | `components/EmptyState.tsx` | ✅ Componente reutilizable aplicado en todas las secciones. |
| **Admin** (Resumen/Terrenos/Usuarios/Leads) | `AdminDashboardPage`, `Admin*Page`, `AdminLayout`, `admin.css` | ✅ Sidebar oscuro + tablas + stats reales. |

**Layouts:** `UserDashboardLayout` (nav editorial unificado) y `AdminLayout` (sidebar) reescritos.

### Pendiente de paridad (menor) — ⏳
- **Login / onboarding** (`components/Login/Register`, `OnboardingPage`): revisar paridad fina.
- **Hacer oferta (venta)** y **Admin: Reportes/moderación**: dependen de backend (#140 / moderación).

---

## 2. Brechas diseño ↔ backend (features del prototipo sin datos reales)

Detectadas durante la paridad del flujo público. Donde la UI las requiere, hoy muestra un
**estado vacío/honesto** (sin datos falsos) y queda a la espera del backend.

| Feature del prototipo | Dónde aparece | Estado backend | Issue |
|-----------------------|---------------|----------------|-------|
| **Fotos de terrenos** (galería, portadas, hero) | Landing, Home, Catálogo, Detalle | `LandDto` sin imágenes → placeholders | **#148** (nuevo) |
| **Favoritos / Guardados** (corazón) | Home "Guardados", Detalle "Guardar" | Sin endpoint | **#147** (nuevo) |
| ~~**Chats enriquecidos** (nombre, último msg, no leídos)~~ | Home Chats, Chats | ✅ **HECHO** — `GET /chats` enriquecido + inbox funcional | ~~#149~~ (cerrado) |
| **Verificación + perfil del propietario** | Detalle (chip "Verificado", banner, dueño) | Solo `ownerId`; sin verificación | **#150** (nuevo) |
| **Agua / acceso / suelo / luz** del terreno | Detalle (specs), Catálogo (features) | No existen en `LandDto` | **#138** |
| **Operación alquiler/venta + precio de venta** | Detalle, Catálogo (filtro), Hacer oferta | Sin campo de operación | **#140** |
| **Solicitudes recibidas por el dueño** | Home (Ofrezco) | Sin endpoint | **#136** |
| **Analítica de ingresos del mes** | Home (Ofrezco, card oscura) | Sin endpoint | **#136** |
| **Nombre/email del usuario** | Nav, chats, propietario | Falta en contexto auth | **#132** |
| **Cuenta única Busco/Ofrezco + onboarding** | Toggle del nav | En progreso | **#137** |

### Detalles menores (sin issue propio; notas para #134)
- **Ordenar catálogo** ("ordenar por Recientes" es estático): el backend ya acepta `sort`; falta
  cablear el selector de orden en la UI.
- **Punto de no-leídos en la campana** del nav: sin estado real de notificaciones no leídas.
- **Compartir** en el detalle: usa `navigator.share` nativo cuando está disponible.

---

## 3. Convenciones aplicadas

- **Tokens:** colores y tipografía siempre vía `--ts-*` (`styles/tokens.css`). Valores puntuales del
  prototipo sin token (`#5b6b5b`, `#f2ecdf`, etc.) se usan como literales.
- **Iconos:** `lucide-react` (el prototipo usa lucide). Se añadieron pesos de fuente Spectral 600 +
  itálicas y Hanken 700 en `index.html`.
- **Fotos:** mientras no exista #148, placeholder degradado con icono (`.lp-photo` / `.hm-photo` /
  `.cat-card__thumb` / `.det-photo`).
- **Verificación visual:** el `preview_screenshot` de la app suele dar timeout por el polling de red
  de Clerk; se verifica por **inspección de estilos computados** (más preciso). Para el shell
  autenticado se usa **temporalmente** una ruta `/__preview` en `App.tsx` que se elimina siempre.

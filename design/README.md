# Diseño — TerraShare (maquetas)

Maquetas HTML/CSS del rediseño de TerraShare. Son **prototipos visuales**, no la app real
(esa se implementa luego en React). Sirven para acordar el look y el flujo antes de codear.

## Cómo verlas
**Empieza por `00-index.html`** — es el mapa de todas las pantallas; desde ahí saltas a cualquiera.
El prototipo es **navegable**: dentro de cada pantalla los botones principales llevan a la
siguiente (ej. landing → login → home → catálogo → detalle → solicitar → trato → pago).

Abre cualquier `.html` con doble clic. El CSS está **incrustado en cada archivo** (no depende
de `tokens.css`); `tokens.css` se conserva solo como referencia para la futura implementación React.

## Pantallas (orden del flujo)
| # | Archivo | Pantalla | Estado |
|---|---------|----------|--------|
| 01 | `01-landing.html` | Landing público (escaparate, teaser de terrenos) | ✅ borrador |
| 02 | `02-home-busco.html` | Home con sesión — modo **Busco** (navbar + switch) | ✅ borrador |
| 03 | `03-home-ofrezco.html` | Home con sesión — modo **Ofrezco** (publicaciones, solicitudes recibidas, ingresos) | ✅ borrador |
| 04 | `04-catalogo.html` | Catálogo con filtros + mapa (lista + pines) | ✅ borrador |
| 05 | `05-detalle-terreno.html` | Detalle de terreno (galería, atributos, dueño, CTA) | ✅ borrador |
| 06 | `06-publicar.html` | Publicar terreno — wizard paso 1 (datos + operación alquiler/venta) | ✅ borrador |
| 07 | `07-trato.html` | Hilo del **trato** unificado (solicitud → aceptada → pago → acuerdo → activo + chat) | ✅ borrador |
| 08 | `08-login-onboarding.html` | Login (Clerk) + onboarding (teléfono, provincia, Busco/Ofrezco) | ✅ borrador |
| 09 | `09-admin.html` | Panel admin — **Reportes** (moderación) | ✅ borrador |
| 10 | `10-perfil.html` | Perfil / configuración de cuenta (datos, preferencias, cuenta) | ✅ borrador |
| 11 | `11-admin-terrenos.html` | Admin · **Terrenos** (tabla + ocultar/restaurar) | ✅ borrador |
| 12 | `12-admin-usuarios.html` | Admin · **Usuarios** (tabla + bloquear/desbloquear) | ✅ borrador |
| 13 | `13-admin-metricas.html` | Admin · **Resumen / Métricas** (KPIs + gráficas) | ✅ borrador |

| 00 | `00-index.html` | **Mapa de pantallas** (hub navegable) | ✅ |
| 14 | `14-solicitar.html` | Solicitar alquiler / hacer oferta (formulario) | ✅ borrador |
| 15 | `15-chats.html` | Chats (lista + conversación + WhatsApp) | ✅ borrador |
| 16 | `16-notificaciones.html` | Notificaciones | ✅ borrador |
| 17 | `17-pagos.html` | Historial de pagos | ✅ borrador |
| 18 | `18-checkout-exito.html` | Pago confirmado | ✅ borrador |
| 19 | `19-admin-leads.html` | Admin · Leads captados | ✅ borrador |
| 20 | `20-publicar-ubicacion.html` | Publicar · paso 2 (ubicación + mapa) | ✅ borrador |
| 21 | `21-publicar-precio.html` | Publicar · paso 3 (precio alquiler/venta + disponibilidad) | ✅ borrador |
| 22 | `22-publicar-fotos.html` | Publicar · paso 4 (fotos + publicar) | ✅ borrador |
| 23 | `23-detalle-venta.html` | Detalle de terreno **en venta** (precio total) | ✅ borrador |
| 24 | `24-hacer-oferta.html` | Hacer oferta de compra (formulario) | ✅ borrador |
| 25 | `25-estados-vacios.html` | Estados vacíos (sin solicitudes / publicaciones / resultados) | ✅ borrador |
| 26 | `26-admin-reporte-detalle.html` | Admin · detalle de un reporte (drill-down) | ✅ borrador |
| 27 | `27-admin-usuario-detalle.html` | Admin · detalle de un usuario (drill-down) | ✅ borrador |
| 28 | `28-trato-compra.html` | Trato de **compra** (oferta → reserva → cierre notaría) | ✅ borrador |

> Navegación: admin (09/11/12/13/19) enlazado por el menú lateral; lado usuario enlazado en
> la ruta principal. Los botones secundarios (filtros, algunos "ver todos") aún son ilustrativos.

## Estado
Flujo completo diseñado y navegable (29 pantallas, `00`–`28`). Camino principal enlazado de
punta a punta para usuario y admin, con ramas de **alquiler** y **venta**.

Refinamientos menores que quedan (no bloqueantes):
- Algunos botones secundarios (filtros, "ver todos") siguen siendo ilustrativos.
- Versión móvil / responsive de cada pantalla.
- Siguiente paso real: **plan de implementación en React** usando estas maquetas como referencia.

## Notas de diseño
- **Marca:** verde tierra. Tokens en `tokens.css` (`--brand-*`).
- **Inspiración de layout:** docker.com (tipografía grande, bloques alternados, bloque de stats).
- **Animaciones:** entrada `fade-up` escalonada + `hover-lift`; respeta `prefers-reduced-motion`.
- **Modelo:** cuenta única con dos modos (Busco / Ofrezco); alquiler y venta; publicación directa + reportes.

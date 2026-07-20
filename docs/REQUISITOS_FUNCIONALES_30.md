# TerraShare — 30 Requisitos Funcionales (RF)

> Documento de trabajo. Consolida los **30 requisitos funcionales** exigidos por el curso,
> distinguiendo lo que ya está implementado, las features construidas pendientes de documentar
> y las **5 HU nuevas** a desarrollar. Excluye deliberadamente los requisitos **no funcionales**
> (seguridad, observabilidad, CI/CD, pruebas, etc.) y las tools **peligrosas** del MCP.
>
> Grupo 1GS241 · Universidad Tecnológica de Panamá · Desarrollo de Software IX

---

## 1. Criterio de conteo

Un **requisito funcional (RF)** describe *algo que el sistema hace para un usuario*.
Quedan **fuera** del conteo:

- **No funcionales (NFR):** atributos de calidad — HU 33, 34, 35, 36, 39, 40, 42, 44, 45, 46,
  47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 61, 62 (seguridad, logs, métricas, pruebas, CI/CD…).
- **Tools peligrosas del MCP:** acciones legales/financieras/de moderación de cuenta que un
  agente de IA no debería ejecutar (ver §4).
- **Técnicas internas:** HU-04 (bypass de auth en dev), HU-18 (regla de no solapamiento),
  HU-24 (procesar webhook) — son de sistema, no de usuario.

---

## 2. Lista de los 30 RF

| RF | Historia | Origen | Estado |
|----|----------|--------|--------|
| RF-01 | Registro e inicio de sesión | HU-01 | ✅ Implementado |
| RF-02 | Explorar catálogo con paginación | HU-05 | ✅ Implementado |
| RF-03 | Filtrar terrenos (uso, provincia, precio, fechas) | HU-06 | ✅ Implementado |
| RF-04 | Ordenar resultados (fecha/precio/área) | HU-07 | ✅ Implementado |
| RF-05 | Ver detalle de un terreno | HU-08 | ✅ Implementado |
| RF-06 | Publicar un terreno | HU-09 | ✅ Implementado |
| RF-07 | Editar mi terreno | HU-10 | ✅ Implementado |
| RF-08 | Cambiar el estado del terreno | HU-11 | ✅ Implementado |
| RF-09 | Eliminar mi terreno | HU-12 | ✅ Implementado |
| RF-10 | Ver mis terrenos | HU-13 | ✅ Implementado |
| RF-11 | Crear una solicitud de alquiler | HU-14 | ✅ Implementado |
| RF-12 | Listar mis solicitudes | HU-15 | ✅ Implementado |
| RF-13 | Aprobar / rechazar solicitudes | HU-17 | ✅ Implementado |
| RF-14 | Generar un contrato | HU-19 | ✅ Implementado |
| RF-15 | Firmar un contrato | HU-20 | ✅ Implementado |
| RF-16 | Completar un contrato | HU-21 | ✅ Implementado |
| RF-17 | Iniciar un pago (Stripe Checkout) | HU-23 | ✅ Implementado |
| RF-18 | Ver mis pagos | HU-25 | ✅ Implementado |
| RF-19 | Chat interno y mensajes | HU-26/27 | ✅ Implementado |
| RF-20 | Gestión de usuarios (admin) | HU-29 | ✅ Implementado |
| RF-21 | Analítica e indicadores | HU-32 | ✅ Implementado |
| RF-22 | Guardar terrenos favoritos | HU-93 | ✅ Construido, sin documentar |
| RF-23 | Reportar un terreno | HU-94 | ✅ Construido, sin documentar |
| RF-24 | Moderar reportes (admin) | HU-95 | ✅ Construido, sin documentar |
| RF-25 | Ver perfil público de un dueño | HU-96 | ✅ Construido, sin documentar |
| RF-26 | Reseñas y calificaciones | HU-97 | 🆕 Nueva |
| RF-27 | Comparador de terrenos | HU-98 | 🆕 Nueva |
| RF-28 | Búsquedas guardadas y alertas | HU-99 | 🆕 Nueva |
| RF-29 | Agendar visita a un terreno | HU-100 | 🆕 Nueva |
| RF-30 | Exportar contrato a PDF | HU-101 | 🆕 Nueva |

**Resumen:** 21 ya implementados (núcleo MVP) · 4 construidos sin documentar · 5 nuevos por desarrollar.

---

## 3. Historias de usuario nuevas (redacción completa)

### Features ya construidas (documentar)

#### HU-93 — Guardar terrenos favoritos
Como **usuario autenticado**, quiero marcar terrenos como favoritos y verlos en una lista,
para hacer seguimiento de los que me interesan.
- `POST/DELETE /users/me/favorites/:landId` agrega o quita un favorito.
- `GET /users/me/favorites` devuelve solo los favoritos del usuario.
- El estado de favorito se refleja en catálogo, home y detalle.
- *Evidencia:* `routes/favorites.ts`, `hooks/useFavorites.ts`.

#### HU-94 — Reportar un terreno
Como **usuario**, quiero reportar un terreno con contenido sospechoso o inválido,
para ayudar a mantener la calidad del catálogo.
- `POST /reports` registra el reporte con motivo y terreno asociado.
- El reporte queda vinculado al usuario que lo levanta.
- *Evidencia:* `routes/reports.ts`.

#### HU-95 — Moderar reportes (admin)
Como **administrador**, quiero revisar y resolver los reportes recibidos,
para actuar sobre publicaciones denunciadas.
- `GET /admin/reports` y `GET /admin/reports/:id` listan y detallan reportes.
- `PATCH /admin/reports/:id` cambia el estado (revisado/resuelto).
- *Evidencia:* `routes/reports.ts`, `AdminReportsPage.tsx`, `AdminReportDetailPage.tsx`.

#### HU-96 — Ver perfil público de un dueño
Como **visitante**, quiero ver el perfil público de un dueño con sus terrenos publicados,
para evaluar su reputación antes de alquilar.
- `GET /users/:userId/public` devuelve datos públicos del dueño y sus publicaciones activas.
- Un usuario inexistente devuelve `404`.
- *Evidencia:* endpoint `#150`, `public-owner.test.ts`.

---

### HU nuevas por desarrollar

#### HU-97 — Reseñas y calificaciones
Como **parte de un contrato completado** (dueño o arrendatario), quiero calificar y comentar
a la otra parte, para construir reputación y confianza en la plataforma.
- Solo se puede reseñar si existe un contrato en estado `completed` entre ambas partes.
- Cada parte puede dejar **una sola** reseña por contrato: 1–5 estrellas + comentario opcional.
- El promedio de calificación se muestra en el perfil público del dueño (HU-96) y en la ficha del terreno.
- Endpoints sugeridos: `POST /reviews`, `GET /users/:userId/reviews`.

#### HU-98 — Comparador de terrenos
Como **visitante**, quiero seleccionar hasta 3 terrenos y compararlos lado a lado,
para decidir mejor cuál me conviene.
- Se pueden añadir/quitar terrenos de una lista de comparación (máx. 3).
- La vista muestra en columnas: precio, área, provincia/distrito, usos permitidos y disponibilidad.
- Mayormente frontend; reutiliza `GET /lands/:id`. La selección persiste en `localStorage`.

#### HU-99 — Búsquedas guardadas y alertas
Como **usuario autenticado**, quiero guardar un conjunto de filtros y recibir un email cuando
aparezca un terreno que los cumpla, para no revisar el catálogo manualmente.
- `POST /users/me/saved-searches` guarda los filtros con un nombre.
- Un proceso periódico compara terrenos nuevos `active` contra las búsquedas guardadas y notifica por email (reutiliza `lib/email.ts`).
- `GET` / `DELETE /users/me/saved-searches` gestionan la lista.

#### HU-100 — Agendar visita a un terreno
Como **arrendatario interesado**, quiero solicitar una cita para visitar un terreno,
para conocerlo antes de reservar.
- `POST /lands/:id/visits` crea una solicitud de visita con fecha/hora propuesta.
- El dueño confirma, reprograma o rechaza (`PATCH /visits/:id`).
- Ambas partes ven sus visitas agendadas; se genera una notificación.

#### HU-101 — Exportar contrato a PDF
Como **parte de un contrato**, quiero descargar el contrato en PDF,
para tener un respaldo formal del acuerdo.
- `GET /contracts/:id/pdf` genera un PDF con términos, fechas, partes y estado de firma.
- Solo las partes del contrato o un admin pueden descargarlo.
- Si el contrato está `active`/`completed`, el PDF incluye la evidencia de firma (nombre, fecha).

---

## 4. Decisión sobre las tools peligrosas del MCP

El riesgo no es el código, sino **exponer estas acciones a un agente de IA** que actúa en nombre
del usuario. Estas quedan **fuera** del conteo de RF y se recomienda sacarlas o restringirlas:

| HU | Tool | Riesgo | Decisión |
|----|------|--------|----------|
| 74 | `sign_contract` | Firma legal vinculante | **Quitar del MCP.** La firma debe ser un acto humano en la web. |
| 77 | `create_payment_session` | Inicia flujo de dinero | **Quitar o degradar** a solo entregar link con confirmación humana. |
| 80 | `refund_payment` | Devuelve dinero | **Quitar del MCP.** Acción financiera de admin. |
| 91 | `manage_user_status` | Bloquea/activa cuentas | **Quitar del MCP.** Moderación de cuentas debe ser humana. |
| 69 | `delete_land` | Destructiva | **Mantener** con confirmación explícita obligatoria. |
| 83 | `send_chat_message` | Habla por el usuario | **Mantener** con confirmación antes de enviar. |
| 90 | `moderate_land` | Despublica a terceros | **Mantener** solo admin + confirmación. |
| 78 | `get_payment_status` | Solo lectura | ✅ **Dejar.** No es peligrosa. |

**Criterio general:** el agente puede *leer* casi todo; las acciones **legales, financieras y de
moderación de cuentas** (74, 77, 80, 91) salen del MCP y quedan solo en la web con un humano al frente.

---

## 5. Próximos pasos

1. Validar con el profesor que estos 30 RF cumplen el requisito.
2. Documentar formalmente HU 93–101 en `docs/historias-usuario/index.html` (o mantener este archivo como fuente).
3. Implementar las 5 HU nuevas (HU-97 a HU-101).
4. Aplicar las decisiones del MCP (§4) sobre las tools peligrosas.

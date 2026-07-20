# TerraShare — Reglas de seguridad para tools sensibles del MCP

> Decisiones acordadas para **endurecer** (no eliminar) las tools del servidor MCP que ejecutan
> acciones legales, financieras, de moderación o destructivas en nombre del usuario.
> El objetivo es que un agente de IA no pueda ejecutar acciones irreversibles sin control humano.
>
> Grupo 1GS241 · Universidad Tecnológica de Panamá · Desarrollo de Software IX

---

## Capas de seguridad (legenda)

| Capa | Nombre | Qué hace |
|------|--------|----------|
| **A** | Confirmación | Exige `confirm: true` en la llamada. Barrera mínima. |
| **B** | Preview en 2 pasos | 1ª llamada devuelve un resumen de la acción + un `confirmationToken`; la acción solo procede si la 2ª llamada trae ese token. Evita ejecuciones "a ciegas". |
| **C** | Restringir rol/ownership | Verificación estricta de que el `actingUser` es realmente la parte autorizada (owner/tenant/admin). |
| **D** | Límites/umbrales | La acción se bloquea o exige doble confirmación por encima de cierto valor. |
| **E** | Notificar al usuario | Cada ejecución dispara email/notificación a los afectados (defensa en profundidad + trazabilidad). |
| **F** | Interruptor por config | Env var para desactivar la tool en despliegues sensibles. |
| **G** | Solo-preparar | La tool no ejecuta la acción irreversible, solo la prepara (ej.: devolver un link, no cobrar). |

> Estado base: cuatro tools ya implementan la capa **A** (`sign_contract`, `refund_payment`,
> `manage_user_status`, `delete_land`) vía `confirm: true`.

---

## Reglas por tool

### 🖋️ `sign_contract` (HU-74) — Firmar contrato
**Capas: B + C + E + F**
- **B:** la 1ª llamada devuelve los términos del contrato + `confirmationToken`; la firma solo procede con ese token.
- **C:** verificar estrictamente que `actingUser` es `owner` o `tenant` del contrato.
- **E:** email/notificación a ambas partes al firmarse vía agente.
- **F:** env var (ej. `MCP_ALLOW_SIGN`) para desactivar la firma por MCP.

### 💸 `refund_payment` (HU-80) — Reembolsar pago (admin)
**Capas: A + B + D + E + F**
- **A:** `confirm: true` (ya existe).
- **B:** preview con el monto y el pago a reembolsar antes de ejecutar.
- **D:** reembolsos por encima de un umbral configurable exigen doble confirmación.
- **E:** notificar al usuario dueño del pago.
- **F:** env var para desactivar reembolsos por MCP.

### 💳 `create_payment_session` (HU-77) — Crear sesión de pago
**Capas: A + C + G**
- **A:** `confirm: true`.
- **C:** verificar que `actingUser` es el arrendatario dueño de la solicitud a pagar.
- **G:** la tool solo devuelve el `checkoutUrl`; nunca cobra ni expone secretos de Stripe (ya se cumple; dejarlo explícito y probado).

### 🚫 `manage_user_status` (HU-91) — Bloquear/activar usuario (admin)
**Capas: A + B + E**
- **A:** `confirm: true` (ya existe).
- **B:** preview ("vas a bloquear/activar a <usuario>") antes de ejecutar.
- **E:** notificar al usuario afectado + registrar auditoría. (Ya es admin y no puede auto-modificarse.)

### 🛡️ `moderate_land` (HU-90) — Moderar terreno (admin)
**Capas: A + E**
- **A:** añadir `confirm: true` (hoy no lo tiene).
- **E:** notificar al dueño del terreno despublicado. (Ya es admin.)

### 🗑️ `delete_land` (HU-69) — Eliminar terreno
**Capas: A + B + E + soft-delete**
- **A:** `confirm: true` (ya existe).
- **B:** preview de lo que se eliminará.
- **E:** notificar al dueño.
- **soft-delete:** marcar como `deleted` (recuperable) en lugar de borrado físico.

### 💬 `send_chat_message` (HU-83) — Enviar mensaje
**Capas: A + marca de transparencia**
- **A:** añadir `confirm: true` (hoy no lo tiene).
- **Transparencia:** marcar el mensaje como "enviado vía asistente" (flag/metadata) para que el receptor sepa que no fue escrito a mano. Toque ligero (bajo riesgo).

---

## Resumen

| HU | Tool | Capas |
|----|------|-------|
| 74 | `sign_contract` | B + C + E + F |
| 80 | `refund_payment` | A + B + D + E + F |
| 77 | `create_payment_session` | A + C + G |
| 91 | `manage_user_status` | A + B + E |
| 90 | `moderate_land` | A + E |
| 69 | `delete_land` | A + B + E + soft-delete |
| 83 | `send_chat_message` | A + transparencia |

`get_payment_status` (HU-78) y el resto de tools de solo lectura no requieren cambios.

---

## Notas de implementación

- El andamiaje `registerTool` (`define-tool.ts`) es el punto natural para estandarizar las capas
  **A** (confirm) y **B** (token de preview), de modo que no se reimplementen en cada tool.
- La capa **E** (notificaciones) puede reutilizar `apps/backend-api/src/lib/email.ts` y el modelo
  de notificaciones existente.
- La capa **F** (interruptores) se lee desde `apps/backend-api/src/config/env.ts`.
- Añadir/actualizar tests por tool para cubrir: sin `confirm` → error, token inválido → error,
  rol/ownership incorrecto → error, umbral superado → error.

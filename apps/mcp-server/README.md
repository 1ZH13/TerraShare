# TerraShare MCP Server (#234)

Servidor **MCP (Model Context Protocol)** que expone el dominio de TerraShare como
*tools* consumibles por clientes MCP (Claude Desktop, Claude Code, etc.).

Esta es la **fundación** del épico #234: servidor + transporte stdio + autenticación
por API key + la primera tool (`search_lands`, HU-63 #180). Las 30 tools están
desglosadas en los issues HU-63…HU-92 y se registran en `src/server.ts`.

## Arquitectura

- Runtime **Bun** (alineado con `apps/backend-api`).
- SDK oficial `@modelcontextprotocol/sdk` (TypeScript).
- **Reutiliza** la capa de datos del backend (`@backend/db/*`: modelos Mongoose y
  conexión) — no se duplica lógica. La misma `MONGODB_URI`.
- Cada tool valida su entrada con Zod y devuelve `structuredContent`.

## Ejecutar

```bash
cd apps/mcp-server
bun install
MONGODB_URI="mongodb://127.0.0.1:27017/terrashare" bun run start
```

El servidor habla por **stdio** (stdout = canal del protocolo; los logs van a stderr).

## Variables de entorno

| Variable | Requerida | Descripción |
|----------|-----------|-------------|
| `MONGODB_URI` | recomendado | Misma BD que el backend. Default: `mongodb://127.0.0.1:27017/terrashare`. |
| `MCP_ACTING_USER_ID` | para tools con permisos | `clerkUserId` del usuario en cuyo nombre actúa el servidor. Su rol/estado se resuelven desde Mongo. Sin él, solo funcionan las tools públicas. |
| `MCP_API_KEY` | opcional | Si se define, activa la autenticación por API key (para transportes remotos). |
| `MCP_PROVIDED_KEY` | si hay `MCP_API_KEY` | Key que aporta el proceso que lanza el servidor; debe coincidir. |

En uso local por stdio la confianza es del proceso que lo lanza; la API key está
pensada para el transporte remoto (HTTP/SSE), a añadir después.

## Identidad y permisos

Las tools que exponen o mutan datos con permisos usan los helpers `can*` del
backend (reexportados en `src/permissions.ts`), que necesitan saber **quién
actúa**. Ese usuario se configura con `MCP_ACTING_USER_ID` (su `clerkUserId`); el
servidor resuelve su rol/estado desde Mongo y lo expone a cada tool como
`ctx.actingUser`.

Cada tool declara su acceso con `requires`:

| `requires` | Significado |
|------------|-------------|
| `"public"` (default) | No requiere identidad (p. ej. `search_lands`). |
| `"user"` | Requiere `MCP_ACTING_USER_ID` (usuario activo, no bloqueado). |
| `"admin"` | Requiere que ese usuario tenga rol `admin`. |

El andamiaje (`src/tools/define-tool.ts`) aplica esta puerta automáticamente y
devuelve un error legible si no se cumple.

## Cómo construir una tool (para el equipo) — HU-64..HU-92

Cada tool es independiente. Pasos:

1. Copia `src/tools/_template.ts` a `src/tools/<mi-tool>.ts`.
2. Define el `inputSchema` (shape Zod, con `.describe()` en cada campo).
3. Escribe la lógica en el `handler(args, ctx)`:
   - Usa `ctx.actingUser` (garantizado si `requires` es `"user"`/`"admin"`).
   - Aplica permisos por recurso con los helpers de `../permissions`
     (p. ej. `canMutateLand(ctx.actingUser!, land)`).
   - Lanza `ToolError("mensaje")` para errores de negocio (se devuelven como
     resultado de error, sin tumbar el servidor).
   - Devuelve un objeto plano (se serializa a JSON + `structuredContent`).
4. Regístrala añadiéndola al array `TOOLS` de `src/server.ts`.
5. Añade `src/tools/<mi-tool>.test.ts` (el preload levanta Mongo en memoria y
   siembra terrenos/usuarios; ver `search-lands.test.ts` y `define-tool.test.ts`).

No dupliques lógica de negocio: reutiliza modelos (`@backend/db/schemas`) y
reglas (`@backend/lib/auth-helpers` vía `../permissions`).

## Conectar un cliente MCP

### Claude Desktop / Claude Code

Añade el servidor a la config de MCP del cliente (`claude_desktop_config.json` o
`.mcp.json`):

```json
{
  "mcpServers": {
    "terrashare": {
      "command": "bun",
      "args": ["run", "C:/ruta/al/repo/apps/mcp-server/src/index.ts"],
      "env": {
        "MONGODB_URI": "mongodb://127.0.0.1:27017/terrashare",
        "MCP_ACTING_USER_ID": "<clerkUserId opcional para tools con permisos>"
      }
    }
  }
}
```

Tras reiniciar el cliente, la tool `search_lands` aparecerá disponible.

## Tools

| Tool | HU | Issue | Estado |
|------|-----|-------|--------|
| `search_lands` | HU-63 | #180 | ✅ implementada |
| `create_land` | HU-65 | #182 | ✅ implementada |
| `create_payment_session` | HU-77 | #194 | ✅ implementada |
| `refund_payment` | HU-80 | #197 | ✅ implementada |

`search_lands`: busca terrenos publicados (activos) con filtros por texto,
ubicación, uso, operación y precio; devuelve resultados paginados.

Ejemplo de argumentos:

```json
{ "province": "Chiriqui", "use": "agricultura", "priceMax": 1000, "pageSize": 10 }
```

`create_land` (`requires: user`): crea un terreno en `draft` a nombre del dueño
autenticado (`MCP_ACTING_USER_ID`). Valida con el mismo `CreateLandSchema`
compartido que la API REST y registra un evento de auditoría.

Ejemplo de argumentos:

```json
{
  "title": "Finca agrícola en Boquete",
  "area": 12000,
  "allowedUses": ["agricultura"],
  "location": { "province": "Chiriqui", "district": "Boquete" },
  "priceRule": { "currency": "USD", "pricePerMonth": 750 }
}
```

`create_payment_session` (`requires: user`): genera un enlace de pago
(`checkoutUrl`) para una solicitud **pagable** (`approved`/`pending_payment`), a
nombre del arrendatario (o admin). Crea una sesión real de Stripe si
`STRIPE_SECRET_KEY` está configurada; si no, usa el fallback de desarrollo (igual
que el backend). **No expone secretos de Stripe**. Reusa `CreateCheckoutSessionSchema`,
`canInitiatePayment` y `computePaymentBreakdown`.

Variables de entorno adicionales (opcionales): `STRIPE_SECRET_KEY`,
`STRIPE_PLATFORM_FEE_BPS` (default 500 = 5%).

Ejemplo de argumentos:

```json
{
  "rentalRequestId": "rr_123",
  "currency": "USD",
  "successUrl": "https://app.terrashare.co/pago/ok",
  "cancelUrl": "https://app.terrashare.co/pago/cancel"
}
```

`refund_payment` (`requires: admin`): reembolsa total o parcialmente un pago
pagado. **Acción sensible: exige `confirm: true`.** Usa Stripe real si hay
`STRIPE_SECRET_KEY` y el pago tiene `stripePaymentIntentId`; actualiza el estado
del pago (`partially_refunded`/`refunded`) y registra auditoría. Reusa
`CreateRefundSchema` y el helper de Stripe.

Ejemplo de argumentos (reembolso parcial):

```json
{ "paymentId": "pay_123", "amount": 100, "reason": "Cancelación parcial", "confirm": true }
```

## Tests

```bash
bun test        # tools + auth + E2E (cliente MCP real contra Mongo en memoria)
bun run typecheck
```

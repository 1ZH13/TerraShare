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
| `MCP_API_KEY` | opcional | Si se define, activa la autenticación por API key (para transportes remotos). |
| `MCP_PROVIDED_KEY` | si hay `MCP_API_KEY` | Key que aporta el proceso que lanza el servidor; debe coincidir. |

En uso local por stdio la confianza es del proceso que lo lanza; la API key está
pensada para el transporte remoto (HTTP/SSE), a añadir después.

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
        "MONGODB_URI": "mongodb://127.0.0.1:27017/terrashare"
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

`search_lands`: busca terrenos publicados (activos) con filtros por texto,
ubicación, uso, operación y precio; devuelve resultados paginados.

Ejemplo de argumentos:

```json
{ "province": "Chiriqui", "use": "agricultura", "priceMax": 1000, "pageSize": 10 }
```

## Tests

```bash
bun test        # tools + auth + E2E (cliente MCP real contra Mongo en memoria)
bun run typecheck
```

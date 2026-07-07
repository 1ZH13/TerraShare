# TerraShare Backend API — Correcciones de Seguridad

Este documento registra las correcciones de seguridad implementadas en el backend
de TerraShare, incluyendo el problema resuelto, los cambios aplicados y el
comportamiento esperado.

---

## Rate limiting por usuario y API key (HU-40, #158)

Fecha: 2026-07-06

### Problema

Solo había rate limiting por IP (global 100 req/min). Usuarios autenticados no tenían
límites propios. No había cabecera `Retry-After` en respuestas 429.

### Cambios aplicados

- `apps/backend-api/src/middleware/rate-limit.ts`:
  - Todas las funciones (`rateLimitByIP`, `rateLimitByUser`, `rateLimitByIPAndUser`)
    ahora incluyen cabecera `Retry-After` en respuestas 429.
  - Nueva función `rateLimitByApiKey(toolName, limit)` para rate limiting por API key
    (preparado para servidor MCP, HU-63+).
- `apps/backend-api/src/app.ts`: `rateLimitByUser(200)` aplicado a rutas autenticadas
  (lands, rental-requests, contracts, payments, chats, admin, analytics).

### Límites configurados

| Tipo | Límite | Rutas |
|------|--------|-------|
| IP | 100 req/min | Global `/api/v1/*` |
| Usuario | 200 req/min | Rutas autenticadas |
| API key (futuro MCP) | 200 req/min | Por tool |

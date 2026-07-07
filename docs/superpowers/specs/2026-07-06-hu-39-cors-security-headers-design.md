# HU-39 — Cabeceras de seguridad y CORS estricto

- **Issue**: #157 ([HU-39][backend-api] Cabeceras de seguridad y CORS estricto)
- **Epic de referencia**: #134
- **Rama**: `feature/backend-api/157-cors-security-headers` (desde `main`)
- **Fecha**: 2026-07-06
- **Responsable**: Chrisvlj
- **Milestone**: Production-Ready
- **Labels**: module:backend-api, topic:security, priority:high

## 1. Problema

El backend (`apps/backend-api`) presenta dos debilidades de seguridad en la configuración HTTP:

1. **CORS abierto** (`src/app.ts:22-26`): `origin: "*"`, permite cualquier origen en todos los entornos, incluyendo producción.
2. **Cabeceras de seguridad ausentes**: no se envía HSTS, CSP, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `X-Frame-Options`, ni políticas de aislamiento cross-origin.
3. **Headers dev en producción**: `x-dev-role` y `x-dev-user-id` están en `allowHeaders` para todos los entornos. Son mecanismos de bypass de auth pensados solo para desarrollo local.

## 2. Objetivo

Cumplir los criterios de aceptación de HU-39:

- (a) CORS restringe orígenes según entorno (no `*` en producción).
- (b) Se aplican cabeceras de seguridad estándar a todas las respuestas.

## 3. Alcance

- **Solo `apps/backend-api`** (middleware + config + tests + env example + doc).
- **Sin BD/Mongoose**: HU-39 es nivel sistema, no toca modelo de datos.
- **Sin `apps/web`**: la API es JSON; el CSP del HTML servido por el frontend es concern del host/web, no del backend. No hay cara visible en la UI para esta historia.
- **Sin `packages/shared`**: las cabeceras de seguridad no son contrato entre módulos. Añadir tipos artificiales que nadie consume sería ruido.
- El boilerplate "vertical completo" del issue (BD + Backend + Contratos + Frontend + Pruebas) no aplica literalmente a HU-39. Se documentará esta decisión en el body del PR.

## 4. Decisiones de diseño

| Decisión | Elección | Razón |
|---|---|---|
| Allowlist CORS prod | Env var `CORS_ALLOWED_ORIGINS` (comma-separated) | Flexible, no requiere code change por nuevo dominio. Fail-closed en prod sin la var. |
| CSP backend | `default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'` | API JSON no carga scripts/estilos/frames. Máxima restricción. |
| Implementación | `hono/cors` + middleware propio `security-headers.ts` | Aprovecha la lib para preflight OPTIONS; separa concerns; sin dependencias nuevas (lockfile congelado). |
| `packages/shared` | No se toca | Las cabeceras no son contrato entre módulos. |
| HSTS | Solo en prod + HTTPS, sin `preload` | HSTS sobre http rompe local. Condición: `NODE_ENV === "production"` AND `x-forwarded-proto: https` o scheme `https:`. `preload` se omite hasta confirmar dominio final (lista preload es permanente). |
| Dev headers (`x-dev-*`) | Solo en `allowHeaders` cuando `env.allowDevAuthBypass` | Fix de seguridad: hoy se permiten en todos los entornos. |

## 5. Arquitectura

### 5.1 CORS — `src/config/env.ts` + `src/app.ts`

- Nueva env var **`CORS_ALLOWED_ORIGINS`** (comma-separated).
- Getter `env.corsAllowedOrigins: string[]` que la parsea (split por `,`, trim, filtrar vacíos).
- Helper `env.isProduction: boolean` (`process.env.NODE_ENV === "production"`).
- **Dev fallback** (`!isProduction` y var vacía/ausente): permitir `http://localhost:*` y `http://127.0.0.1:*` (cualquier puerto).
- **Prod**: solo orígenes en la allowlist. Sin la var → allowlist vacía → deniega todo cross-origin (fail-closed).
- `origin` de `hono/cors` pasa a ser función **`resolveCorsOrigin(origin: string | undefined): string | null`**:
  - Si `origin` está en allowlist (o matchea patrón localhost en dev) → devuelve `origin` (refleja).
  - Si no → devuelve `null` (deniega, sin `access-control-allow-origin` en respuesta).
- `allowHeaders` base: `Content-Type`, `Authorization`, `x-request-id`, `stripe-signature`.
- `allowHeaders` dev extra (gated): `x-dev-role`, `x-dev-user-id` (solo cuando `env.allowDevAuthBypass`).
- `exposeHeaders`: `x-request-id`, `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` (para que el cliente lea info de rate limit).
- `allowCredentials: false` (bearer tokens, sin cookies).
- `maxAge: 86400` (cachea preflight 24h).

### 5.2 Security headers — nuevo `src/middleware/security-headers.ts`

Middleware propio (`MiddlewareHandler`) que setea en **todas** las respuestas (incluida preflight y errores):

| Header | Valor | Condición |
|---|---|---|
| `Content-Security-Policy` | `default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'` | Siempre |
| `X-Content-Type-Options` | `nosniff` | Siempre |
| `Referrer-Policy` | `no-referrer` | Siempre |
| `Permissions-Policy` | `geolocation=(), microphone=(), camera=(), payment=(), usb=()` | Siempre |
| `X-Frame-Options` | `DENY` | Siempre (legacy, refuerza `frame-ancestors`) |
| `Cross-Origin-Resource-Policy` | `same-origin` | Siempre |
| `Cross-Origin-Opener-Policy` | `same-origin` | Siempre |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains` | Solo `isProduction` AND request HTTPS |

**Nota HSTS**: no se incluye `preload` inicialmente. La lista HSTS preload es permanente y requiere dominio final confirmado + envío a hstspreload.org. Se puede añadir `preload` en un follow-up una vez el dominio de prod esté confirmado.

**Detección HTTPS en prod**: `c.req.header("x-forwarded-proto")?.split(",")[0]?.trim() === "https"` OR `new URL(c.req.url).protocol === "https:"`.

### 5.3 Wiring en `src/app.ts`

Orden de middlewares (securityHeaders primero para que aplique también a respuestas de preflight y errores):

```ts
app.use("*", securityHeaders);
app.use("*", cors({
  origin: resolveCorsOrigin,
  allowHeaders: corsAllowHeaders(),
  exposeHeaders: ["x-request-id", "X-RateLimit-Limit", "X-RateLimit-Remaining", "X-RateLimit-Reset"],
  allowCredentials: false,
  maxAge: 86400,
}));
app.use("*", requestIdMiddleware);
app.use("/api/v1/*", rateLimitByIP(100));
```

Preflight OPTIONS: `securityHeaders` setea headers → `cors` responde 204 con CORS headers. Una sola pasada.

### 5.4 Env / config

- `src/types.ts`: añadir `CORS_ALLOWED_ORIGINS?: string` a la interfaz `Env`.
- `src/config/env.ts`:
  - Getter `corsAllowedOrigins: string[]`.
  - Getter `isProduction: boolean`.
  - Helper exportado `resolveCorsOrigin(origin: string | undefined): string | null`.
  - Helper exportado `corsAllowHeaders(): string[]` (base + dev extras gated).
- `apps/backend-api/.env.example`: añadir `CORS_ALLOWED_ORIGINS=http://localhost:5173` con comentario explicando uso en prod.

## 6. Pruebas (Bun)

Sigo el patrón existente (`src/setup-test-env.ts`, `src/lib/http-test-utils.ts`, `src/routes/*.test.ts`).

### 6.1 `src/middleware/security-headers.test.ts`

- Headers base presentes en GET básico (`/`): CSP, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `X-Frame-Options`, `Cross-Origin-Resource-Policy`, `Cross-Origin-Opener-Policy`.
- HSTS ausente en dev (`NODE_ENV !== "production"`).
- HSTS ausente en prod sin HTTPS (stub `process.env.NODE_ENV="production"` + request http, con restore).
- HSTS presente en prod + `x-forwarded-proto: https` (stub con restore).
- Headers presentes en respuesta de error (404 notFound, 500 onError).

### 6.2 `src/middleware/cors.test.ts`

- OPTIONS preflight con Origin permitido → 204 + `access-control-allow-origin` reflejado + `access-control-allow-methods` presente.
- OPTIONS preflight con Origin no permitido → sin `access-control-allow-origin` en respuesta.
- Dev (`NODE_ENV !== "production"`): `http://localhost:5173` permitido; `x-dev-user-id` presente en `access-control-allow-headers`.
- Prod con `CORS_ALLOWED_ORIGINS=https://terrashare.app`: ese origen permitido, `http://localhost:5173` denegado, y `x-dev-user-id` **no** en `access-control-allow-headers`.
- Prod sin `CORS_ALLOWED_ORIGINS`: cualquier origen denegado (fail-closed).
- `exposeHeaders` incluye `x-request-id` y los de rate limit.

Cada test que muta `process.env.NODE_ENV` o `process.env.CORS_ALLOWED_ORIGINS` debe hacer backup y restore en `afterEach`/`afterAll`.

## 7. Archivos afectados

| Archivo | Cambio |
|---|---|
| `apps/backend-api/src/types.ts` | Añadir `CORS_ALLOWED_ORIGINS?: string` a `Env` |
| `apps/backend-api/src/config/env.ts` | Getters `corsAllowedOrigins`, `isProduction`; helpers `resolveCorsOrigin`, `corsAllowHeaders` |
| `apps/backend-api/src/middleware/security-headers.ts` | **Nuevo** middleware |
| `apps/backend-api/src/middleware/security-headers.test.ts` | **Nuevo** tests |
| `apps/backend-api/src/middleware/cors.test.ts` | **Nuevo** tests de CORS por entorno |
| `apps/backend-api/src/app.ts` | Wiring: securityHeaders primero, cors con `resolveCorsOrigin` y `corsAllowHeaders()` |
| `apps/backend-api/.env.example` | Añadir `CORS_ALLOWED_ORIGINS` |
| `docs/SECURITY_FIXES.md` | Entrada nueva siguiendo el patrón (problema → cambios → archivos) |

## 8. Verificación

```bash
cd apps/backend-api
bun run typecheck
bun test
```

Ambos deben pasar. El CI (`.github/workflows/backend-api-ci.yml`) ejecuta exactamente estos dos comandos sobre `apps/backend-api/**`.

## 9. PR

- Título: `[HU-39][backend-api] Cabeceras de seguridad y CORS estricto`
- Body con template `.github/PULL_REQUEST_TEMPLATE.md`.
- `Closes #157` (keyword requerida por `require-linked-issue.yml`).
- Sección "Resumen" explicando que BD/Frontend/Contratos no aplican a HU-39 (nivel sistema, API JSON sin cara visible).
- "Riesgos y rollback": riesgo principal = CORS mal configurado bloquea frontend legítimo en prod; rollback = revertir el merge (cambio confinado a middleware/config).

## 10. DoD

- [ ] Criterios de HU-39 cumplidos: CORS por entorno + cabeceras estándar.
- [ ] `bun run typecheck` en verde.
- [ ] `bun test` en verde (tests nuevos + existentes).
- [ ] CI `backend-api-ci.yml` en verde.
- [ ] 1 aprobación de revisor.
- [ ] `docs/SECURITY_FIXES.md` actualizado.
- [ ] `.env.example` actualizado.

## 11. Riesgos

| Riesgo | Mitigación |
|---|---|
| CORS bloquea un origen legítimo en prod | Allowlist vía env var, configurable sin code change. Fail-closed es intencional: obliga a declarar orígenes. |
| HSTS preload bloquea rollback a http | `preload` se omite en este PR (lista preload es permanente). Solo `max-age` + `includeSubDomains`, activo exclusivamente en prod + HTTPS. Se puede añadir `preload` en un follow-up tras confirmar dominio final. |
| Tests flaky por mutación de `process.env` | Backup/restore explícito en `afterEach`. |
| `x-dev-*` headers rotos en dev después del fix | Gated por `env.allowDevAuthBypass` (true en dev por fallback). Tests verifican presencia en dev. |

## 12. Fuente de la historia

`docs/historias-usuario/index.html` (HU-39):
> Como sistema, quiero cabeceras de seguridad (HSTS, CSP) y CORS por entorno, para reducir la superficie de ataque.
>
> - CORS restringe orígenes según entorno (no `*` en producción).
> - Se aplican cabeceras de seguridad estándar a todas las respuestas.

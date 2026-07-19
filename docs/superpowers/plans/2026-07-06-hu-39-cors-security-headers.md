# HU-39 Cabeceras de seguridad y CORS estricto — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restringir CORS por entorno (no `*` en producción) y añadir cabeceras de seguridad estándar (HSTS, CSP, etc.) a todas las respuestas del backend `apps/backend-api`.

**Architecture:** Middleware propio `security-headers.ts` setea cabeceras antes de `await next()` (aparecen también en preflight 204 porque `hono/cors` reutiliza `c.res.headers`). CORS via `hono/cors` con `origin` como función `resolveCorsOrigin` que refleja orígenes de una allowlist por entorno (env var `CORS_ALLOWED_ORIGINS`, fail-closed en prod). Helpers de config en `src/config/env.ts`.

**Tech Stack:** Bun + Hono 4, TypeScript, `bun test` (bunfig.toml preload con MongoMemoryServer — los tests de middleware no usan Mongo pero el preload corre igual; es inofensivo).

## Global Constraints

- **Sin dependencias nuevas**: `bun.lock` debe permanecer congelado (CI usa `bun install --frozen-lockfile`).
- **Stack**: Hono 4.7.2, Bun, TypeScript 5.6.3.
- **Sin comentarios en código** salvo que el usuario los pida (regla de estilo del repo).
- **Patrón de tests**: `import { describe, expect, it, beforeEach, afterEach } from "bun:test"`. Usar `createApp()` de `../app` + `app.request(path, init)` para tests de middleware.
- **Env vars se restauran**: todo test que mute `process.env` debe hacer backup y restore en `afterEach`.
- **Branch**: `feature/backend-api/157-cors-security-headers` (ya creada desde `main`).
- **Spec**: `docs/superpowers/specs/2026-07-06-hu-39-cors-security-headers-design.md`.

---

## File Structure

| Archivo | Responsabilidad | Acción |
|---|---|---|
| `apps/backend-api/src/types.ts` | Definir interfaz `Env` | Modificar: añadir `CORS_ALLOWED_ORIGINS?: string` |
| `apps/backend-api/src/config/env.ts` | Config + helpers CORS | Modificar: añadir getters `isProduction`, `corsAllowedOrigins` y exports `resolveCorsOrigin`, `corsAllowHeaders` |
| `apps/backend-api/src/config/env.test.ts` | Unit tests de helpers CORS | Crear |
| `apps/backend-api/src/middleware/security-headers.ts` | Middleware de cabeceras de seguridad | Crear |
| `apps/backend-api/src/middleware/security-headers.test.ts` | Tests del middleware | Crear |
| `apps/backend-api/src/middleware/cors.test.ts` | Tests de integración CORS por entorno | Crear |
| `apps/backend-api/src/app.ts` | Wiring de middlewares | Modificar: `securityHeaders` primero, `cors` con `resolveCorsOrigin` y `corsAllowHeaders()` |
| `apps/backend-api/.env.example` | Documentar env vars | Modificar: añadir `CORS_ALLOWED_ORIGINS` |
| `docs/SECURITY_FIXES.md` | Registro de cambios de seguridad | Modificar: añadir entrada HU-39 |

---

### Task 1: Env config + helpers CORS con unit tests

**Files:**
- Modify: `apps/backend-api/src/types.ts:26-35`
- Modify: `apps/backend-api/src/config/env.ts`
- Test: `apps/backend-api/src/config/env.test.ts`

**Interfaces:**
- Produces: `env.isProduction: boolean`, `env.corsAllowedOrigins: string[]`, `resolveCorsOrigin(origin: string): string | null`, `corsAllowHeaders(): string[]`
- `resolveCorsOrigin` se usa en Task 3 (`app.ts`); `corsAllowHeaders` se usa en Task 3 (`app.ts`).

- [ ] **Step 1: Añadir `CORS_ALLOWED_ORIGINS` a `Env` en `src/types.ts`**

En `apps/backend-api/src/types.ts`, añadir el campo al final de la interfaz `Env` (después de `WHATSAPP_CONTACT_ENABLED?: string`):

```ts
  CORS_ALLOWED_ORIGINS?: string;
```

- [ ] **Step 2: Escribir los tests que fallan en `src/config/env.test.ts`**

Crear `apps/backend-api/src/config/env.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it } from "bun:test";

import { corsAllowHeaders, env, resolveCorsOrigin } from "./env";

describe("env CORS helpers", () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalCors = process.env.CORS_ALLOWED_ORIGINS;
  const originalDevBypass = process.env.ALLOW_DEV_AUTH_BYPASS;

  beforeEach(() => {
    delete process.env.CORS_ALLOWED_ORIGINS;
    delete process.env.ALLOW_DEV_AUTH_BYPASS;
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    process.env.CORS_ALLOWED_ORIGINS = originalCors;
    process.env.ALLOW_DEV_AUTH_BYPASS = originalDevBypass;
  });

  describe("resolveCorsOrigin", () => {
    it("dev: permite localhost en cualquier puerto sin CORS_ALLOWED_ORIGINS", () => {
      process.env.NODE_ENV = "development";
      expect(resolveCorsOrigin("http://localhost:5173")).toBe("http://localhost:5173");
      expect(resolveCorsOrigin("http://127.0.0.1:3000")).toBe("http://127.0.0.1:3000");
    });

    it("dev: permite origen explicito en la allowlist", () => {
      process.env.NODE_ENV = "development";
      process.env.CORS_ALLOWED_ORIGINS = "http://localhost:5173";
      expect(resolveCorsOrigin("http://localhost:5173")).toBe("http://localhost:5173");
    });

    it("dev: deniega origen no localhost y no listado", () => {
      process.env.NODE_ENV = "development";
      expect(resolveCorsOrigin("https://evil.com")).toBe(null);
    });

    it("prod: permite solo origenes en CORS_ALLOWED_ORIGINS", () => {
      process.env.NODE_ENV = "production";
      process.env.CORS_ALLOWED_ORIGINS = "https://terrashare.app,https://www.terrashare.app";
      expect(resolveCorsOrigin("https://terrashare.app")).toBe("https://terrashare.app");
      expect(resolveCorsOrigin("https://www.terrashare.app")).toBe("https://www.terrashare.app");
      expect(resolveCorsOrigin("http://localhost:5173")).toBe(null);
    });

    it("prod: fail-closed cuando CORS_ALLOWED_ORIGINS esta vacio", () => {
      process.env.NODE_ENV = "production";
      delete process.env.CORS_ALLOWED_ORIGINS;
      expect(resolveCorsOrigin("https://terrashare.app")).toBe(null);
      expect(resolveCorsOrigin("http://localhost:5173")).toBe(null);
    });

    it("retorna null para string vacio (sin header Origin)", () => {
      process.env.NODE_ENV = "development";
      expect(resolveCorsOrigin("")).toBe(null);
    });
  });

  describe("corsAllowHeaders", () => {
    it("dev: incluye headers dev cuando ALLOW_DEV_AUTH_BYPASS=true", () => {
      process.env.NODE_ENV = "development";
      process.env.ALLOW_DEV_AUTH_BYPASS = "true";
      const headers = corsAllowHeaders();
      expect(headers).toContain("Content-Type");
      expect(headers).toContain("Authorization");
      expect(headers).toContain("x-request-id");
      expect(headers).toContain("stripe-signature");
      expect(headers).toContain("x-dev-role");
      expect(headers).toContain("x-dev-user-id");
    });

    it("prod: NO incluye headers dev", () => {
      process.env.NODE_ENV = "production";
      process.env.ALLOW_DEV_AUTH_BYPASS = "false";
      const headers = corsAllowHeaders();
      expect(headers).toContain("Content-Type");
      expect(headers).toContain("Authorization");
      expect(headers).toContain("x-request-id");
      expect(headers).toContain("stripe-signature");
      expect(headers).not.toContain("x-dev-role");
      expect(headers).not.toContain("x-dev-user-id");
    });
  });

  describe("env.isProduction", () => {
    it("true cuando NODE_ENV=production", () => {
      process.env.NODE_ENV = "production";
      expect(env.isProduction).toBe(true);
    });

    it("false cuando NODE_ENV=development", () => {
      process.env.NODE_ENV = "development";
      expect(env.isProduction).toBe(false);
    });
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd apps/backend-api && bun test src/config/env.test.ts`
Expected: FAIL — `env.isProduction` no existe, `resolveCorsOrigin` y `corsAllowHeaders` no están exportados.

- [ ] **Step 4: Implementar getters y helpers en `src/config/env.ts`**

Reemplazar el contenido completo de `apps/backend-api/src/config/env.ts` con:

```ts
import type { Env } from "../types";

function getEnv(name: keyof Env): string | undefined {
  return process.env[name];
}

function requireEnv(name: keyof Env): string {
  const value = getEnv(name);
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const BASE_CORS_ALLOW_HEADERS = [
  "Content-Type",
  "Authorization",
  "x-request-id",
  "stripe-signature",
];

const DEV_CORS_ALLOW_HEADERS = ["x-dev-role", "x-dev-user-id"];

const LOCALHOST_PATTERN = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

export const env = {
  apiPort: Number(getEnv("API_PORT") ?? 3000),
  get clerkJwksUrl() {
    return requireEnv("CLERK_JWKS_URL");
  },
  get clerkIssuer() {
    return requireEnv("CLERK_ISSUER");
  },
  get allowDevAuthBypass() {
    const fallback = process.env.NODE_ENV !== "production" ? "true" : "false";
    return (getEnv("ALLOW_DEV_AUTH_BYPASS") ?? fallback) === "true";
  },
  get adminSeedEmail() {
    return (getEnv("ADMIN_SEED_EMAIL") ?? "terradmin@gmail.com").toLowerCase();
  },
  get stripeSecretKey() {
    return getEnv("STRIPE_SECRET_KEY");
  },
  get stripeWebhookSecret() {
    return getEnv("STRIPE_WEBHOOK_SECRET");
  },
  get whatsappContactEnabled() {
    return (getEnv("WHATSAPP_CONTACT_ENABLED") ?? "false") === "true";
  },
  get isProduction() {
    return process.env.NODE_ENV === "production";
  },
  get corsAllowedOrigins(): string[] {
    const raw = getEnv("CORS_ALLOWED_ORIGINS") ?? "";
    return raw
      .split(",")
      .map((o) => o.trim())
      .filter((o) => o.length > 0);
  },
};

export function resolveCorsOrigin(origin: string): string | null {
  if (!origin) return null;
  if (env.corsAllowedOrigins.includes(origin)) return origin;
  if (!env.isProduction && LOCALHOST_PATTERN.test(origin)) return origin;
  return null;
}

export function corsAllowHeaders(): string[] {
  const headers = [...BASE_CORS_ALLOW_HEADERS];
  if (env.allowDevAuthBypass) {
    headers.push(...DEV_CORS_ALLOW_HEADERS);
  }
  return headers;
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd apps/backend-api && bun test src/config/env.test.ts`
Expected: PASS — todos los casos.

- [ ] **Step 6: Run typecheck**

Run: `cd apps/backend-api && bun run typecheck`
Expected: PASS sin errores.

- [ ] **Step 7: Commit**

```bash
git add apps/backend-api/src/types.ts apps/backend-api/src/config/env.ts apps/backend-api/src/config/env.test.ts
git commit -m "feat(backend-api): env config + helpers CORS por entorno (#157)"
```

---

### Task 2: Security headers middleware con tests

**Files:**
- Create: `apps/backend-api/src/middleware/security-headers.ts`
- Test: `apps/backend-api/src/middleware/security-headers.test.ts`

**Interfaces:**
- Consumes: `env.isProduction` de `../config/env`
- Produces: `securityHeaders: MiddlewareHandler` — export default o named, usado en Task 3 (`app.ts`).

- [ ] **Step 1: Escribir los tests que fallan en `src/middleware/security-headers.test.ts`**

Crear `apps/backend-api/src/middleware/security-headers.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it } from "bun:test";

import { createApp } from "../app";

describe("securityHeaders middleware", () => {
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    process.env.NODE_ENV = "development";
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  async function requestHeaders(path: string, init?: Record<string, string>): Promise<Headers> {
    const app = createApp();
    const res = await app.request(path, { method: "GET", headers: init ?? {} });
    return res.headers;
  }

  it("setea cabeceras base en todas las respuestas", async () => {
    const h = await requestHeaders("/");
    expect(h.get("content-security-policy")).toBe(
      "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
    );
    expect(h.get("x-content-type-options")).toBe("nosniff");
    expect(h.get("referrer-policy")).toBe("no-referrer");
    expect(h.get("permissions-policy")).toBe(
      "geolocation=(), microphone=(), camera=(), payment=(), usb=()",
    );
    expect(h.get("x-frame-options")).toBe("DENY");
    expect(h.get("cross-origin-resource-policy")).toBe("same-origin");
    expect(h.get("cross-origin-opener-policy")).toBe("same-origin");
  });

  it("NO setea HSTS en dev", async () => {
    const h = await requestHeaders("/");
    expect(h.get("strict-transport-security")).toBe(null);
  });

  it("NO setea HSTS en prod sin HTTPS", async () => {
    process.env.NODE_ENV = "production";
    const h = await requestHeaders("/");
    expect(h.get("strict-transport-security")).toBe(null);
  });

  it("setea HSTS en prod con x-forwarded-proto: https", async () => {
    process.env.NODE_ENV = "production";
    const h = await requestHeaders("/", { "x-forwarded-proto": "https" });
    expect(h.get("strict-transport-security")).toBe(
      "max-age=63072000; includeSubDomains",
    );
  });

  it("setea cabeceras en respuestas de error (404)", async () => {
    const app = createApp();
    const res = await app.request("/api/v1/no-existe", { method: "GET" });
    expect(res.status).toBe(404);
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(res.headers.get("content-security-policy")).toBe(
      "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
    );
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd apps/backend-api && bun test src/middleware/security-headers.test.ts`
Expected: FAIL — los headers no están presentes (middleware no creado ni wired en `app.ts` aún).

- [ ] **Step 3: Crear `src/middleware/security-headers.ts`**

Crear `apps/backend-api/src/middleware/security-headers.ts`:

```ts
import type { Context } from "hono";
import type { MiddlewareHandler } from "hono";

import { env } from "../config/env";

const SECURITY_HEADERS: Record<string, string> = {
  "Content-Security-Policy":
    "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "Permissions-Policy":
    "geolocation=(), microphone=(), camera=(), payment=(), usb=()",
  "X-Frame-Options": "DENY",
  "Cross-Origin-Resource-Policy": "same-origin",
  "Cross-Origin-Opener-Policy": "same-origin",
};

function isHttps(c: Context): boolean {
  const xfp = c.req.header("x-forwarded-proto")?.split(",")[0]?.trim();
  if (xfp === "https") return true;
  try {
    return new URL(c.req.url).protocol === "https:";
  } catch {
    return false;
  }
}

export const securityHeaders: MiddlewareHandler = async (c, next) => {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    c.header(key, value);
  }
  if (env.isProduction && isHttps(c)) {
    c.header("Strict-Transport-Security", "max-age=63072000; includeSubDomains");
  }
  await next();
};
```

- [ ] **Step 4: Wire `securityHeaders` en `src/app.ts` (temporal — Task 3 completará el wiring de CORS)**

En `apps/backend-api/src/app.ts`, añadir el import después de `import { cors } from "hono/cors";`:

```ts
import { securityHeaders } from "./middleware/security-headers";
```

Y añadir **antes** de `app.use("*", cors({` (línea 22):

```ts
  app.use("*", securityHeaders);
```

El bloque de middlewares queda:

```ts
  app.use("*", securityHeaders);
  app.use("*", cors({
    origin: "*",
    allowMethods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "x-dev-role", "x-dev-user-id", "stripe-signature"],
  }));
  app.use("*", requestIdMiddleware);
  app.use("/api/v1/*", rateLimitByIP(100));
```

(El CORS sigue con `origin: "*"` por ahora — se cambia en Task 3.)

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd apps/backend-api && bun test src/middleware/security-headers.test.ts`
Expected: PASS — todos los casos de cabeceras.

- [ ] **Step 6: Run typecheck**

Run: `cd apps/backend-api && bun run typecheck`
Expected: PASS.

- [ ] **Step 7: Run full test suite para verificar sin regresiones**

Run: `cd apps/backend-api && bun test`
Expected: PASS — todos los tests existentes + los nuevos. Los tests existentes no revisan headers, así que no se rompen.

- [ ] **Step 8: Commit**

```bash
git add apps/backend-api/src/middleware/security-headers.ts apps/backend-api/src/middleware/security-headers.test.ts apps/backend-api/src/app.ts
git commit -m "feat(backend-api): middleware de cabeceras de seguridad (#157)"
```

---

### Task 3: CORS por entorno + tests de integración

**Files:**
- Modify: `apps/backend-api/src/app.ts:22-26`
- Test: `apps/backend-api/src/middleware/cors.test.ts`

**Interfaces:**
- Consumes: `resolveCorsOrigin`, `corsAllowHeaders` de `../config/env` (Task 1), `securityHeaders` de `./security-headers` (Task 2).
- Produces: `app.ts` con CORS restringido por entorno.

- [ ] **Step 1: Escribir los tests que fallan en `src/middleware/cors.test.ts`**

Crear `apps/backend-api/src/middleware/cors.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it } from "bun:test";

import { createApp } from "../app";

describe("CORS por entorno", () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalCors = process.env.CORS_ALLOWED_ORIGINS;
  const originalDevBypass = process.env.ALLOW_DEV_AUTH_BYPASS;

  beforeEach(() => {
    process.env.NODE_ENV = "development";
    process.env.ALLOW_DEV_AUTH_BYPASS = "true";
    delete process.env.CORS_ALLOWED_ORIGINS;
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    process.env.CORS_ALLOWED_ORIGINS = originalCors;
    process.env.ALLOW_DEV_AUTH_BYPASS = originalDevBypass;
  });

  async function preflight(origin: string, extra?: Record<string, string>) {
    const app = createApp();
    const res = await app.request("/api/v1/health", {
      method: "OPTIONS",
      headers: {
        origin,
        "access-control-request-method": "GET",
        "access-control-request-headers": "content-type",
        ...extra,
      },
    });
    return res;
  }

  it("dev: preflight con localhost permitido refleja origin y devuelve 204", async () => {
    const res = await preflight("http://localhost:5173");
    expect(res.status).toBe(204);
    expect(res.headers.get("access-control-allow-origin")).toBe("http://localhost:5173");
    expect(res.headers.get("access-control-allow-methods")).toBeTruthy();
  });

  it("dev: allowHeaders incluye x-dev-user-id cuando ALLOW_DEV_AUTH_BYPASS=true", async () => {
    const res = await preflight("http://localhost:5173", {
      "access-control-request-headers": "x-dev-user-id",
    });
    const allowHeaders = res.headers.get("access-control-allow-headers") ?? "";
    expect(allowHeaders).toContain("x-dev-user-id");
  });

  it("dev: deniega origen no localhost y no listado (sin ACAO)", async () => {
    const res = await preflight("https://evil.com");
    expect(res.headers.get("access-control-allow-origin")).toBe(null);
  });

  it("prod: permite origen en CORS_ALLOWED_ORIGINS", async () => {
    process.env.NODE_ENV = "production";
    process.env.ALLOW_DEV_AUTH_BYPASS = "false";
    process.env.CORS_ALLOWED_ORIGINS = "https://terrashare.app";
    const res = await preflight("https://terrashare.app");
    expect(res.status).toBe(204);
    expect(res.headers.get("access-control-allow-origin")).toBe("https://terrashare.app");
  });

  it("prod: deniega localhost cuando no esta en allowlist", async () => {
    process.env.NODE_ENV = "production";
    process.env.ALLOW_DEV_AUTH_BYPASS = "false";
    process.env.CORS_ALLOWED_ORIGINS = "https://terrashare.app";
    const res = await preflight("http://localhost:5173");
    expect(res.headers.get("access-control-allow-origin")).toBe(null);
  });

  it("prod: NO incluye x-dev-user-id en allowHeaders", async () => {
    process.env.NODE_ENV = "production";
    process.env.ALLOW_DEV_AUTH_BYPASS = "false";
    process.env.CORS_ALLOWED_ORIGINS = "https://terrashare.app";
    const res = await preflight("https://terrashare.app", {
      "access-control-request-headers": "x-dev-user-id,content-type",
    });
    const allowHeaders = res.headers.get("access-control-allow-headers") ?? "";
    expect(allowHeaders).not.toContain("x-dev-user-id");
  });

  it("prod: fail-closed cuando CORS_ALLOWED_ORIGINS esta vacio", async () => {
    process.env.NODE_ENV = "production";
    process.env.ALLOW_DEV_AUTH_BYPASS = "false";
    delete process.env.CORS_ALLOWED_ORIGINS;
    const res = await preflight("https://terrashare.app");
    expect(res.headers.get("access-control-allow-origin")).toBe(null);
  });

  it("exposeHeaders incluye x-request-id y cabeceras de rate limit", async () => {
    const res = await preflight("http://localhost:5173");
    const expose = res.headers.get("access-control-expose-headers") ?? "";
    expect(expose).toContain("x-request-id");
    expect(expose).toContain("X-RateLimit-Limit");
    expect(expose).toContain("X-RateLimit-Remaining");
    expect(expose).toContain("X-RateLimit-Reset");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd apps/backend-api && bun test src/middleware/cors.test.ts`
Expected: FAIL — los tests de prod esperan denegación pero el CORS actual es `origin: "*"`. Los tests de `x-dev-user-id` en prod también fallan porque hoy se permite siempre.

- [ ] **Step 3: Reemplazar el wiring de CORS en `src/app.ts`**

En `apps/backend-api/src/app.ts`, actualizar el import de `./config/env` (añadir al import existente o crear uno nuevo). Añadir después de los imports existentes:

```ts
import { corsAllowHeaders, resolveCorsOrigin } from "./config/env";
```

Reemplazar el bloque de CORS (las líneas con `app.use("*", cors({ ... }))`):

```ts
  app.use("*", securityHeaders);
  app.use("*", cors({
    origin: resolveCorsOrigin,
    allowMethods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowHeaders: corsAllowHeaders(),
    exposeHeaders: [
      "x-request-id",
      "X-RateLimit-Limit",
      "X-RateLimit-Remaining",
      "X-RateLimit-Reset",
    ],
    allowCredentials: false,
    maxAge: 86400,
  }));
  app.use("*", requestIdMiddleware);
  app.use("/api/v1/*", rateLimitByIP(100));
```

- [ ] **Step 4: Run CORS tests to verify they pass**

Run: `cd apps/backend-api && bun test src/middleware/cors.test.ts`
Expected: PASS — todos los casos.

- [ ] **Step 5: Run full test suite para verificar sin regresiones**

Run: `cd apps/backend-api && bun test`
Expected: PASS — todos los tests. Los tests existentes usan `requestJson` que no envía header `Origin`, por lo que CORS no añade headers de respuesta pero no bloquea nada (CORS solo afecta respuestas cuando hay `Origin`; sin `Origin`, `resolveCorsOrigin("")` devuelve `null` y no se setea `Access-Control-Allow-Origin`, pero la request proceede normalmente). Los headers `x-dev-user-id` se siguen enviando como request headers y el servidor los lee independientemente de `allowHeaders` (que solo afecta preflight del navegador).

- [ ] **Step 6: Run typecheck**

Run: `cd apps/backend-api && bun run typecheck`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/backend-api/src/app.ts apps/backend-api/src/middleware/cors.test.ts
git commit -m "feat(backend-api): CORS estricto por entorno con allowlist (#157)"
```

---

### Task 4: .env.example + docs/SECURITY_FIXES.md + verificación final

**Files:**
- Modify: `apps/backend-api/.env.example`
- Modify: `docs/SECURITY_FIXES.md`

- [ ] **Step 1: Añadir `CORS_ALLOWED_ORIGINS` a `.env.example`**

En `apps/backend-api/.env.example`, añadir al final del archivo (después de `WHATSAPP_CONTACT_ENABLED=true`):

```
# CORS: orígenes permitidos separados por coma. En dev se permite localhost automáticamente.
# En produccion DEBE definirse (fail-closed si se deja vacio). Ej: https://terrashare.app,https://www.terrashare.app
CORS_ALLOWED_ORIGINS=http://localhost:5173
```

- [ ] **Step 2: Añadir entrada a `docs/SECURITY_FIXES.md`**

En `docs/SECURITY_FIXES.md`, añadir al final del archivo (después de la tabla de commits) una nueva sección:

```markdown

## Cabeceras de seguridad y CORS estricto (HU-39, #157)

Fecha: 2026-07-06

### Problema

- CORS con `origin: "*"` permitía cualquier origen en todos los entornos, incluyendo producción.
- No se enviaban cabeceras de seguridad estándar (HSTS, CSP, X-Content-Type-Options, etc.).
- Los headers `x-dev-role` y `x-dev-user-id` (mecanismos de bypass de auth) estaban en `allowHeaders` de CORS para todos los entornos.

### Cambios aplicados

### 1. `apps/backend-api/src/config/env.ts`

Nuevos getters y helpers:
- `env.isProduction`: detecta `NODE_ENV === "production"`.
- `env.corsAllowedOrigins`: parsea `CORS_ALLOWED_ORIGINS` (comma-separated).
- `resolveCorsOrigin(origin)`: refleja el origen si está en la allowlist (o es localhost en dev); `null` si se deniega. Fail-closed en prod sin la var.
- `corsAllowHeaders()`: headers base + `x-dev-*` solo cuando `env.allowDevAuthBypass`.

### 2. `apps/backend-api/src/middleware/security-headers.ts` (nuevo)

Middleware que setea en todas las respuestas:
- `Content-Security-Policy: default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: no-referrer`
- `Permissions-Policy: geolocation=(), microphone=(), camera=(), payment=(), usb=()`
- `X-Frame-Options: DENY`
- `Cross-Origin-Resource-Policy: same-origin`
- `Cross-Origin-Opener-Policy: same-origin`
- `Strict-Transport-Security: max-age=63072000; includeSubDomains` (solo en prod + HTTPS)

### 3. `apps/backend-api/src/app.ts`

- `securityHeaders` se registra antes de `cors` para que las cabeceras apliquen también a respuestas preflight 204.
- CORS pasa de `origin: "*"` a `origin: resolveCorsOrigin` (allowlist por entorno).
- `allowHeaders` pasa a `corsAllowHeaders()` (headers dev gated por `allowDevAuthBypass`).
- `exposeHeaders`: `x-request-id` + cabeceras de rate limit.
- `allowCredentials: false`, `maxAge: 86400`.

### Comportamiento esperado

| Entorno | Origen | Resultado |
|---------|--------|-----------|
| Dev | `http://localhost:*` | Permitido (auto) |
| Dev | otro dominio | Denegado |
| Prod | en `CORS_ALLOWED_ORIGINS` | Permitido |
| Prod | no en allowlist | Denegado |
| Prod | var vacía/ausente | Denegado (fail-closed) |

### Archivos modificados

- `apps/backend-api/src/types.ts` — añadido `CORS_ALLOWED_ORIGINS` a `Env`
- `apps/backend-api/src/config/env.ts` — getters + helpers CORS
- `apps/backend-api/src/middleware/security-headers.ts` — nuevo middleware
- `apps/backend-api/src/app.ts` — wiring de middlewares
- `apps/backend-api/.env.example` — documentación de la var
```

- [ ] **Step 3: Run full test suite + typecheck final**

Run: `cd apps/backend-api && bun test && bun run typecheck`
Expected: PASS — todos los tests + typecheck sin errores.

- [ ] **Step 4: Commit**

```bash
git add apps/backend-api/.env.example docs/SECURITY_FIXES.md
git commit -m "docs(backend-api): env example + registro de seguridad HU-39 (#157)"
```

---

## Verificación final (post-implementación)

- [ ] `cd apps/backend-api && bun run typecheck` en verde
- [ ] `cd apps/backend-api && bun test` en verde
- [ ] `git log --oneline` muestra 4 commits sobre `feature/backend-api/157-cors-security-headers`
- [ ] PR con `Closes #157`, template de `.github/PULL_REQUEST_TEMPLATE.md`, nota sobre por qué BD/Frontend/Contratos no aplican

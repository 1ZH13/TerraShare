# Setup y comandos de entorno

## 1. Requisitos
- Bun instalado
- MongoDB accesible (local o remoto)
- Variables de entorno por modulo

## 2. Variables base (referencia)
- MONGODB_URI
- JWT_SECRET
- PAYMENT_PROVIDER_KEY
- WHATSAPP_CONTACT_ENABLED=true

Cuenta admin inicial (solo local/dev):
- ADMIN_SEED_EMAIL=terradmin@gmail.com
- ADMIN_SEED_PASSWORD=123

Regla obligatoria:
- Cambiar credenciales antes de cualquier despliegue real.

## 3. Comandos raiz
```bash
bun install
bun run dev          # inicia web + backend-api en paralelo
bun run dev:web      # solo frontend (puerto 5173)
bun run dev:api       # solo backend (puerto 3000)
bun run build        # build por modulo
bun run test         # tests unitarios
bun run test:e2e     # tests e2e (playwright)
```

## 3.1 Playwright (tests E2E)
Carpeta tests/e2e:
- Convencion: `<pagina-o-feature>.<test-type>.spec.js`
- Browsers: chromium, firefox, webkit

Scripts:
- `bun run test:e2e` - headless
- `bun run test:e2e:headed` - con UI

(webapp) playwright.config.js incluye webServer automatico para levantarla.

## 4. Scripts por modulo
- web:
  - `bun run dev` (puerto 5173)
  - `bun run build`
  - `bun run test:e2e`
- backend-api:
  - `bun run dev` (puerto 3000)
  - `bun run test`
  - `bun run typecheck`
- landing (legacy):
  - `bun run dev`
  - `bun run build`

## 4.1 Variables de entorno por frontend
web (unificado):
- `VITE_API_BASE_URL=http://localhost:3000`
- `VITE_CLERK_PUBLISHABLE_KEY=pk_test_...`

backend-api:
- `CLERK_JWKS_URL=https://tu-proyecto.clerk.accounts.dev/.well-known/jwks.json`
- `CLERK_ISSUER=https://tu-proyecto.clerk.accounts.dev`
- `ALLOW_DEV_AUTH_BYPASS=true` (solo dev)
- `STRIPE_SECRET_KEY=sk_test_...`
- `STRIPE_WEBHOOK_SECRET=whsec_...`

Nota:
- El frontend consume `mockApi` local en modo dev (sin backend real).
- El contrato para backend esta en `docs/MODULE_INTEGRATION_CONTRACTS.md`.
- Setup detallado de Stripe en dev: `docs/STRIPE_DEV_SETUP.md`.

## 4.2 Autenticacion en desarrollo (#137)

El backend admite dos modos de autenticacion en dev, conmutables por entorno:

- **Dev-bypass** (`ALLOW_DEV_AUTH_BYPASS=true`, valor por defecto fuera de
  produccion): enviando las cabeceras `x-dev-user-id` y opcionalmente
  `x-dev-role: admin` se sintetiza un usuario sin pasar por Clerk. Util para
  probar rutas sin tokens. **Los usuarios dev viven en el store en memoria**, no
  se sincronizan a Mongo.
- **Token real de Clerk**: enviando `Authorization: Bearer <jwt>` con un token de
  sesion real, el backend lo valida contra el JWKS (`CLERK_JWKS_URL` /
  `CLERK_ISSUER`). Este camino **hace upsert del usuario en la coleccion `users`
  de Mongo** (aparece en el panel admin, D-4) y enriquece email/nombre via la
  Clerk Backend API cuando el token no los trae (requiere `CLERK_SECRET_KEY`, ver
  #132). El bypass sigue disponible aunque haya token real, segun la cabecera.

Para forzar solo tokens reales en un entorno (o en produccion), poner
`ALLOW_DEV_AUTH_BYPASS=false`.

**Rol admin (D-5):** el rol `admin` se asigna automaticamente al usuario cuyo
email coincide con `ADMIN_SEED_EMAIL`. Antes de produccion, revisar/rotar ese
valor y preferir asignar el rol via `public_metadata` de Clerk en vez del email
semilla.

## 5. Arranque sugerido en equipo
1. Clonar repo.
2. Configurar variables de entorno en cada modulo.
3. Ejecutar `bun install` en raiz.
4. Ejecutar `bun run dev` para levantar web + api.

## 6. CI esperado
- bun install
- lint
- test
- e2e (playwright)
- build por modulo

Workflows actuales implementados:
- `.github/workflows/landing-e2e.yml`
- `.github/workflows/app-web-e2e.yml`
- `.github/workflows/require-linked-issue.yml`

## 7. GitHub CLI para PRs (buenas practicas)
Objetivo:
- Evitar corrupcion de texto al editar descripciones de PR.
- Asegurar cierre automatico de issues al merge.

Reglas:
- Incluir keyword de cierre en el body del PR: `Closes #<id>`, `Fixes #<id>` o `Resolves #<id>`.
- Preferir `gh pr edit <numero> --body "..."` para cambios rapidos.
- Si usas `--body-file`, guardar siempre el archivo en UTF-8.

Comandos de referencia:
```bash
gh pr create --base main --head feature/<issue-id>-<slug> --title "feat: ..." --body "...\n\nCloses #<id>"
gh pr edit <numero> --body "...\n\nCloses #<id>"
```

PowerShell con UTF-8 explicito:
```powershell
$body = @"
## Resumen
- Cambio principal.

Closes #123
"@
$body | Out-File -FilePath pr_body_utf8.md -Encoding utf8
gh pr edit 123 --body-file pr_body_utf8.md
```

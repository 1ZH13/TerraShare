# Setup y comandos de entorno

## 1. Requisitos
- Bun instalado
- MongoDB accesible (local o remoto)
- Variables de entorno por modulo

## 2. Variables base (referencia)
- MONGODB_URI
- CLERK_JWKS_URL
- CLERK_ISSUER
- STRIPE_SECRET_KEY
- STRIPE_WEBHOOK_SECRET
- WHATSAPP_CONTACT_ENABLED=true
- ALLOW_DEV_AUTH_BYPASS=true|false (solo local/test)

## 3. Comandos raiz (propuestos)
```bash
bun install
bun run dev
bun run dev:landing
bun run dev:app
bun run dev:admin
bun run dev:api
bun run test
bun run lint
```

## 4. Scripts esperados por modulo
- landing:
	- `bun run dev`
	- `bun run build`
	- `bun run test:e2e`
- app-web:
	- `bun run dev`
	- `bun run build`
	- `bun run test:e2e`
- admin-dashboard:
	- `bun run dev`
	- `bun run build`
	- `bun run test:e2e`
- backend-api:
	- `bun run dev`
	- `bun run typecheck`
	- `bun run test`

## 4.1 Variables de entorno por frontend
Landing:
- `VITE_APP_WEB_URL=http://localhost:5174`

App web:
- `VITE_API_BASE_URL=http://localhost:3000`

Admin dashboard:
- `VITE_API_BASE_URL=` (opcional; vacio usa proxy local `/api`)
- `VITE_API_PROXY_TARGET=http://127.0.0.1:3000`

Nota:
- En estado actual, `app-web` consume `mockApi` local y no backend real.
- El contrato para backend esta en `docs/MODULE_INTEGRATION_CONTRACTS.md`.

Tip operativo (PowerShell):
- Para evitar errores de rutas anidadas, usar `Set-Location "c:/.../TerraShare/apps/<modulo>"`
	antes de correr comandos por modulo.

## 5. Arranque sugerido en equipo
1. Clonar repo con submodulos.
2. Configurar variables de entorno.
3. Levantar MongoDB.
4. Ejecutar bun install en raiz.
5. Ejecutar bun run dev para levantar todo el entorno.

## 6. CI esperado
- bun install
- lint
- test
- e2e (playwright)
- build por modulo

Workflows actuales implementados:
<<<<<<< Updated upstream
- `.github/workflows/landing-e2e.yml`
- `.github/workflows/app-web-e2e.yml`
- `.github/workflows/admin-dashboard-e2e.yml`
=======
- `.github/workflows/landing-e2e.yml` (smoke publico de `apps/web`)
- `.github/workflows/app-web-e2e.yml` (smoke de auth/protegido de `apps/web`)
- `.github/workflows/backend-api-ci.yml`
>>>>>>> Stashed changes
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

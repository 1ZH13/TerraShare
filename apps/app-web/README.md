# app-web

Aplicacion principal para propietarios y arrendatarios.

## Estado actual (issue #2)
- Catalogo funcional con filtros por tipo, ubicacion, precio y fecha.
- Flujo completo de solicitud de alquiler (arrendatario).
- Bandeja de propietario con acciones de aprobar/rechazar.
- Seguimiento de estado de solicitudes por arrendatario.
- Implementacion en modo mock para avanzar frontend sin bloquear backend.

## Alcance incluido
- Registro e inicio de sesion mockeado.
- Vista publica del catalogo (sin login).
- Login obligatorio para reservar y ver solicitudes propias.
- Reglas de negocio de aprobacion/rechazo con validacion de solapamiento.
- Mapa pospuesto para siguiente issue.

## Rutas actuales
- `/` catalogo de terrenos.
- `/lands/:landId` detalle de terreno.
- `/login` inicio de sesion.
- `/register` registro de cuenta (tenant).
- `/reserve/:landId` crear solicitud de alquiler.
- `/my-requests` seguimiento de solicitudes de arrendatario.
- `/owner/requests` bandeja de propietario para aprobar/rechazar.

## Cuentas semilla (modo mock)
- Arrendatario: `tenant@terrashare.test` / `123456`
- Propietario: `owner@terrashare.test` / `123456`

## Variables de entorno
Copiar `.env.example` a `.env`.

```bash
VITE_API_BASE_URL=http://localhost:3000
```

Nota:
- En esta fase el frontend usa `src/services/mockApi.js`.
- `VITE_API_BASE_URL` queda preparado para migracion a API real.

## Comandos
Desde esta carpeta:

```bash
bun install
bun run dev
bun run build
bun run preview
bun run test:e2e
bun run test:e2e:ui
```

Antes del primer E2E local:

```bash
bunx playwright install chromium
```

## Testing y CI
- E2E smoke: `tests/e2e/appweb.smoke.spec.js`
- Config Playwright: `playwright.config.js`
- Workflow CI: `.github/workflows/app-web-e2e.yml`

## Integracion con otros modulos
- Landing redirige a esta app por `VITE_APP_WEB_URL`.
- Contrato de integracion y DTOs esperados:
	`docs/MODULE_INTEGRATION_CONTRACTS.md`


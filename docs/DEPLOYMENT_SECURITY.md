# Seguridad y configuración de despliegue (#141)

Checklist y comportamiento por entorno del backend. Cubre los hallazgos
**G-1..G-3** de `docs/AUDITORIA_HALLAZGOS.md`.

## Verificación automática al arrancar

`src/config/security-check.ts` se ejecuta al iniciar el backend. En **producción**
(`NODE_ENV=production`):

- **Aborta el arranque (fatal)** si `ALLOW_DEV_AUTH_BYPASS` está activo — el bypass
  `x-dev-*` permitiría suplantar a cualquier usuario sin token.
- **Advierte** si `CORS_ALLOWED_ORIGINS` está vacío (ningún origen del navegador
  podría llamar a la API).
- **Advierte** si hay `STRIPE_SECRET_KEY` pero falta `STRIPE_WEBHOOK_SECRET`
  (los webhooks se rechazarían).

Fuera de producción no hay comprobaciones fatales (el entorno de dev usa valores
relajados a propósito).

## G-1 · CORS y bypass de autenticación

| Variable | Dev | Producción |
|----------|-----|------------|
| `CORS_ALLOWED_ORIGINS` (lista separada por comas) | Además, `localhost`/`127.0.0.1` se permiten automáticamente | **Solo** los orígenes de la allowlist; `localhost` NO se permite |
| `ALLOW_DEV_AUTH_BYPASS` | `true` por defecto (headers `x-dev-role`/`x-dev-user-id`) | `false` por defecto; forzar `true` aborta el arranque |

El origen se resuelve en `resolveCorsOrigin` (`config/env.ts`): nunca se usa `*`.
Los headers de bypass solo se aceptan cuando el bypass está activo.

## G-2 · Credenciales de admin

- La contraseña de admin de desarrollo **no se documenta** en el repo.
- El rol admin se asigna por `ADMIN_SEED_EMAIL` o por `public_metadata.role` en Clerk.
- Antes de producción: configurar `ADMIN_SEED_EMAIL` con una cuenta real y rotar
  cualquier contraseña de desarrollo.

## G-3 · Verificación de webhooks de Stripe

`POST /api/v1/payments/webhook` (`routes/payments.ts`):

- **Producción**: verificación **estricta** siempre. Sin firma válida y sin
  `STRIPE_WEBHOOK_SECRET` configurado, el evento se **rechaza** (`mustVerify = !isDev`).
- **Desarrollo**: solo se verifica si hay secreto configurado *y* llega firma; de
  lo contrario se acepta sin firma (cómodo para pruebas locales), registrando el
  motivo. Nunca hacer esto en producción.

## Variables de entorno relevantes

Ver `apps/backend-api/.env.example`. Antes de desplegar, confirmar:

- [ ] `NODE_ENV=production`
- [ ] `ALLOW_DEV_AUTH_BYPASS=false`
- [ ] `CORS_ALLOWED_ORIGINS` con el/los dominio(s) reales del frontend
- [ ] `STRIPE_WEBHOOK_SECRET` configurado (si se usan pagos)
- [ ] `ADMIN_SEED_EMAIL` apuntando a una cuenta controlada

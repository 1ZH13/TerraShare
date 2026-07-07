# TerraShare Backend API — Correcciones de Seguridad

Este documento registra las correcciones de seguridad implementadas en el backend
de TerraShare, incluyendo el problema resuelto, los cambios aplicados y el
comportamiento esperado.

---

## Gestión segura de secretos (HU-36, #154)

Fecha: 2026-07-06

### Problema

Las variables de entorno se leían con helpers `getEnv()`/`requireEnv()` sin validación
de esquema. Si faltaba una variable crítica, el error se descubría en tiempo de ejecución.

### Cambios aplicados

- `apps/backend-api/src/config/env.ts`: refactor a schema Zod validado al importar el módulo.
  Todas las variables requeridas se validan al startup; si falta alguna, el servidor no arranca.
- Variables requeridas: `MONGODB_URI`, `CLERK_JWKS_URL`, `CLERK_ISSUER`.
- Variables opcionales con default: `API_PORT` (3000), `ALLOW_DEV_AUTH_BYPASS` (true en dev),
  `ADMIN_SEED_EMAIL` (terradmin@gmail.com), `WHATSAPP_CONTACT_ENABLED` (false).
- Variables opcionales sin default: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
  `CLERK_SECRET_KEY`.

### Rotación de secretos

- Cada secreto debe rotarse cada 90 días como máximo.
- Procedimiento:
  1. Generar nuevo valor (p.ej. nueva API key de Stripe, nuevo webhook secret).
  2. Actualizar `.env.production` con el nuevo valor.
  3. Reiniciar el servicio para que recoja el nuevo valor.
  4. Verificar que el servicio funciona correctamente.
  5. Revocar/eliminar el valor anterior desde el panel del proveedor.
- La rotación de `CLERK_JWKS_URL` y `CLERK_ISSUER` no aplica (son URLs públicas).

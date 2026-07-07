# TerraShare Backend API — Correcciones de Seguridad

Este documento registra las correcciones de seguridad implementadas en el backend
de TerraShare, incluyendo el problema resuelto, los cambios aplicados y el
comportamiento esperado.

---

## Autenticación multifactor (MFA) (HU-37, #155)

Fecha: 2026-07-06

### Problema

No había segundo factor. Una cuenta admin comprometida daba acceso total al sistema.

### Cambios aplicados

- **Clerk Dashboard:** MFA (TOTP) habilitado para la aplicación. Usuarios configuran
  MFA desde su perfil en Clerk.
- `apps/backend-api/src/types.ts`: campo `mfaVerified` agregado a `AuthContextUser`.
- `apps/backend-api/src/lib/clerk-user.ts`: mapeo del claim JWT `mfa_verified`.
- `apps/backend-api/src/middleware/require-auth.ts`: verificación MFA integrada en
  `requireAdmin`; rechaza admins sin MFA habilitado, salvo en dev bypass.
- `apps/backend-api/src/lib/api-response.ts`: código de error `MFA_REQUIRED` agregado.

### Comportamiento esperado

| Escenario | Resultado |
|-----------|-----------|
| Admin con MFA (JWT real) | Acceso normal a rutas admin |
| Admin sin MFA (JWT real) | 403 `MFA_REQUIRED` |
| Admin sin MFA (dev bypass) | Acceso normal (sin JWT no se puede verificar MFA) |
| Usuario regular sin MFA | Acceso normal (no afecta) |

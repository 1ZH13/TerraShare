# TerraShare Backend API — Correcciones de Seguridad

Este documento registra las correcciones de seguridad implementadas en el backend
de TerraShare, incluyendo el problema resuelto, los cambios aplicados y el
comportamiento esperado.

---

## Recuperación de contraseña (HU-38, #156)

Fecha: 2026-07-06

### Problema

No había flujo documentado de recuperación de contraseña.

### Solución

Clerk maneja el flujo completo de recuperación de contraseña de forma nativa:

1. Usuario hace clic en "¿Olvidaste tu contraseña?" en el modal de login.
2. Clerk envía un email con token de un solo uso y expiración.
3. Usuario establece nueva contraseña.
4. Clerk revoca todas las sesiones activas del usuario automáticamente.

No se requirieron cambios de código. El flujo está disponible desde la UI de Clerk
integrada en la aplicación.

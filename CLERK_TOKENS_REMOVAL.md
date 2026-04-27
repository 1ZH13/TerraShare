# Clerk Tokens Removal - Roadmap

> **Estado:** Completado en frontend
> **Fecha:** 2026-04-26

## Resumen

Este documento detalla el roadmap para eliminar el uso de tokens JWT de Clerk del sistema, manteniendo solo Clerk para autenticación de login (información del usuario).

---

## ✅ Completado

### Fase 1: Admin Dashboard Fix
- [x] Remover `useClerkToken` de App.jsx (AdminDashboardPage)
- [x] Simplificar efecto sin dependencia de tokenReady
- [x] Remover imports de useClerkToken y setAdminTokenFn

### Fase 2: Simplificar API Services
- [x] **adminApi.js**: Eliminar `setTokenFn`, siempre usar dev bypass headers en DEV
- [x] **api.js**: Eliminar `setTokenFn`, siempre usar dev bypass headers en DEV

### Fase 3: Limpiar Páginas
- [x] **MyLandsPage.jsx**: Remover `setTokenFn`, usar `getMyLands()`
- [x] **PaymentsPage.jsx**: Remover `setTokenFn`, usar `getMyPayments()`
- [x] **ChatsPage.jsx**: Remover `setTokenFn`, usar `getChats()`
- [x] **LandDetailPage.jsx**: Remover `setTokenFn`, usar functions de api
- [x] **ReservePage.jsx**: Remover `useClerkToken` y `setTokenFn`
- [x] **AdminUsersPage.jsx**: Remover `useClerkToken` y `setTokenFn`
- [x] **AdminLandsPage.jsx**: Remover `useClerkToken` y `setTokenFn`

---

## Pendiente (Backlog)

### Backend - Simplificar Middleware (Opcional)
Cuando el frontend esté funcionando sin tokens, el backend aún espera los headers `x-dev-role` y `x-dev-user-id` en desarrollo. Esto ya funciona correctamente.

**Opcional:** Revisar si se quiere:
- [ ] Usar autenticación real en producción (requiere integración con Clerk JWT)
- [ ] Simplificar middleware require-auth.ts para producción real

### Hook useClerkToken
El archivo `apps/web/src/hooks/useClerkToken.js` ya no se usa en ninguna página. 

**Opcional:** 
- [ ] Eliminar archivo si no se necesita más
- [ ] Mantener para futuro uso potencial

---

## Arquitectura Final

### Desarrollo (DEV)
```
Frontend → headers x-dev-role/x-dev-user-id → Backend
```

### Produccion (PROD)
```
Frontend → (sin headers) → 401 Unauthorized
```

Si se necesita auth real en producción, se debe integrar con Clerk JWT verification.

---

## Archivos Modificados

| Archivo | Acción |
|---------|--------|
| `App.jsx` | Remover imports de token |
| `adminApi.js` | Simplificar headers |
| `api.js` | Simplificar headers |
| `useClerkToken.js` | No usado (pendiente eliminar) |
| `MyLandsPage.jsx` | Limpiar imports |
| `PaymentsPage.jsx` | Limpiar imports |
| `ChatsPage.jsx` | Limpiar imports |
| `LandDetailPage.jsx` | Limpiar imports |
| `ReservePage.jsx` | Limpiar imports |
| `AdminUsersPage.jsx` | Limpiar imports |
| `AdminLandsPage.jsx` | Limpiar imports |

---

## Notas

- Clerk SIGUE siendo usado para:
  - `useUser()` - obtener información del usuario (user.id, user.email, etc.)
  - `<ClerkProvider>` en main.jsx
  - Componentes de Login/Register

- Tokens de Clerk YA NO son necesarios para las llamadas API
# Estructura del repositorio

## 1. Objetivo
Organizar TerraShare por modulos para trabajo paralelo por tickets/issues.

## 2. Layout propuesto
- apps/landing: sitio publico
- apps/app-web: app principal (propietario/arrendatario)
- apps/admin-dashboard: panel admin
- apps/backend-api: API Bun + Hono
- packages/shared: tipos y utilidades compartidas
- docs/: PRD, arquitectura y flujo

## 3. Estrategia monorepo + submodulos
Se usara repositorio principal (orquestador) y submodulos Git opcionales para cada app.

Ventajas:
- Ownership claro por modulo.
- Permite versionado desacoplado por app.

Costos:
- Mayor complejidad en clonacion, CI y versionado.

Comando de clonacion recomendado:
```bash
git clone --recurse-submodules <repo-url>
```

Comando para inicializar submodulos en clones existentes:
```bash
git submodule update --init --recursive
```

## 4. Reglas de ownership
- module:landing -> equipo frontend/marketing
- module:app-web -> equipo frontend producto
- module:admin-dashboard -> equipo plataforma/admin
- module:backend-api -> equipo backend
- module:shared -> responsables de arquitectura

## 5. Convencion de tickets
Formato sugerido de titulo:
[modulo] accion + resultado

Ejemplos:
- [backend-api] crear endpoint de solicitudes de alquiler
- [app-web] implementar filtros por tipo y precio
- [admin-dashboard] moderacion de publicaciones

# MIGRATION.md

> Plan de migración y mejoras para TerraShare. Ejecutar en orden de prioridad.

---

## TAREA 1: MongoDB - Migración Completa

### Estado Actual
- Backend usa `in-memory-db.ts` (almacenamiento en memoria RAM)
- No hay persistencia - datos se pierden al reiniciar servidor
- 9 colecciones: users, lands, rentalRequests, contracts, payments, chats, chatMessages, auditEvents, leads

### Objetivo
- Migrar a MongoDB local: `mongodb://127.0.0.1:27017/terrashare`
- Datos persistentes entre reinicios
- Mantener API compatible con in-memory como fallback

### 1.1 Instalar dependencias

```bash
cd apps/backend-api
bun add mongodb mongoose
```

### 1.2 Actualizar `.env.local`

Agregar al final de `apps/backend-api/.env.local`:

```
MONGODB_URI=mongodb://127.0.0.1:27017/terrashare
```

### 1.3 Crear `apps/backend-api/src/config/database.ts`

```typescript
import { MongoClient, Db } from "mongodb";

let client: MongoClient | null = null;
let db: Db | null = null;

const DEFAULT_URI = "mongodb://127.0.0.1:27017";
const DEFAULT_DB = "terrashare";

export async function connectDatabase(): Promise<Db> {
  if (db) return db;

  const uri = process.env.MONGODB_URI || DEFAULT_URI;
  const dbName = process.env.MONGODB_URI?.split("/").pop() || DEFAULT_DB;

  try {
    client = new MongoClient(uri);
    await client.connect();
    db = client.db(dbName);
    console.log(`[database] Connected to MongoDB: ${dbName}`);
    return db;
  } catch (error) {
    console.error("[database] Connection failed:", error);
    throw error;
  }
}

export function getDatabase(): Db | null {
  return db;
}

export async function closeDatabase(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
    console.log("[database] Connection closed");
  }
}
```

### 1.4 Verificar que MongoDB esté corriendo

```bash
# En otra terminal
mongod
# O verificar estado
pgrep -x mongod
```

### 1.5 Prueba de conexión

```bash
cd apps/backend-api
bun run dev

# En otra terminal, probar endpoint
curl http://localhost:3000/api/v1/lands
```

---

## TAREA 2: Navbar LandDetailPage

### Estado Actual
- `LandDetailPage.jsx` ya usa `PublicHeader`
- Verificar que concuede con el diseño del catálogo

### Pasos de Verificación

1. Revisar que el navbar se vea igual que en CatalogPage
2. Si hay diferencias, ajustar en `styles.css`

---

## TAREA 3: Diseño Mejorado - LandDetailPage

### Análisis con SKILL.md (docs/SKILL.md)

El SKILL.md indica:
- **Evitar**: generic "AI slop", fonts genéricos, layouts predecibles
- **Enfoque**: Diseño intentional con dirección clara

### Propuesta: Estilo Natural/Orgánico

#### Características
- Colores tierra, verde hoja, tonos suaves
- Formas orgánicas, gradientes sutiles, texturas
- Tipografía distintiva
- Espaciado generoso

### Pasos de Implementación

1. Agregar estilos CSS en `styles.css`
2. Mejorar componentes JSX
3. Agregar animaciones

---

## Guía de Contribución al Repositorio Remoto

### 1. Configuración Inicial

```bash
# Clonar repo
git clone https://github.com/1ZH13/TerraShare.git
cd TerraShare

# Instalar dependencias
bun install

# Configurar variables de entorno
cp apps/web/.env.example apps/web/.env.local
cp apps/backend-api/.env.example apps/backend-api/.env.local
```

### 2. Flujo de Trabajo por Issue

1. **Crear issue** con alcance y criterios de aceptación
2. **Crear rama** desde main:
   ```bash
   git checkout -b feature/web/<issue-id>-<slug>
   ```
3. **Implementar** cambios átomicos
4. **Abrir PR** referenciando el issue:
   ```bash
   gh pr create --title "feat(web): ..." --body "..."
   # Body debe incluir: Closes #<id>
   ```
5. **Pasar CI** (checks automáticos)
6. **Recibir aprobación** (1 revisor mínimo)
7. **Squash merge** a main

### 3. Sincronizar con Main

```bash
# Actualizar main
git checkout main
git fetch origin
git pull origin main

# Traer cambios a tu rama
git checkout feature/<tu-rama>
git merge origin/main
```

### 4. Reglas de PR

- 1 revisor obligatorio
- Todos los checks en verde
- Body debe incluir keyword de cierre: `Closes #`, `Fixes #`, `Resolves #`
- Prohibido merge directo a main

### 5. Comandos Útiles

```bash
# Servidores
cd apps/web && bun run dev      # Puerto 5173
cd apps/backend-api && bun run dev  # Puerto 3000

# Testing
cd apps/web && bun run test:e2e

# Git
git status
git add .
git commit -m "feat: ..."
git push -u origin feature/<rama>
gh pr create
```

### 6. Estructura de Ramas

```
feature/web/<issue-id>-<slug>        # Frontend
feature/backend-api/<issue-id>-<slug>  # Backend
fix/<issue-id>-<slug>             # Fix
chore/<slug>                     # Chore
```

---

## Notas

- MongoDB requiere estar instalado y corriendo localmente
- El backend usa Bun como runtime
- Frontend usa Vite + React 18
- Autenticación via Clerk
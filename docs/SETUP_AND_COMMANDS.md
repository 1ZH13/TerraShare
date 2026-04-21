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
- landing: bun run dev
- app-web: bun run dev
- admin-dashboard: bun run dev
- backend-api: bun run dev

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

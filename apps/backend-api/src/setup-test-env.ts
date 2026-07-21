import { tmpdir } from "node:os";
import { join } from "node:path";

process.env.ALLOW_DEV_AUTH_BYPASS = "true";
// Marcador de posición: `test-preload` lo sustituye sin condiciones por la URI
// del servidor en memoria en cuanto arranca. Existe porque `config/env` valida
// la variable con zod al evaluarse, y basta con que un módulo importe `env`
// antes de ese momento para que toda la suite reviente. En local no se notaba:
// el `.env` de desarrollo ya traía la variable, así que solo fallaba en CI.
process.env.MONGODB_URI = process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017/terrashare-test";
process.env.CLERK_JWKS_URL = process.env.CLERK_JWKS_URL ?? "https://example.test/.well-known/jwks.json";
process.env.CLERK_ISSUER = process.env.CLERK_ISSUER ?? "https://example.test";
process.env.STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY ?? "sk_test_placeholder";
process.env.STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? "whsec_placeholder";
process.env.WHATSAPP_CONTACT_ENABLED = process.env.WHATSAPP_CONTACT_ENABLED ?? "false";
// Respaldos cifrados (#174): clave AES-256 fija y directorio temporal para tests.
process.env.BACKUP_ENCRYPTION_KEY =
  process.env.BACKUP_ENCRYPTION_KEY ??
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
process.env.BACKUP_DIR = process.env.BACKUP_DIR ?? join(tmpdir(), "terrashare-backups-test");
// Los tests nunca deben golpear la Clerk Backend API real: el enriquecimiento
// de usuario (#132) se prueba inyectando un cliente falso. Sin secret, el
// resolver degrada al mapeo puro de claims de forma determinista.
delete process.env.CLERK_SECRET_KEY;

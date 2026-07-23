import { clerkSetup } from "@clerk/testing/playwright";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Prepara Clerk para las pruebas con sesión.
 *
 * `clerkSetup` pide un *testing token* a la API de Clerk y lo deja en
 * `CLERK_TESTING_TOKEN`. Con él, `clerk.signIn()` entra sin pasar por el
 * formulario: usando una dirección `+clerk_test@example.com` la estrategia es
 * `email_code` con el código fijo de Clerk, así que **no hay ninguna contraseña
 * de por medio**, ni en el repositorio ni en el entorno.
 *
 * Si faltan las claves no se rompe nada: las pruebas que necesitan sesión se
 * saltan solas (ver `authenticated.spec.js`), y el resto de la suite corre
 * igual. Así el pipeline sigue verde en un fork o sin el secreto configurado.
 */

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "../../../..");

/** Lee una sola clave de un fichero .env, sin volcar el resto al entorno. */
const readKeyFromEnvFile = (file, key) => {
  if (!existsSync(file)) return undefined;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (match?.[1] === key) return match[2].trim().replace(/^["']|["']$/g, "");
  }
  return undefined;
};

export default async function globalSetup() {
  // En CI las claves llegan solo por el entorno; ahí no se husmea en ficheros
  // .env (no existen en el checkout, y depender de ellos enmascararía un
  // secreto mal configurado). En local sí: la publicable vive en el .env de la
  // web y la secreta en el del backend, que Playwright no carga por su cuenta.
  if (!process.env.CI) {
    if (!process.env.VITE_CLERK_PUBLISHABLE_KEY) {
      process.env.VITE_CLERK_PUBLISHABLE_KEY =
        readKeyFromEnvFile(resolve(REPO, "apps/web/.env"), "VITE_CLERK_PUBLISHABLE_KEY") ?? "";
    }
    if (!process.env.CLERK_SECRET_KEY) {
      process.env.CLERK_SECRET_KEY =
        readKeyFromEnvFile(resolve(REPO, "apps/backend-api/.env"), "CLERK_SECRET_KEY") ?? "";
    }
  }

  if (!process.env.VITE_CLERK_PUBLISHABLE_KEY || !process.env.CLERK_SECRET_KEY) {
    console.warn(
      "[clerk] Faltan VITE_CLERK_PUBLISHABLE_KEY o CLERK_SECRET_KEY: " +
        "se saltarán las pruebas que necesitan sesión.",
    );
    return;
  }

  await clerkSetup();
}

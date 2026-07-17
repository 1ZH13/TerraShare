// Sirve el build de producción del web (client-only) para el E2E, replicando lo
// que hace el Dockerfile: genera `dist/client/index.html` (shell SPA que enlaza
// los assets) y sirve `dist/client` estáticamente con fallback a index.html.
// Así el E2E prueba el mismo artefacto que se despliega (no `bun run dev`, que en
// dev hace SSR e incompatible con el client entry). Puerto 5173 (igual que dev).
import { readdirSync, existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const dir = "dist/client";
const assetsDir = join(dir, "assets");

if (!existsSync(assetsDir)) {
  console.error(`[serve-static] falta ${assetsDir}. Corre \`vite build\` antes.`);
  process.exit(1);
}

const files = readdirSync(assetsDir);
const css = files
  .filter((f) => f.endsWith(".css"))
  .map((f) => `<link rel="stylesheet" href="/assets/${f}">`)
  .join("");
const js = files
  .filter((f) => /^index-.*\.js$/.test(f))
  .map((f) => `<script type="module" src="/assets/${f}"></script>`)
  .join("");

const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>TerraShare</title>${css}</head><body><div id="root"></div>${js}</body></html>`;
writeFileSync(join(dir, "index.html"), html);

const port = Number(process.env.PORT ?? 5173);
Bun.serve({
  port,
  async fetch(req) {
    const url = new URL(req.url);
    const path = url.pathname === "/" ? "/index.html" : url.pathname;
    const file = Bun.file(join(dir, path));
    if (await file.exists()) return new Response(file);
    // Fallback SPA: cualquier ruta desconocida sirve index.html.
    return new Response(Bun.file(join(dir, "index.html")), {
      headers: { "content-type": "text/html" },
    });
  },
});
console.log(`[serve-static] sirviendo ${dir} en http://localhost:${port}`);

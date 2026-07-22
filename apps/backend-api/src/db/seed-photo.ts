/**
 * Fotos de los terrenos del seed de demostración (#356, #381).
 *
 * Antes esto pintaba un PNG procedural —cielo, horizonte y una mancha verde—
 * para no depender de imágenes externas. Cumplía su función (distinguir
 * «pantalla vacía por falta de datos» de «pantalla vacía por bug») pero no
 * parecía una foto, así que el catálogo seguía leyéndose como una maqueta.
 *
 * Ahora se sirven fotografías reales guardadas en `assets/lands/`. Están
 * COMMITEADAS en el repositorio: ni el seed ni las pruebas tocan la red. Se
 * descargaron una sola vez con `scripts/fetch-demo-photos.sh`, que documenta el
 * origen de cada una; la licencia y la autoría están en `assets/lands/CREDITS.md`.
 *
 * El nombre del archivo lleva el uso del terreno por delante (`ganaderia-2.jpg`)
 * porque el reparto NO es aleatorio: cada terreno recibe fotos del uso que
 * declara, para que un potrero no acabe ilustrado con un estanque.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const ASSETS_DIR = join(import.meta.dir, "..", "..", "assets", "lands");

/** Uso al que se recurre cuando el declarado no tiene fotos propias. */
const FALLBACK_USE = "mixto";

export interface LandPhotoFile {
  buffer: Buffer;
  filename: string;
  contentType: string;
}

/**
 * Índice `uso -> nombres de archivo`, construido una sola vez al primer uso.
 * Se lee el directorio en vez de mantener una lista a mano: así, añadir una
 * foto es dejar el archivo con el prefijo correcto y nada más.
 */
let index: Map<string, string[]> | null = null;

function getIndex(): Map<string, string[]> {
  if (index) return index;

  const byUse = new Map<string, string[]>();
  for (const file of readdirSync(ASSETS_DIR).sort()) {
    if (!file.endsWith(".jpg")) continue;
    const use = file.slice(0, file.lastIndexOf("-"));
    const list = byUse.get(use);
    if (list) list.push(file);
    else byUse.set(use, [file]);
  }

  if (byUse.size === 0) {
    throw new Error(
      `No hay fotos en ${ASSETS_DIR}. Ejecuta scripts/fetch-demo-photos.sh para descargarlas.`,
    );
  }
  index = byUse;
  return byUse;
}

/** Fotos disponibles para un uso, cayendo al respaldo si no tiene propias. */
function poolFor(use: string): string[] {
  const byUse = getIndex();
  const own = byUse.get(use);
  if (own?.length) return own;
  const fallback = byUse.get(FALLBACK_USE);
  if (fallback?.length) return fallback;
  // Sin respaldo tampoco: cualquier cosa antes que dejar el terreno sin foto.
  return [...byUse.values()][0];
}

/**
 * Devuelve la foto número `n` de un terreno.
 *
 * `n` recorre el conjunto del uso, así que un terreno con tres fotos recibe
 * tres distintas mientras el uso tenga suficientes. `offset` desplaza el punto
 * de partida por terreno para que dos fincas ganaderas seguidas no abran con
 * la misma imagen. Es determinista: la misma entrada da siempre la misma foto,
 * y dos corridas del seed producen el mismo catálogo.
 */
export function landPhoto(use: string, offset: number, n: number): LandPhotoFile {
  const pool = poolFor(use);
  const filename = pool[(offset + n) % pool.length];
  return {
    buffer: readFileSync(join(ASSETS_DIR, filename)),
    filename,
    contentType: "image/jpeg",
  };
}

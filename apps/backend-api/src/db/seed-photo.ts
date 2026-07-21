/**
 * Generador de fotos sintéticas para el seed de demostración (#356).
 *
 * Los terrenos sin foto dejan el catálogo lleno de marcadores de posición, que
 * es justo lo que hace difícil distinguir "pantalla vacía por falta de datos"
 * de "pantalla vacía por bug". En vez de depender de imágenes externas (que
 * añadirían red y una licencia que gestionar), pintamos un PNG procedural: un
 * paisaje plano de cielo + horizonte + parcela, con el tono derivado de una
 * semilla para que cada terreno se vea distinto y siempre igual entre corridas.
 */
import { deflateSync } from "node:zlib";

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeAndData = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData), 0);
  return Buffer.concat([length, typeAndData, crc]);
}

type Rgb = [number, number, number];

/** Codifica un PNG RGB de 8 bits sin entrelazar (filtro 0 en cada scanline). */
function encodePng(width: number, height: number, pixel: (x: number, y: number) => Rgb): Buffer {
  const stride = width * 3;
  const raw = Buffer.alloc(height * (stride + 1));
  for (let y = 0; y < height; y++) {
    const rowStart = y * (stride + 1);
    raw[rowStart] = 0; // filtro "None"
    for (let x = 0; x < width; x++) {
      const [r, g, b] = pixel(x, y);
      const i = rowStart + 1 + x * 3;
      raw[i] = r;
      raw[i + 1] = g;
      raw[i + 2] = b;
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // profundidad de bits
  ihdr[9] = 2; // color type: truecolor RGB
  ihdr[10] = 0; // compresión deflate
  ihdr[11] = 0; // filtro adaptativo
  ihdr[12] = 0; // sin entrelazado

  return Buffer.concat([
    PNG_SIGNATURE,
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", deflateSync(raw, { level: 9 })),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

function mix(a: Rgb, b: Rgb, t: number): Rgb {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

/** Ruido determinista en [0,1) a partir de coordenadas y semilla. */
function noise(x: number, y: number, seed: number): number {
  const n = Math.sin(x * 12.9898 + y * 78.233 + seed * 43.758) * 43758.5453;
  return n - Math.floor(n);
}

const WIDTH = 640;
const HEIGHT = 400;

/**
 * Devuelve un PNG de paisaje para un terreno. `seed` fija el tono (cielo y
 * verde de la parcela) y el relieve, así que el mismo terreno tiene siempre la
 * misma foto y dos terrenos distintos se distinguen a simple vista.
 */
export function makeLandPhoto(seed: number): Buffer {
  const skyTop: Rgb = [120 + ((seed * 7) % 40), 170 + ((seed * 11) % 30), 215];
  const skyBottom: Rgb = [214, 232, 238];
  const fieldNear: Rgb = [46 + ((seed * 13) % 30), 96 + ((seed * 17) % 45), 38];
  const fieldFar: Rgb = [126 + ((seed * 5) % 40), 158 + ((seed * 3) % 30), 82];
  const hills: Rgb = [72, 108, 76];

  const horizon = Math.round(HEIGHT * (0.42 + ((seed % 7) / 100)));
  // Perfil de colinas: dos senos desfasados por la semilla, sin aleatoriedad.
  const hillAt = (x: number) =>
    horizon
    - Math.round(18 * Math.sin((x / WIDTH) * Math.PI * 2 + seed))
    - Math.round(10 * Math.sin((x / WIDTH) * Math.PI * 5 + seed * 2));

  return encodePng(WIDTH, HEIGHT, (x, y) => {
    if (y < hillAt(x)) {
      return mix(skyTop, skyBottom, y / horizon);
    }
    if (y < horizon + 12) {
      return hills;
    }
    // Campo en perspectiva: más oscuro y más texturado según se acerca.
    const depth = (y - horizon) / (HEIGHT - horizon);
    const base = mix(fieldFar, fieldNear, depth);
    const grain = (noise(Math.floor(x / 3), Math.floor(y / 3), seed) - 0.5) * 26 * depth;
    return [
      Math.max(0, Math.min(255, Math.round(base[0] + grain))),
      Math.max(0, Math.min(255, Math.round(base[1] + grain))),
      Math.max(0, Math.min(255, Math.round(base[2] + grain))),
    ];
  });
}

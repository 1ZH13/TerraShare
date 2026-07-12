import { describe, expect, it } from "bun:test";

import { createApp } from "../app";
import { requestJson } from "../lib/http-test-utils";

// PNG 1x1 transparente válido.
const PNG_1X1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64",
);

const OWNER = { "x-dev-user-id": "photo_owner", "x-dev-role": "user" };
const OTHER = { "x-dev-user-id": "photo_intruder", "x-dev-role": "user" };

/** Crea un terreno en borrador propiedad del usuario `headers` y devuelve su id. */
async function createLand(headers: Record<string, string>): Promise<string> {
  const { response, payload } = await requestJson("/api/v1/lands", {
    method: "POST",
    headers,
    body: {
      title: "Finca con fotos",
      area: 2,
      allowedUses: ["agricultura"],
      location: { province: "Los Santos", district: "Guararé" },
      priceRule: { currency: "USD", pricePerMonth: 300 },
    },
  });
  expect(response.status).toBe(201);
  return payload.data.id;
}

/** Sube un archivo multipart a la ruta de fotos. */
async function uploadPhoto(
  landId: string,
  file: File,
  headers: Record<string, string>,
) {
  const fd = new FormData();
  fd.append("file", file);
  const app = createApp();
  const response = await app.request(`/api/v1/lands/${landId}/photos`, {
    method: "POST",
    headers, // FormData fija su propio content-type con boundary.
    body: fd,
  });
  const payload = response.headers.get("content-type")?.includes("application/json")
    ? await response.json()
    : null;
  return { response, payload };
}

function pngFile(name = "foto.png"): File {
  return new File([new Uint8Array(PNG_1X1)], name, { type: "image/png" });
}

describe("Fotos de terrenos — GridFS (#148)", () => {
  it("el dueño sube una foto, se sirve el binario y se puede borrar", async () => {
    const landId = await createLand(OWNER);

    const up = await uploadPhoto(landId, pngFile(), OWNER);
    expect(up.response.status).toBe(201);
    expect(up.payload.data.photos).toHaveLength(1);
    const url: string = up.payload.data.url;
    expect(url).toBe(up.payload.data.photos[0]);
    expect(url).toStartWith(`/api/v1/lands/${landId}/photos/`);

    // El terreno ahora expone la foto en su DTO.
    const detail = await requestJson(`/api/v1/lands/${landId}`);
    // status draft: el dueño lo creó en borrador, el GET público lo devuelve
    // salvo inactive; en borrador sigue accesible por id.
    expect(detail.payload.data.photos).toEqual([url]);

    // Servir el binario: 200 + content-type + bytes correctos.
    const app = createApp();
    const img = await app.request(url);
    expect(img.status).toBe(200);
    expect(img.headers.get("content-type")).toBe("image/png");
    const bytes = Buffer.from(await img.arrayBuffer());
    expect(bytes.length).toBe(PNG_1X1.length);
    expect(bytes.equals(PNG_1X1)).toBe(true);

    // Borrar (dueño): la referencia desaparece y el binario deja de servirse.
    const fileId = url.split("/").pop()!;
    const del = await requestJson(`/api/v1/lands/${landId}/photos/${fileId}`, {
      method: "DELETE",
      headers: OWNER,
    });
    expect(del.response.status).toBe(200);
    expect(del.payload.data.photos).toEqual([]);

    const gone = await app.request(url);
    expect(gone.status).toBe(404);
  });

  it("rechaza subir a un terreno ajeno (403)", async () => {
    const landId = await createLand(OWNER);
    const up = await uploadPhoto(landId, pngFile(), OTHER);
    expect(up.response.status).toBe(403);
  });

  it("rechaza tipos no permitidos (400)", async () => {
    const landId = await createLand(OWNER);
    const txt = new File([new Uint8Array([1, 2, 3])], "nota.txt", { type: "text/plain" });
    const up = await uploadPhoto(landId, txt, OWNER);
    expect(up.response.status).toBe(400);
  });

  it("404 al servir un fileId inexistente", async () => {
    const landId = await createLand(OWNER);
    const app = createApp();
    const res = await app.request(`/api/v1/lands/${landId}/photos/deadbeefdeadbeefdeadbeef`);
    expect(res.status).toBe(404);
  });
});

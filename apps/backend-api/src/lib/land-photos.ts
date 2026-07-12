/**
 * Almacenamiento de fotos de terrenos en MongoDB GridFS (HU-56 relacionada; #148).
 *
 * Guardamos los binarios en el bucket `landPhotos` de GridFS (no en el documento
 * Land, que solo referencia las URLs). Enfoque autocontenido: sin cuentas ni
 * SDKs externos, y 100% testeable en CI con `mongodb-memory-server`. Migrar a
 * S3/Cloudinary después es un cambio aislado a este módulo.
 */
import mongooseConn from "../db/mongoose";

const BUCKET_NAME = "landPhotos";

export const ALLOWED_CONTENT_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024; // 5 MB
export const MAX_PHOTOS_PER_LAND = 10;

function getBucket() {
  const db = mongooseConn.connection.db;
  if (!db) throw new Error("Database connection not available");
  return new mongooseConn.mongo.GridFSBucket(db, { bucketName: BUCKET_NAME });
}

function toObjectId(id: string): InstanceType<typeof mongooseConn.mongo.ObjectId> | null {
  try {
    return new mongooseConn.mongo.ObjectId(id);
  } catch {
    return null;
  }
}

/** Guarda un binario en GridFS y devuelve el id del archivo (hex). */
export async function storeLandPhoto(input: {
  landId: string;
  buffer: Buffer;
  contentType: string;
  filename: string;
}): Promise<string> {
  const bucket = getBucket();
  return new Promise<string>((resolve, reject) => {
    const stream = bucket.openUploadStream(input.filename, {
      // `contentType` está deprecado como opción del stream en el driver; lo
      // guardamos en metadata y lo leemos de ahí al servir.
      metadata: { landId: input.landId, contentType: input.contentType },
    });
    stream.on("error", reject);
    stream.on("finish", () => resolve(String(stream.id)));
    stream.end(input.buffer);
  });
}

/** Lee un binario de GridFS a memoria. `null` si no existe. */
export async function getLandPhoto(
  fileId: string,
): Promise<{ buffer: Buffer; contentType: string } | null> {
  const _id = toObjectId(fileId);
  if (!_id) return null;

  const bucket = getBucket();
  const files = await bucket.find({ _id }).toArray();
  if (files.length === 0) return null;
  const meta = files[0].metadata as { contentType?: string } | undefined;
  const contentType = meta?.contentType ?? "application/octet-stream";

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    bucket
      .openDownloadStream(_id)
      .on("data", (chunk: Buffer) => chunks.push(chunk))
      .on("error", reject)
      .on("end", () => resolve({ buffer: Buffer.concat(chunks), contentType }));
  });
}

/** Elimina un binario de GridFS. No lanza si ya no existe. */
export async function deleteLandPhoto(fileId: string): Promise<void> {
  const _id = toObjectId(fileId);
  if (!_id) return;
  const bucket = getBucket();
  try {
    await bucket.delete(_id);
  } catch {
    // El archivo pudo borrarse ya; la referencia se limpia igual en la ruta.
  }
}

/** URL relativa canónica con la que el front referencia una foto. */
export function photoUrl(landId: string, fileId: string): string {
  return `/api/v1/lands/${landId}/photos/${fileId}`;
}

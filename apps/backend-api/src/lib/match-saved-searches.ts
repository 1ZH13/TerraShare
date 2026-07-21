import { SavedSearch, Notification, User } from "../db/schemas";
import type { ILand, LandUse } from "../db/schemas";
import { sendEmail } from "./email";

function matchesFilters(land: ILand, filters: Record<string, unknown>): boolean {
  if (filters.province && land.location?.province !== filters.province) return false;
  if (filters.district && land.location?.district !== filters.district) return false;
  if (filters.use && land.allowedUses && !land.allowedUses.includes(filters.use as LandUse)) return false;
  if (typeof filters.priceMin === "number" && land.priceRule?.pricePerMonth != null) {
    if (land.priceRule.pricePerMonth < filters.priceMin) return false;
  }
  if (typeof filters.priceMax === "number" && land.priceRule?.pricePerMonth != null) {
    if (land.priceRule.pricePerMonth > filters.priceMax) return false;
  }
  return true;
}

/**
 * Avisa a los usuarios cuyas búsquedas guardadas coinciden con un terreno recién
 * publicado (HU-99 #325). Se invoca cuando el terreno pasa a `active` — no al
 * crearlo en `draft`, porque un borrador aún no es visible en el catálogo.
 *
 * Cada coincidencia se procesa de forma aislada: un fallo (p. ej. de correo) se
 * registra pero no interrumpe el aviso al resto de usuarios.
 */
export async function matchSavedSearches(newLand: ILand): Promise<void> {
  const searches = await SavedSearch.find().lean();

  for (const search of searches) {
    // No tiene sentido avisar al dueño sobre su propia publicación.
    if (search.userId === newLand.ownerId) continue;
    if (!matchesFilters(newLand, search.filters as Record<string, unknown>)) continue;

    try {
      await Notification.create({
        id: `ntf_${crypto.randomUUID()}`,
        userId: search.userId,
        type: "saved_search_match",
        title: "Nuevo terreno coincide con tu busqueda",
        body: `El terreno "${newLand.title}" coincide con tu busqueda guardada "${search.name}".`,
        read: false,
      });

      // El identificador de usuario es el `clerkUserId` (no existe campo `id`).
      const user = await User.findOne({ clerkUserId: search.userId }).lean();
      if (user?.email) {
        await sendEmail({
          to: user.email,
          subject: `Nuevo terreno: ${newLand.title}`,
          html: `<p>El terreno <strong>${newLand.title}</strong> coincide con tu busqueda guardada "<em>${search.name}</em>".</p>`,
        });
      }
    } catch (err) {
      console.error({
        level: "error",
        message: "Failed to notify saved search match",
        savedSearchId: search.id,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
}

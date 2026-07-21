import { SavedSearch, Notification, User } from "../db/schemas";
import type { ILand, LandUse } from "../db/schemas";
import { sendEmail } from "./email";

/**
 * ¿Un terreno recién publicado cumple los criterios de una búsqueda guardada?
 *
 * Debe cubrir **los mismos campos que el catálogo deja guardar** (#368). Si el
 * emparejador ignora un filtro que la interfaz permite fijar, el usuario recibe
 * alertas que incumplen los criterios que él mismo puso, que es peor que no
 * recibir ninguna.
 *
 * Exportada para poder probarla sin tocar la base ni el correo.
 */
export function matchesFilters(land: ILand, filters: Record<string, unknown>): boolean {
  if (filters.province && land.location?.province !== filters.province) return false;
  if (filters.district && land.location?.district !== filters.district) return false;
  if (filters.use && land.allowedUses && !land.allowedUses.includes(filters.use as LandUse)) return false;

  // Tipo de operación: «ambas» satisface tanto a quien busca alquiler como a
  // quien busca compra, igual que en el filtro del catálogo.
  if (filters.operation && filters.operation !== "todas") {
    if (land.operation !== filters.operation && land.operation !== "ambas") return false;
  }

  // Texto libre sobre título, descripción y ubicación, sin distinguir mayúsculas
  // ni acentos (quien guarda «boquete» espera que «Boquete» cuente).
  if (typeof filters.q === "string" && filters.q.trim()) {
    const haystack = normalize(
      [land.title, land.description, land.location?.province, land.location?.district]
        .filter(Boolean)
        .join(" "),
    );
    if (!haystack.includes(normalize(filters.q))) return false;
  }

  // El precio solo se compara contra terrenos que efectivamente se alquilan: uno
  // de solo venta lleva `pricePerMonth: 0` y colaría en cualquier tramo «hasta
  // $X» (mismo fallo que se corrigió en la interfaz en #365).
  const monthly = land.operation === "venta" ? null : land.priceRule?.pricePerMonth ?? null;
  if (typeof filters.priceMin === "number" && monthly != null) {
    if (monthly < filters.priceMin) return false;
  }
  if (typeof filters.priceMax === "number") {
    if (monthly == null || monthly > filters.priceMax) return false;
  }

  return true;
}

/** Minúsculas y sin diacríticos, para comparar texto escrito por personas. */
function normalize(value: string): string {
  return value.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
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
        title: "Nuevo terreno coincide con tu búsqueda",
        body: `El terreno "${newLand.title}" coincide con tu búsqueda guardada "${search.name}".`,
        read: false,
      });

      // El identificador de usuario es el `clerkUserId` (no existe campo `id`).
      const user = await User.findOne({ clerkUserId: search.userId }).lean();
      if (user?.email) {
        await sendEmail({
          to: user.email,
          subject: `Nuevo terreno: ${newLand.title}`,
          html: `<p>El terreno <strong>${newLand.title}</strong> coincide con tu búsqueda guardada «<em>${search.name}</em>».</p>`,
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

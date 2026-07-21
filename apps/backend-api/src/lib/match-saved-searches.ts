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

export async function matchSavedSearches(newLand: ILand): Promise<void> {
  const searches = await SavedSearch.find().lean();

  for (const search of searches) {
    if (!matchesFilters(newLand, search.filters as Record<string, unknown>)) continue;

    await Notification.create({
      id: crypto.randomUUID(),
      userId: search.userId,
      type: "saved_search_match",
      title: "Nuevo terreno coincide con tu busqueda",
      body: `El terreno "${newLand.title}" coincide con tu busqueda guardada "${search.name}".`,
      read: false,
    });

    const user = await User.findOne({ id: search.userId }).lean();
    if (user?.email) {
      await sendEmail({
        to: user.email,
        subject: `Nuevo terreno: ${newLand.title}`,
        html: `<p>El terreno <strong>${newLand.title}</strong> coincide con tu busqueda guardada "<em>${search.name}</em>".</p>`,
      });
    }
  }
}

import { SavedSearch, Land, User } from "../db/schemas";
import { sendEmail } from "../lib/email";

export function startSavedSearchAlerts() {
  // Correr cada hora
  const interval = 60 * 60 * 1000;
  
  setInterval(async () => {
    try {
      console.log("[CRON] Checking saved searches...");
      const searches = await SavedSearch.find({}).lean();
      
      for (const search of searches) {
        // Find new lands created after last alert
        const query: any = { status: "active" };
        if (search.lastAlertSentAt) {
          query.createdAt = { $gt: search.lastAlertSentAt };
        } else {
          query.createdAt = { $gt: search.createdAt }; // If no alert sent yet, check after creation
        }

        if (search.filters?.use) {
          query.allowedUses = search.filters.use;
        }
        if (search.filters?.province) {
          query["location.province"] = search.filters.province;
        }
        if (search.filters?.maxPrice) {
          query["priceRule.pricePerMonth"] = { $lte: search.filters.maxPrice };
        }

        const newLands = await Land.find(query).limit(5).lean();

        if (newLands.length > 0) {
          // get user email
          const user = await User.findOne({ id: search.userId }).lean();
          if (user && user.email) {
            await sendEmail({
              to: user.email,
              subject: `TerraShare: Nuevos terrenos para tu búsqueda "${search.name}"`,
              html: `<p>Hola, encontramos ${newLands.length} terrenos nuevos que encajan con tu búsqueda "${search.name}". Entra a TerraShare para verlos.</p>`
            });
            
            // update lastAlertSentAt
            await SavedSearch.updateOne(
              { id: search.id },
              { $set: { lastAlertSentAt: new Date() } }
            );
          }
        }
      }
    } catch (e) {
      console.error("[CRON] Error checking saved searches:", e);
    }
  }, interval);
}

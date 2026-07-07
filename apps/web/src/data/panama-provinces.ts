/**
 * Provincias de Panamá para selects de onboarding/filtros.
 * Los nombres coinciden EXACTAMENTE con los del seed del backend
 * (apps/backend-api/src/db/seed.ts) para que los filtros del catálogo casen.
 * Si el backend añade provincias/comarcas, sincronizar aquí.
 */
export const PANAMA_PROVINCES = [
  "Bocas del Toro",
  "Chiriquí",
  "Coclé",
  "Colón",
  "Darién",
  "Herrera",
  "Los Santos",
  "Panamá",
  "Veraguas",
] as const;

export type PanamaProvince = (typeof PANAMA_PROVINCES)[number];

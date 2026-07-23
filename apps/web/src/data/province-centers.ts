import { canonicalTerritory, type PanamaTerritory } from "@terrashare/shared";

/**
 * Centro aproximado de cada territorio, para situar en el mapa un terreno que
 * no trae coordenadas propias.
 *
 * Las claves son los nombres canónicos de `@terrashare/shared`. Antes esta
 * lista iba por su cuenta —con «Cocle» sin tilde, «Panama Oeste» sin tilde y
 * «Chiriqui»/«Chiriquí» duplicados— y solo funcionaba porque la búsqueda de
 * abajo quita los diacríticos. Seguía sin cubrir las comarcas con sus nombres
 * actuales, y cualquier nombre nuevo se olvidaba en silencio (#391).
 *
 * El tipo obliga a que estén TODOS: si mañana se añade un territorio a la lista
 * compartida y no se le pone centro aquí, no compila.
 */
export const PROVINCE_CENTERS: Record<PanamaTerritory, [number, number]> = {
  "Bocas del Toro": [9.1637, -82.0528],
  "Chiriquí": [8.4268, -82.4409],
  "Coclé": [8.4412, -80.3032],
  "Colón": [9.3106, -79.6527],
  "Darién": [7.9274, -77.4432],
  "Herrera": [7.9726, -80.6181],
  "Los Santos": [7.3824, -80.2691],
  "Panamá": [8.9824, -79.4849],
  "Panamá Oeste": [8.8817, -79.6834],
  "Veraguas": [7.6411, -81.0435],
  "Emberá-Wounaan": [8.0543, -77.7925],
  "Guna Yala": [9.0664, -77.4862],
  "Naso Tjër Di": [9.2500, -82.5500],
  "Ngäbe-Buglé": [8.1286, -81.6801],
};

interface LocationLike {
  lat?: number | null;
  lng?: number | null;
  province?: string | null;
}

export function getLandPosition(
  location: LocationLike | null | undefined,
): [number, number] | null {
  if (location?.lat && location?.lng) {
    return [location.lat, location.lng];
  }
  if (location?.province) {
    // `canonicalTerritory` ya tolera tildes, mayúsculas y espacios de sobra, así
    // que sigue situando los terrenos viejos guardados como «Cocle» o
    // «Panama Oeste». Se usa el mismo normalizador que valida el backend para
    // que mapa y validación no puedan discrepar.
    const territory = canonicalTerritory(location.province);
    return territory ? PROVINCE_CENTERS[territory] : null;
  }
  return null;
}

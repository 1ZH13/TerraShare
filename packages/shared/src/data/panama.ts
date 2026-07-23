/**
 * Divisiones territoriales de Panamá — la única fuente para toda la aplicación.
 *
 * Vive en el paquete compartido a propósito: antes había una lista en la web
 * para el onboarding y otra distinta para los centros del mapa, con nombres que
 * no coincidían entre sí ni con los del seed del backend. Con una sola lista,
 * el desplegable, la validación del servidor y el mapa no pueden desalinearse.
 *
 * Los nombres son los oficiales y con tilde, y coinciden EXACTAMENTE con los
 * que escribe el seed (`apps/backend-api/src/db/seed-demo.ts`), que es como
 * están guardados los terrenos existentes.
 */

/** Las 10 provincias, en orden alfabético. */
export const PANAMA_PROVINCES = [
  "Bocas del Toro",
  "Chiriquí",
  "Coclé",
  "Colón",
  "Darién",
  "Herrera",
  "Los Santos",
  "Panamá",
  "Panamá Oeste",
  "Veraguas",
] as const;

/**
 * Comarcas indígenas con rango provincial. Se listan aparte porque no son
 * provincias, pero hay terreno en ellas y deben poder elegirse.
 */
export const PANAMA_COMARCAS = [
  "Emberá-Wounaan",
  "Guna Yala",
  "Naso Tjër Di",
  "Ngäbe-Buglé",
] as const;

/** Todo lo que puede ir en el campo «provincia» de un terreno. */
export const PANAMA_TERRITORIES = [...PANAMA_PROVINCES, ...PANAMA_COMARCAS] as const;

export type PanamaProvince = (typeof PANAMA_PROVINCES)[number];
export type PanamaComarca = (typeof PANAMA_COMARCAS)[number];
export type PanamaTerritory = (typeof PANAMA_TERRITORIES)[number];

/**
 * Compara ignorando tildes, mayúsculas y espacios de sobra.
 *
 * El backend acepta así `Chiriqui` o `PANAMA OESTE` y los guarda con su forma
 * canónica, en vez de rechazarlos: quien escribe desde un teclado sin tildes no
 * debería quedarse sin publicar.
 */
const fold = (value: string): string =>
  value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toLowerCase();

/**
 * Devuelve el nombre canónico del territorio, o `undefined` si no existe.
 * Es la comprobación que usa el backend antes de guardar.
 */
export const canonicalTerritory = (value: string | null | undefined): PanamaTerritory | undefined => {
  if (typeof value !== "string" || !value.trim()) return undefined;
  const target = fold(value);
  return PANAMA_TERRITORIES.find((territory) => fold(territory) === target);
};

/**
 * Distritos de cada territorio, para el desplegable dependiente al publicar.
 *
 * Fuente: división político-administrativa del IGN «Tommy Guardia» (2024),
 * contrastada con Wikipedia. El país tiene ~82 distritos; la lista de las
 * comarcas es la parte que más cambia y donde el conteo oficial baila ±1, por
 * eso el formulario ofrece SIEMPRE una opción «Otro»: un desplegable puro con
 * un hueco dejaría sin publicar a quien viva justo ahí. El distrito, además, no
 * alimenta ningún filtro público (a diferencia de la provincia), así que un
 * valor fuera de lista no ensucia nada visible.
 *
 * El `Record<PanamaTerritory, …>` obliga a que estén los 14 territorios: si se
 * añade uno a la lista de arriba y se olvida aquí, no compila.
 */
export const PANAMA_DISTRICTS: Record<PanamaTerritory, readonly string[]> = {
  "Bocas del Toro": ["Almirante", "Bocas del Toro", "Changuinola", "Chiriquí Grande"],
  Chiriquí: [
    "Alanje", "Barú", "Boquerón", "Boquete", "Bugaba", "David", "Dolega", "Gualaca",
    "Remedios", "Renacimiento", "San Félix", "San Lorenzo", "Tierras Altas", "Tolé",
  ],
  Coclé: ["Aguadulce", "Antón", "La Pintada", "Natá", "Olá", "Penonomé"],
  Colón: ["Chagres", "Colón", "Donoso", "Omar Torrijos Herrera", "Portobelo", "Santa Isabel"],
  Darién: ["Chepigana", "Pinogana", "Santa Fe"],
  Herrera: ["Chitré", "Las Minas", "Los Pozos", "Ocú", "Parita", "Pesé", "Santa María"],
  "Los Santos": ["Guararé", "Las Tablas", "Los Santos", "Macaracas", "Pedasí", "Pocrí", "Tonosí"],
  Panamá: ["Balboa", "Chepo", "Chimán", "Panamá", "San Miguelito", "Taboga"],
  "Panamá Oeste": ["Arraiján", "Capira", "Chame", "La Chorrera", "San Carlos"],
  Veraguas: [
    "Atalaya", "Calobre", "Cañazas", "La Mesa", "Las Palmas", "Mariato", "Montijo",
    "Río de Jesús", "San Francisco", "Santa Fe", "Santiago", "Soná",
  ],
  "Emberá-Wounaan": ["Cémaco", "Sambú"],
  "Guna Yala": ["Guna Yala"],
  "Ngäbe-Buglé": [
    "Besikó", "Jirondai", "Kankintú", "Kusapín", "Mironó", "Müna", "Nole Duima",
    "Ñürüm", "Santa Catalina o Calovébora",
  ],
  "Naso Tjër Di": ["Naso Tjër Di"],
};

/** Distritos del territorio indicado, o lista vacía si no se reconoce. */
export const districtsOf = (province: string | null | undefined): readonly string[] => {
  const territory = canonicalTerritory(province);
  return territory ? PANAMA_DISTRICTS[territory] : [];
};

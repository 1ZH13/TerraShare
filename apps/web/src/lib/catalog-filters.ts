/**
 * Filtros del catálogo: forma común, ida y vuelta a la URL, y resumen legible
 * (HU-99 / #368).
 *
 * Vive aparte porque tres sitios necesitan hablar el mismo idioma: el catálogo
 * (que los aplica), el guardado de búsquedas (que los persiste) y la pantalla
 * de búsquedas guardadas (que los resume y los vuelve a aplicar). El backend
 * emparejador (`lib/match-saved-searches.ts`) lee estas mismas claves, así que
 * renombrar una aquí obliga a tocarlo también.
 */

/** Valor que representa «sin filtrar» en los desplegables. */
export const ANY_USE = "todos";
export const ANY_PROVINCE = "todas";
export const ANY_OPERATION = "todas";
/** Tope del desplegable de precio; por encima se considera «sin filtrar». */
export const NO_PRICE_LIMIT = 1_000_000;

export interface CatalogFilterState {
  q: string;
  use: string;
  province: string;
  operation: string;
  maxPrice: number;
}

export const EMPTY_FILTERS: CatalogFilterState = {
  q: "",
  use: ANY_USE,
  province: ANY_PROVINCE,
  operation: ANY_OPERATION,
  maxPrice: NO_PRICE_LIMIT,
};

const USE_LABELS: Record<string, string> = {
  agricultura: "Agricultura",
  ganaderia: "Ganadería",
  forestal: "Forestal",
  acuicultura: "Acuicultura",
  mixto: "Uso mixto",
  otro: "Otro",
};

const OPERATION_LABELS: Record<string, string> = {
  alquiler: "En alquiler",
  venta: "En venta",
};

/** ¿Hay algo que guardar? Una búsqueda sin criterios no merece una alerta. */
export function hasAnyFilter(f: CatalogFilterState): boolean {
  return (
    f.q.trim() !== ""
    || f.use !== ANY_USE
    || f.province !== ANY_PROVINCE
    || f.operation !== ANY_OPERATION
    || f.maxPrice < NO_PRICE_LIMIT
  );
}

/**
 * Filtros → objeto plano para guardar y para la URL. Solo se incluyen los
 * criterios activos: así el emparejador del backend no recibe claves con
 * valores centinela («todas») que tendría que aprender a ignorar.
 */
export function filtersToParams(f: CatalogFilterState): Record<string, string | number> {
  const params: Record<string, string | number> = {};
  if (f.q.trim()) params.q = f.q.trim();
  if (f.use !== ANY_USE) params.use = f.use;
  if (f.province !== ANY_PROVINCE) params.province = f.province;
  if (f.operation !== ANY_OPERATION) params.operation = f.operation;
  // Número, no texto: el emparejador del backend comprueba
  // `typeof filters.priceMax === "number"` y descartaría un "1500" en silencio,
  // así que las alertas nunca filtrarían por precio. Además, serializado como
  // texto el router lo mete entrecomillado en la URL (`priceMax=%221500%22`) y
  // al volver a leerlo `Number('"1500"')` es NaN.
  if (f.maxPrice < NO_PRICE_LIMIT) params.priceMax = f.maxPrice;
  return params;
}

/** Objeto plano (de la URL o de una búsqueda guardada) → filtros del catálogo. */
export function paramsToFilters(params: Record<string, unknown> | undefined): CatalogFilterState {
  if (!params) return { ...EMPTY_FILTERS };

  const str = (key: string): string | undefined => {
    const value = params[key];
    return typeof value === "string" && value.trim() ? value : undefined;
  };

  const rawMax = params.priceMax;
  const maxPrice = typeof rawMax === "number"
    ? rawMax
    : typeof rawMax === "string" && rawMax.trim() && Number.isFinite(Number(rawMax))
      ? Number(rawMax)
      : NO_PRICE_LIMIT;

  return {
    q: str("q") ?? "",
    use: str("use") ?? ANY_USE,
    province: str("province") ?? ANY_PROVINCE,
    operation: str("operation") ?? ANY_OPERATION,
    maxPrice,
  };
}

/** Resumen en una línea, para las tarjetas de búsquedas guardadas. */
export function describeFilters(params: Record<string, unknown> | undefined): string {
  const f = paramsToFilters(params);
  const parts: string[] = [];

  if (f.operation !== ANY_OPERATION) parts.push(OPERATION_LABELS[f.operation] ?? f.operation);
  if (f.use !== ANY_USE) parts.push(USE_LABELS[f.use] ?? f.use);
  if (f.province !== ANY_PROVINCE) parts.push(f.province);
  if (f.maxPrice < NO_PRICE_LIMIT) parts.push(`hasta $${f.maxPrice.toLocaleString("es-PA")}/mes`);
  if (f.q) parts.push(`«${f.q}»`);

  return parts.length > 0 ? parts.join(" · ") : "Cualquier terreno";
}

/** Nombre sugerido al guardar, para no obligar a inventarlo desde cero. */
export function suggestName(f: CatalogFilterState): string {
  const summary = describeFilters(filtersToParams(f));
  return summary === "Cualquier terreno" ? "Todos los terrenos" : summary;
}

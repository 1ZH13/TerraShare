/**
 * Formato del precio de un terreno según su operación (#365).
 *
 * Cada pantalla lo resolvía por su cuenta y todas cometían el mismo error:
 * comprobar `typeof pricePerMonth === "number"`, que es cierto para `0`. Un
 * terreno de solo venta no tiene renta mensual y su `pricePerMonth` vale 0, así
 * que el catálogo, la home, el comparador, el detalle y «Mis terrenos»
 * anunciaban «$0/mes» en vez del precio de venta.
 *
 * Al centralizarlo, además, el terreno de operación «ambas» pasa a mostrar sus
 * dos precios en lugar de solo la renta.
 */

/**
 * Forma mínima que necesita el formateo. Es estructural en vez de `LandDto`
 * porque `PanamaMap` trabaja con objetos sueltos (`Record<string, any>`) y no
 * merece un casteo solo para pedir el precio.
 */
export interface LandPriceInput {
  operation?: string | null;
  priceRule?: { pricePerMonth?: number | null } | null;
  salePrice?: number | null;
}

const money = (value: number): string => `$${value.toLocaleString("es-PA")}`;

/** Renta mensual, o `null` si el terreno no se alquila. */
export function monthlyPrice(land: LandPriceInput): number | null {
  if (land.operation === "venta") return null;
  const monthly = land.priceRule?.pricePerMonth;
  // El 0 se trata como «sin renta», no como gratis: es el valor que llevan los
  // terrenos que solo se venden.
  return typeof monthly === "number" && monthly > 0 ? monthly : null;
}

/** Precio de venta, o `null` si el terreno no está en venta. */
export function salePrice(land: LandPriceInput): number | null {
  if (land.operation !== "venta" && land.operation !== "ambas") return null;
  const sale = land.salePrice;
  return typeof sale === "number" && sale > 0 ? sale : null;
}

/**
 * Etiqueta completa: «$1,250/mes», «$145,000 en venta», los dos separados por
 * punto medio si el terreno admite ambas operaciones, o «Precio a convenir».
 */
export function formatLandPrice(land: LandPriceInput): string {
  const monthly = monthlyPrice(land);
  const sale = salePrice(land);

  const parts: string[] = [];
  if (monthly !== null) parts.push(`${money(monthly)}/mes`);
  if (sale !== null) parts.push(`${money(sale)} en venta`);

  return parts.length > 0 ? parts.join(" · ") : "Precio a convenir";
}

/**
 * Versión corta para tarjetas estrechas, donde no cabe la doble etiqueta:
 * prioriza la renta y cae al precio de venta.
 */
export function formatLandPriceShort(land: LandPriceInput): string {
  const monthly = monthlyPrice(land);
  if (monthly !== null) return `${money(monthly)}/mes`;

  const sale = salePrice(land);
  if (sale !== null) return `${money(sale)}`;

  return "A consultar";
}

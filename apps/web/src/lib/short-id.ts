/**
 * Etiqueta corta y legible para un identificador de entidad.
 *
 * Los ids del backend llevan prefijo de tipo (`contract_<uuid>`,
 * `rr_<uuid>`, `pay_<uuid>`), así que recortar los primeros caracteres a secas
 * devolvía el prefijo y nada más: **todos** los contratos se titulaban
 * «Contrato #contract» y eran indistinguibles entre sí.
 *
 * Se descarta el prefijo y se recorta lo que identifica de verdad.
 */
export function shortId(id: string | undefined | null, length = 8): string {
  if (!id) return "—";
  const separator = id.indexOf("_");
  const meaningful = separator >= 0 ? id.slice(separator + 1) : id;
  // Si tras quitar el prefijo no queda nada (un id que *es* solo el prefijo),
  // se devuelve el original antes que una cadena vacía.
  return (meaningful || id).slice(0, length);
}

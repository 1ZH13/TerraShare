/**
 * Búsqueda de texto que no distingue tildes.
 *
 * Buscar «Chiriqui» devolvía 0 resultados y «Chiriquí» devolvía 3: quien
 * escribe desde un teclado de móvil, sin tildes, veía la plataforma vacía
 * (#392).
 *
 * No se usa la *collation* de MongoDB porque no se aplica a `$regex`, y las
 * consultas del catálogo son de subcadena. Tampoco se guarda una copia
 * normalizada de cada campo, que obligaría a migrar los datos y a mantener dos
 * versiones sincronizadas. En su lugar se expande cada letra a su clase de
 * equivalencia, que funciona sobre los datos tal y como están hoy.
 */

/** Letras del español y sus variantes acentuadas. */
const EQUIVALENTS: Record<string, string> = {
  a: "aáàäâã",
  e: "eéèëê",
  i: "iíìïî",
  o: "oóòöôõ",
  u: "uúùüû",
  n: "nñ",
  c: "cç",
};

/** Neutraliza los caracteres con significado en una expresión regular. */
export const escapeRegex = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Patrón que empareja el término ignorando las tildes, en ambos sentidos:
 * «Cocle» encuentra «Coclé», y «Coclé» encuentra un dato guardado como «Cocle».
 *
 * Pensado para usarse con la marca `i`, que es la que resuelve las mayúsculas;
 * por eso las clases solo llevan minúsculas.
 */
export const accentInsensitivePattern = (term: string): string => {
  const withoutAccents = term.normalize("NFD").replace(/\p{Diacritic}/gu, "");
  return escapeRegex(withoutAccents).replace(/[aeiounc]/gi, (letter) => {
    const equivalents = EQUIVALENTS[letter.toLowerCase()];
    return equivalents ? `[${equivalents}]` : letter;
  });
};

/** Expresión completa, anclada o de subcadena, ya insensible a tildes. */
export const accentInsensitiveRegex = (term: string, { exact = false } = {}): RegExp => {
  const pattern = accentInsensitivePattern(term.trim());
  return new RegExp(exact ? `^${pattern}$` : pattern, "i");
};

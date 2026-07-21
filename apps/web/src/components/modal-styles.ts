import type { CSSProperties } from "react";

/**
 * Estilos compartidos por los modales con formulario (`VisitModal`,
 * `ReviewModal`) — #365.
 *
 * Ambos se escribieron con estilos en línea y sin fijar colores en los campos,
 * así que los `input` y `textarea` se quedaban con el aspecto por defecto del
 * navegador: cajas blancas dentro de un modal oscuro. Al declararlos con los
 * tokens del sistema, los campos siguen al tema igual que el resto.
 */

export const FIELD_STYLE: CSSProperties = {
  width: "100%",
  marginTop: "0.25rem",
  padding: "0.5rem",
  borderRadius: "8px",
  background: "var(--ts-bg)",
  color: "var(--ts-text)",
  border: "1px solid var(--ts-border)",
  fontFamily: "inherit",
  fontSize: "0.9rem",
};

export const BUTTON_STYLE: CSSProperties = {
  padding: "0.5rem 1rem",
  borderRadius: "8px",
  cursor: "pointer",
  background: "transparent",
  color: "var(--ts-text)",
  border: "1px solid var(--ts-border)",
  fontFamily: "inherit",
  fontSize: "0.9rem",
};

export const PRIMARY_BUTTON_STYLE: CSSProperties = {
  ...BUTTON_STYLE,
  background: "var(--ts-green)",
  color: "var(--ts-on-green)",
  border: "1px solid var(--ts-green)",
  fontWeight: 600,
  display: "inline-flex",
  alignItems: "center",
  gap: "0.4rem",
};

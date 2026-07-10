import type { ReportReason, ReportStatus, ReportTargetType } from "../services/adminApi";

export const REASON_LABELS: Record<ReportReason, string> = {
  spam: "Spam",
  fraude: "Fraude",
  contenido_inapropiado: "Contenido inapropiado",
  informacion_falsa: "Información falsa",
  otro: "Otro",
};

export const TARGET_LABELS: Record<ReportTargetType, string> = {
  land: "Terreno",
  user: "Usuario",
  chat: "Chat",
};

export const STATUS_LABELS: Record<ReportStatus, string> = {
  open: "Abierto",
  reviewing: "En revisión",
  resolved: "Resuelto",
  dismissed: "Descartado",
};

/** Tono del badge editorial (adm-badge--*) por estado del reporte. */
export const STATUS_BADGE: Record<ReportStatus, string> = {
  open: "adm-badge--red",
  reviewing: "adm-badge--amber",
  resolved: "adm-badge--green",
  dismissed: "adm-badge--teal",
};

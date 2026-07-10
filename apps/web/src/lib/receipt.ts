import type { ReceiptDto } from "@terrashare/shared";

/**
 * Recibo descargable (HU-43 #161). Renderiza el recibo como un documento HTML
 * autocontenido que el usuario puede guardar o imprimir a PDF desde el
 * navegador. Sin dependencias de generación de PDF en el servidor.
 */

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function money(amount: number, currency: string): string {
  return new Intl.NumberFormat("es-PA", { style: "currency", currency }).format(amount);
}

function formatDate(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString("es-PA", { day: "2-digit", month: "long", year: "numeric" });
}

const STATUS_LABEL: Record<string, string> = {
  paid: "Pagado",
  refunded: "Reembolsado",
  partially_refunded: "Reembolso parcial",
  pending: "Pendiente",
  processing: "Procesando",
  failed: "Fallido",
  cancelled: "Cancelado",
};

export function receiptToHtml(receipt: ReceiptDto): string {
  const refundsRows = receipt.refunds
    .map(
      (r) => `<tr>
        <td>${formatDate(r.createdAt)}</td>
        <td>${escapeHtml(r.reason ?? "Reembolso")}</td>
        <td style="text-align:right">-${money(r.amount, receipt.currency)}</td>
      </tr>`,
    )
    .join("");

  const net = receipt.amount - (receipt.refundedAmount ?? 0);

  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8" />
<title>Recibo ${escapeHtml(receipt.receiptNumber)}</title>
<style>
  body { font-family: Georgia, "Times New Roman", serif; color: #1e2b23; max-width: 720px; margin: 40px auto; padding: 0 24px; }
  .head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #2f5d43; padding-bottom: 16px; }
  .brand { font-size: 24px; font-weight: 700; color: #2f5d43; }
  .muted { color: #6b7c72; font-size: 13px; }
  h1 { font-size: 18px; margin: 24px 0 4px; }
  table { width: 100%; border-collapse: collapse; margin-top: 12px; }
  td, th { padding: 8px 4px; border-bottom: 1px solid #e2e8e2; font-size: 14px; text-align: left; }
  .totals td { border: none; }
  .totals .label { color: #6b7c72; }
  .grand { font-size: 18px; font-weight: 700; color: #2f5d43; }
  .status { display:inline-block; padding: 3px 10px; border-radius: 999px; background: #e7f0e9; color:#2f5d43; font-size:12px; }
  @media print { body { margin: 0; } .noprint { display: none; } }
</style></head>
<body>
  <div class="head">
    <div>
      <div class="brand">${escapeHtml(receipt.issuer.name)}</div>
      <div class="muted">Recibo de pago de alquiler</div>
    </div>
    <div style="text-align:right">
      <div><strong>${escapeHtml(receipt.receiptNumber)}</strong></div>
      <div class="muted">Emitido: ${formatDate(receipt.issuedAt)}</div>
      <div class="status">${STATUS_LABEL[receipt.status] ?? receipt.status}</div>
    </div>
  </div>

  <h1>Cliente</h1>
  <div class="muted">
    ${escapeHtml(receipt.customer.name ?? receipt.customer.id)}${receipt.customer.email ? ` · ${escapeHtml(receipt.customer.email)}` : ""}
  </div>

  <h1>Detalle</h1>
  <table>
    <tr><th>Concepto</th><th style="text-align:right">Importe</th></tr>
    <tr>
      <td>Alquiler${receipt.land?.title ? ` — ${escapeHtml(receipt.land.title)}` : ""}<br /><span class="muted">Solicitud ${escapeHtml(receipt.rentalRequestId)}</span></td>
      <td style="text-align:right">${money(receipt.amount, receipt.currency)}</td>
    </tr>
    ${refundsRows}
  </table>

  <table class="totals" style="margin-top:16px">
    <tr><td class="label">Pagado</td><td style="text-align:right">${money(receipt.amount, receipt.currency)}</td></tr>
    ${receipt.refundedAmount ? `<tr><td class="label">Reembolsado</td><td style="text-align:right">-${money(receipt.refundedAmount, receipt.currency)}</td></tr>` : ""}
    <tr><td class="grand">Neto</td><td class="grand" style="text-align:right">${money(net, receipt.currency)}</td></tr>
  </table>

  <p class="muted" style="margin-top:32px">Pago realizado el ${formatDate(receipt.paidAt)}. Este recibo se generó electrónicamente y es válido sin firma.</p>
</body></html>`;
}

/** Descarga el recibo como archivo HTML autocontenido. */
export function downloadReceipt(receipt: ReceiptDto): void {
  const html = receiptToHtml(receipt);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${receipt.receiptNumber}.html`;
  a.click();
  URL.revokeObjectURL(url);
}

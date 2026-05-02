import type { ReceiptData } from '../components/pos/ReceiptModal'

/**
 * Opens a minimal print window sized for 80 mm thermal paper and triggers
 * the browser print dialog. The window closes itself after the dialog
 * is dismissed.
 */
export function printReceipt(data: ReceiptData) {
  const win = window.open('', '_blank', 'width=340,height=700,scrollbars=yes')
  if (!win) {
    // Pop-up blocked — fall back to printing the current page is not ideal;
    // just alert the cashier.
    alert('Unable to open print window. Allow pop-ups for this site and try again.')
    return
  }

  const fmt = (amount: number) =>
    `${data.currencyCode} ${amount.toFixed(2)}`

  const subtotal = data.lines.reduce(
    (sum, line) => sum + line.unitPrice * line.quantity,
    0,
  )
  const discountTotal = data.lines.reduce((sum, line) => sum + line.discountAmount, 0)
  const grandTotal = Math.max(subtotal - discountTotal, 0)
  const change = Math.max(data.paymentAmount - grandTotal, 0)

  const lineRows = data.lines
    .map(
      (line) => {
        const lineTotal = line.unitPrice * line.quantity - line.discountAmount
        return `
        <tr>
          <td colspan="3">${escapeHtml(line.productName)}</td>
        </tr>
        <tr>
          <td>${line.quantity} x ${fmt(line.unitPrice)}</td>
          ${line.discountAmount > 0 ? `<td class="right">-${fmt(line.discountAmount)}</td>` : '<td></td>'}
          <td class="right bold">${fmt(lineTotal)}</td>
        </tr>`
      },
    )
    .join('')

  const refs = [
    `Order:    ${data.orderId}`,
    `Invoice:  ${data.invoiceId}`,
    data.shipmentId ? `Shipment: ${data.shipmentId}` : null,
    data.paymentId ? `Payment:  ${data.paymentId}` : null,
  ]
    .filter(Boolean)
    .map((ref) => `<div class="mono">${escapeHtml(ref as string)}</div>`)
    .join('')

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Receipt</title>
  <style>
    @page { size: 80mm auto; margin: 0; }
    * { box-sizing: border-box; }
    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: 11px;
      width: 80mm;
      margin: 0 auto;
      padding: 6px 8px;
      color: #000;
    }
    h1 { text-align: center; font-size: 14px; margin: 4px 0; }
    .center { text-align: center; }
    .right { text-align: right; }
    .bold { font-weight: bold; }
    .mono { font-family: 'Courier New', Courier, monospace; word-break: break-all; }
    hr { border: none; border-top: 1px dashed #000; margin: 5px 0; }
    table { width: 100%; border-collapse: collapse; }
    td { padding: 1px 2px; vertical-align: top; }
    .summary td { padding: 2px 2px; }
    .summary .label { color: #333; }
    .total-row td { font-weight: bold; font-size: 13px; padding-top: 4px; }
    .footer { text-align: center; margin-top: 10px; font-size: 10px; color: #555; }
  </style>
</head>
<body>
  <h1>Vexorion POS</h1>
  <div class="center">${escapeHtml(new Date(data.completedAt).toLocaleString())}</div>
  <div class="center">Customer: ${escapeHtml(data.customerLabel)}</div>
  ${data.isDelivery ? '<div class="center bold">*** DELIVERY ORDER ***</div>' : ''}
  <hr />
  <table>${lineRows}</table>
  <hr />
  <table class="summary">
    ${subtotal !== grandTotal ? `<tr><td class="label">Subtotal</td><td class="right">${fmt(subtotal)}</td></tr>` : ''}
    ${discountTotal > 0 ? `<tr><td class="label">Discount</td><td class="right">-${fmt(discountTotal)}</td></tr>` : ''}
    <tr class="total-row"><td>TOTAL</td><td class="right">${fmt(grandTotal)}</td></tr>
    <tr><td class="label">Paid (${escapeHtml(data.paymentMethod)})</td><td class="right">${fmt(data.paymentAmount)}</td></tr>
    ${change > 0 ? `<tr><td class="label">Change</td><td class="right">${fmt(change)}</td></tr>` : ''}
  </table>
  <hr />
  <div style="font-size:9px">${refs}</div>
  <div class="footer">Thank you for your purchase!<br />Please keep this receipt.</div>
</body>
</html>`

  win.document.write(html)
  win.document.close()
  win.focus()
  // Small delay to ensure DOM is ready before print dialog opens
  setTimeout(() => {
    win.print()
    win.close()
  }, 250)
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

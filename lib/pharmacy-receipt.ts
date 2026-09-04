export type SaleLine = {
  id: string
  saleNumber: string
  productId?: string
  productName: string
  productSku?: string | null
  batchId?: string
  batchNumber: string
  quantity: number
  unitPrice: number
  totalAmount: number
}

export type SaleReceipt = {
  saleGroup: string
  customerName: string
  customerPhone: string | null
  paymentMethod: string
  createdAt: string
  lines: SaleLine[]
  totalAmount: number
}

export const printMoney = (value: number) =>
  `Rs. ${value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`

export const escapeHtml = (value: string | number | null | undefined) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')

const PRINT_FONT = '"Times New Roman", Times, Georgia, serif'
const PHARMACY_LETTERHEAD = {
  name: 'Ayurcare',
  subheading: '',
  tagline: '',
  address: 'Jubilee Bazar, Onden Road, Kannur - 670001, Kerala, India',
  phones: 'Ph: 8111999581, 8111999582',
}

export function buildReceiptHtml(sale: SaleReceipt): string {
  const rows = sale.lines
    .map(
      (line) => `<tr>
        <td>${escapeHtml(line.productName)}</td>
        <td>${escapeHtml(line.batchNumber || '-')}</td>
        <td class="right">${escapeHtml(line.quantity)}</td>
        <td class="right">${escapeHtml(printMoney(line.unitPrice))}</td>
        <td class="right">${escapeHtml(printMoney(line.totalAmount))}</td>
      </tr>`
    )
    .join('')

  return `<!doctype html>
<html>
<head>
  <title>Pharmacy Sale ${escapeHtml(sale.saleGroup)}</title>
  <style>
    @page { size: A5 portrait; margin: 10mm; }
    * { box-sizing: border-box; }
    body { margin: 0; color: #111827; font-family: ${PRINT_FONT}; font-size: 12px; }
    .letterhead { border-bottom: 2px solid #111827; padding-bottom: 12px; text-align: center; }
    .letterhead h1 { font-size: 30px; font-weight: 700; letter-spacing: 0; margin: 0; }
    .letterhead .subheading { color: #404040; font-size: 14px; font-style: italic; margin: 2px 0 0; }
    .letterhead .tagline { color: #525252; font-size: 11px; margin: 2px 0 0; text-transform: uppercase; }
    .letterhead .details { color: #404040; font-size: 11px; line-height: 1.4; margin: 8px 0 0; }
    .title { display: flex; justify-content: space-between; margin: 12px 0; }
    .title h2 { font-size: 14px; margin: 0; text-transform: uppercase; }
    .box { border: 1px solid #d1d5db; display: grid; gap: 6px 18px; grid-template-columns: 1fr 1fr; padding: 10px; }
    .label { color: #6b7280; display: block; font-size: 10px; text-transform: uppercase; }
    table { border-collapse: collapse; margin-top: 14px; width: 100%; }
    th { border-bottom: 2px solid #111827; font-size: 10px; padding: 6px 5px; text-align: left; text-transform: uppercase; }
    td { border-bottom: 1px solid #e5e7eb; padding: 7px 5px; vertical-align: top; }
    .right { text-align: right; }
    .totals { margin-left: auto; margin-top: 12px; width: 230px; }
    .totals div { display: flex; justify-content: space-between; padding: 3px 0; }
    .grand { border-top: 2px solid #111827; font-size: 13px; font-weight: 700; margin-top: 4px; padding-top: 6px; }
  </style>
</head>
<body>
  <header class="letterhead">
    <h1>${escapeHtml(PHARMACY_LETTERHEAD.name)}</h1>
    <p class="subheading">${escapeHtml(PHARMACY_LETTERHEAD.subheading)}</p>
    <p class="tagline">${escapeHtml(PHARMACY_LETTERHEAD.tagline)}</p>
    <p class="details">${escapeHtml(PHARMACY_LETTERHEAD.address)}<br>${escapeHtml(PHARMACY_LETTERHEAD.phones)}</p>
  </header>
  <section class="title">
    <div>
      <h2>Pharmacy Sale</h2>
      <p><strong>${escapeHtml(sale.saleGroup)}</strong></p>
    </div>
    <div class="right">
      <p><span class="label">Date</span>${escapeHtml(new Date(sale.createdAt).toLocaleDateString('en-IN'))}</p>
      <p><span class="label">Payment</span>${escapeHtml(sale.paymentMethod)}</p>
    </div>
  </section>
  <section class="box">
    <div><span class="label">Customer</span>${escapeHtml(sale.customerName)}</div>
    <div><span class="label">Phone</span>${escapeHtml(sale.customerPhone || '-')}</div>
  </section>
  <table>
    <thead>
      <tr>
        <th>Product</th>
        <th>Batch</th>
        <th class="right">Qty</th>
        <th class="right">Rate</th>
        <th class="right">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>
  <section class="totals">
    <div class="grand"><span>Total</span><span>${escapeHtml(printMoney(sale.totalAmount))}</span></div>
  </section>
</body>
</html>`
}

export function printReceipt(sale: SaleReceipt) {
  const printFrame = document.createElement('iframe')
  printFrame.style.cssText =
    'position:fixed;left:0;top:0;width:0;height:0;border:0;opacity:0;pointer-events:none'
  document.body.appendChild(printFrame)

  const frameDoc = printFrame.contentDocument || printFrame.contentWindow?.document
  if (!frameDoc) {
    window.alert('Unable to create print preview. Please try again.')
    document.body.removeChild(printFrame)
    return
  }

  frameDoc.open()
  frameDoc.write(buildReceiptHtml(sale))
  frameDoc.close()

  let printed = false
  const doPrint = () => {
    if (printed) return
    printed = true
    printFrame.contentWindow?.focus()
    printFrame.contentWindow?.print()
    setTimeout(() => {
      if (printFrame.parentNode) {
        document.body.removeChild(printFrame)
      }
    }, 1000)
  }

  printFrame.onload = doPrint
  setTimeout(doPrint, 100)
}

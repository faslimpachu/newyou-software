'use client'

import { useRef, useState } from 'react'

type PrintOptions = {
  title: string
  center: string
  patientName?: string
  patientMR?: string
  age?: string
  gender?: string
  dob?: string
  bloodGroup?: string
  mobile?: string
  address?: string
  doctor?: string
  date?: string
  children?: string
  rows?: string[]
}

export function openA4Print(opts: PrintOptions) {
  const win = window.open('', '_blank', 'noopener,noreferrer')
  if (!win) return
  const nutrition = opts.center.toLowerCase().includes('nutrition')
  const clinic = nutrition ? 'NEW YOU' : 'Ayurcare Center'
  const subtitle = nutrition ? 'Lose Weight. Choose Health. | Centre for Professional Weight Management' : 'Jubilee Bazar'
  const address = 'Onden Road, Kannur - 670001, Kerala'
  const phone = 'PH: 8111999581 / 8111999582'
  const patient = opts.patientName
    ? `<div class="patient"><div><b>Patient:</b> ${opts.patientName}</div><div><b>MR No:</b> ${opts.patientMR || ''}</div><div><b>Age / Gender:</b> ${opts.age || ''} / ${opts.gender || ''}</div><div><b>DOB:</b> ${opts.dob || ''}</div><div><b>Blood:</b> ${opts.bloodGroup || ''}</div><div><b>Mobile:</b> ${opts.mobile || ''}</div><div><b>Address:</b> ${opts.address || ''}</div><div><b>Date:</b> ${opts.date || ''}</div><div><b>Doctor:</b> ${opts.doctor || ''}</div></div>`
    : ''
  const body = opts.children || ''
  const rowsHtml = (opts.rows || []).map((row) => `<tr>${row.split('|').map((cell) => `<td>${cell.trim()}</td>`).join('')}</tr>`).join('')
  win.document.write(`<!doctype html><html><head><title>${opts.title}</title><style>@page{size:A4 portrait;margin:14mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#17202a;font-size:12px}.header{border-bottom:2px solid #167b91;padding-bottom:12px;margin-bottom:16px}.clinic{font-size:26px;font-weight:700;color:#167b91}.tag{font-weight:600;margin:4px 0}.address{color:#4b5563;line-height:1.5}.title{font-size:16px;font-weight:700;text-transform:uppercase;margin:18px 0 10px}.patient{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;padding:10px;border:1px solid #b8c7cc;background:#f7fafb}.content{margin-top:18px;padding:0 4px}.table{width:100%;border-collapse:collapse;margin-top:10px}.table th,.table td{border:1px solid #b8c7cc;padding:8px;text-align:left;font-size:12px}.table th{background:#edf5f6}.actions{margin-top:10px}.signature{display:grid;grid-template-columns:1fr 1fr;gap:80px;margin-top:100px;text-align:center}.signature div{border-top:1px solid #17202a;padding-top:8px}@media print{body{margin:0}}</style></head><body><header class="header"><div class="clinic">${clinic}</div><div class="tag">${subtitle}</div><div class="address">${address}<br>${phone}</div></header><div class="title">${opts.title}</div>${patient}<section class="content">${body}${rowsHtml ? `<table class="table"><thead><tr><th>Item</th><th>Details</th><th>Notes</th></tr></thead><tbody>${rowsHtml}</tbody></table>` : ''}</section><div class="actions"><button onclick="window.print()">Print</button></div><div class="signature"><div>Doctor Signature</div><div>Dietitian Signature</div></div></body></html>`)
  win.document.close()
  win.focus()
  win.print()
}

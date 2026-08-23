import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    allowManualSale: process.env.ALLOW_MANUAL_SALE_ADJUSTMENT !== 'false',
  })
}

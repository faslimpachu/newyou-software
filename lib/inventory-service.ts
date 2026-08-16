import { prisma } from '@/lib/prisma'
import { ValidationError } from '@/lib/api-helpers'
import { Prisma } from '@prisma/client'

export type ReceiveStockParams = {
  productId: string
  quantity: number
  batchNumber: string
  supplierId: string
  purchaseInvoiceId: string
  expiryDate?: Date | null
  purchaseRate: number
  referenceType?: 'PURCHASE_INVOICE' | 'ADJUSTMENT' | 'RETURN'
  referenceId?: string | null
  notes?: string | null
}

export type AdjustStockParams = {
  productId: string
  type: Prisma.InventoryTransactionCreateInput['type']
  quantity: number
  batchId: string
  unitCost?: number
  supplierId?: string
  referenceType?: Prisma.InventoryTransactionCreateInput['referenceType']
  referenceId?: string | null
  notes?: string | null
}

export type ConsumeStockParams = {
  productId: string
  quantity: number
  referenceType?: Prisma.InventoryTransactionCreateInput['referenceType']
  referenceId?: string | null
  notes?: string | null
}

function toDecimal(value: unknown): Prisma.Decimal {
  return new Prisma.Decimal(Number(value || 0))
}

function getBatchStatus(expiryDate: Date | null): 'EXPIRED' | 'EXPIRING_SOON' | 'OK' | 'NO_EXPIRY' {
  if (!expiryDate) return 'NO_EXPIRY'
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  if (expiryDate < today) return 'EXPIRED'
  const thirtyDaysFromNow = new Date(today)
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)
  if (expiryDate < thirtyDaysFromNow) return 'EXPIRING_SOON'
  return 'OK'
}

export async function receiveStock(params: ReceiveStockParams, tx?: Prisma.TransactionClient): Promise<any> {
  const client = tx || prisma
  const {
    productId,
    quantity,
    batchNumber,
    supplierId,
    purchaseInvoiceId,
    expiryDate,
    purchaseRate,
    referenceType = 'PURCHASE_INVOICE',
    referenceId,
    notes,
  } = params

  const qty = toDecimal(quantity)
  const rate = toDecimal(purchaseRate)

  if (qty.lessThanOrEqualTo(0)) {
    throw new ValidationError('Quantity must be greater than zero')
  }
  if (rate.lessThanOrEqualTo(0)) {
    throw new ValidationError('Purchase rate must be greater than zero')
  }

  const product = await client.product.findUnique({
    where: { id: productId },
  })
  if (!product) {
    throw new ValidationError('Product not found')
  }

  const supplier = await client.supplier.findUnique({
    where: { id: supplierId },
  })
  if (!supplier) {
    throw new ValidationError('Supplier not found')
  }

  const existingBatch = await client.productBatch.findFirst({
    where: {
      productId,
      batchNumber: batchNumber.trim(),
    },
  })

  let batchId: string

  if (existingBatch) {
    if (existingBatch.expiryDate && expiryDate) {
      const existingExpiry = new Date(existingBatch.expiryDate)
      const newExpiry = new Date(expiryDate)
      existingExpiry.setHours(0, 0, 0, 0)
      newExpiry.setHours(0, 0, 0, 0)
      if (existingExpiry.getTime() !== newExpiry.getTime()) {
        throw new ValidationError(
          `Batch number ${batchNumber} already exists with a different expiry date`
        )
      }
    } else if (existingBatch.expiryDate && !expiryDate) {
      throw new ValidationError(
        `Batch number ${batchNumber} already exists with an expiry date`
      )
    } else if (!existingBatch.expiryDate && expiryDate) {
      throw new ValidationError(
        `Batch number ${batchNumber} exists without an expiry date`
      )
    }

    const updatedBatch = await client.productBatch.update({
      where: { id: existingBatch.id },
      data: {
        quantity: { increment: qty.toNumber() },
      },
    })
    batchId = updatedBatch.id
  } else {
    try {
      const newBatch = await client.productBatch.create({
        data: {
          productId,
          batchNumber: batchNumber.trim(),
          expiryDate: expiryDate || null,
          quantity: qty.toNumber(),
        },
      })
      batchId = newBatch.id
    } catch (e) {
      const code = (e as { code?: string }).code
      if (code === 'P2002' || code === 'P2034') {
        const retryBatch = await client.productBatch.findFirst({
          where: {
            productId,
            batchNumber: batchNumber.trim(),
          },
        })
        if (!retryBatch) {
          throw e
        }
        batchId = retryBatch.id
      } else {
        throw e
      }
    }
  }

  await client.batchReceipt.create({
    data: {
      batchId,
      supplierId,
      purchaseInvoiceId: purchaseInvoiceId || null,
      sourceType: 'PURCHASE',
      quantity: qty.toNumber(),
      remainingQuantity: qty.toNumber(),
      purchaseRate: rate.toNumber(),
    },
  })

  await client.product.update({
    where: { id: productId },
    data: {
      currentStock: { increment: qty.toNumber() },
      purchasePrice: rate.toNumber(),
    },
  })

  const transaction = await client.inventoryTransaction.create({
    data: {
      productId,
      batchId,
      type: 'PURCHASE',
      quantity: qty.toNumber(),
      referenceType: referenceType,
      referenceId: referenceId || null,
      notes: notes?.trim() || `Purchase invoice ${purchaseInvoiceId}`,
    },
  })

  return transaction
}

export async function adjustStock(params: AdjustStockParams, tx?: Prisma.TransactionClient): Promise<any> {
  const client = tx || prisma
  const {
    productId,
    type,
    quantity,
    batchId,
    unitCost,
    supplierId,
    referenceType = 'ADJUSTMENT',
    referenceId,
    notes,
  } = params

  const qty = toDecimal(quantity)
  const rate = unitCost !== undefined ? toDecimal(unitCost) : null

  if (qty.lessThanOrEqualTo(0)) {
    throw new ValidationError('Quantity must be greater than zero')
  }

  const decreaseTypes = ['SALE', 'ADJUSTMENT_OUT', 'RETURN_OUT', 'EXPIRED', 'DAMAGED', 'LOST']
  const isDecrease = decreaseTypes.includes(type)

  const product = await client.product.findUnique({
    where: { id: productId },
  })
  if (!product) {
    throw new ValidationError('Product not found')
  }

  const batch = await client.productBatch.findFirst({
    where: {
      id: batchId,
      productId,
    },
    include: {
      receipts: {
        where: {
          remainingQuantity: { gt: 0 },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  if (!batch) {
    throw new ValidationError('Batch not found for this product')
  }

  if (isDecrease) {
    const result = await client.productBatch.updateMany({
      where: {
        id: batchId,
        quantity: { gte: qty },
      },
      data: {
        quantity: { decrement: qty.toNumber() },
      },
    })

    if (result.count === 0) {
      throw new ValidationError('Insufficient stock in selected batch')
    }

    let remainingToConsume = qty
    for (const receipt of batch.receipts) {
      if (remainingToConsume.lessThanOrEqualTo(0)) break

      const receiptRemaining = toDecimal(receipt.remainingQuantity)
      const consumeFromReceipt = remainingToConsume.gt(receiptRemaining)
        ? receiptRemaining
        : remainingToConsume

      const receiptUpdate = await client.batchReceipt.updateMany({
        where: {
          id: receipt.id,
          remainingQuantity: { gte: consumeFromReceipt },
        },
        data: {
          remainingQuantity: { decrement: consumeFromReceipt.toNumber() },
        },
      })

      if (receiptUpdate.count === 0) {
        throw new ValidationError('Insufficient stock in receipt layer')
      }

      remainingToConsume = remainingToConsume.minus(consumeFromReceipt)
    }

    if (remainingToConsume.greaterThan(0)) {
      throw new ValidationError('Insufficient stock in receipt layer')
    }

    await client.product.update({
      where: { id: productId },
      data: {
        currentStock: { decrement: qty.toNumber() },
      },
    })
  } else {
    if (rate === null || rate.lessThanOrEqualTo(0)) {
      throw new ValidationError('Unit cost is required and must be greater than zero for increases')
    }

    const receiptSupplierId = supplierId || batch.receipts[0]?.supplierId
    if (!receiptSupplierId) {
      throw new ValidationError('Supplier ID is required for stock increases. Provide supplierId or ensure the batch has existing receipts.')
    }

    const supplier = await client.supplier.findUnique({
      where: { id: receiptSupplierId },
    })
    if (!supplier) {
      throw new ValidationError('Supplier not found for the provided supplierId')
    }

    await client.batchReceipt.create({
      data: {
        batchId,
        supplierId: receiptSupplierId,
        purchaseInvoiceId: referenceId || null,
        sourceType: 'ADJUSTMENT',
        quantity: qty.toNumber(),
        remainingQuantity: qty.toNumber(),
        purchaseRate: rate.toNumber(),
      },
    })

    await client.productBatch.update({
      where: { id: batchId },
      data: {
        quantity: { increment: qty.toNumber() },
      },
    })

    await client.product.update({
      where: { id: productId },
      data: {
        currentStock: { increment: qty.toNumber() },
      },
    })
  }

  const transaction = await client.inventoryTransaction.create({
    data: {
      productId,
      batchId,
      type: type as any,
      quantity: isDecrease ? qty.times(-1).toNumber() : qty.toNumber(),
      referenceType: referenceType,
      referenceId: referenceId || null,
      notes: notes?.trim() || null,
    },
  })

  return transaction
}

export async function consumeStock(params: ConsumeStockParams, tx?: Prisma.TransactionClient): Promise<any[]> {
  const client = tx || prisma
  const {
    productId,
    quantity,
    referenceType = 'SALE_INVOICE',
    referenceId,
    notes,
  } = params

  const qty = toDecimal(quantity)

  if (qty.lessThanOrEqualTo(0)) {
    throw new ValidationError('Quantity must be greater than zero')
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const product = await client.product.findUnique({
    where: { id: productId },
  })
  if (!product) {
    throw new ValidationError('Product not found')
  }

  const batches = await client.productBatch.findMany({
    where: {
      productId,
      quantity: { gt: 0 },
      OR: [
        { expiryDate: null },
        { expiryDate: { gte: today } },
      ],
    },
    include: {
      receipts: {
        where: {
          remainingQuantity: { gt: 0 },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
    orderBy: [
      { expiryDate: 'asc' },
      { createdAt: 'asc' },
    ],
  })

  if (batches.length === 0) {
    throw new ValidationError('No available stock')
  }

  const totalAvailable = batches.reduce(
    (sum, b) => sum + Number(b.quantity),
    0
  )
  if (new Prisma.Decimal(totalAvailable).lessThan(qty)) {
    throw new ValidationError('Insufficient stock')
  }

  const transactions: any[] = []
  let remainingToConsume = qty

  for (const batch of batches) {
    if (remainingToConsume.lessThanOrEqualTo(0)) break

    const batchQty = toDecimal(batch.quantity)
    const consumeFromBatch = remainingToConsume.gt(batchQty)
      ? batchQty
      : remainingToConsume

    const batchUpdate = await client.productBatch.updateMany({
      where: {
        id: batch.id,
        quantity: { gte: consumeFromBatch },
      },
      data: {
        quantity: { decrement: consumeFromBatch.toNumber() },
      },
    })

    if (batchUpdate.count === 0) {
      throw new ValidationError('Insufficient stock in batch')
    }

    let remainingInBatch = consumeFromBatch
    for (const receipt of batch.receipts) {
      if (remainingInBatch.lessThanOrEqualTo(0)) break

      const receiptRemaining = toDecimal(receipt.remainingQuantity)
      const consumeFromReceipt = remainingInBatch.gt(receiptRemaining)
        ? receiptRemaining
        : remainingInBatch

      const receiptUpdate = await client.batchReceipt.updateMany({
        where: {
          id: receipt.id,
          remainingQuantity: { gte: consumeFromReceipt },
        },
        data: {
          remainingQuantity: { decrement: consumeFromReceipt.toNumber() },
        },
      })

      if (receiptUpdate.count === 0) {
        throw new ValidationError('Insufficient stock in receipt layer')
      }

      remainingInBatch = remainingInBatch.minus(consumeFromReceipt)
    }

    if (remainingInBatch.greaterThan(0)) {
      throw new ValidationError('Insufficient stock in receipt layer')
    }

    const transaction = await client.inventoryTransaction.create({
      data: {
        productId,
        batchId: batch.id,
        type: 'SALE',
        quantity: consumeFromBatch.times(-1).toNumber(),
        referenceType,
        referenceId: referenceId || null,
        notes: notes?.trim() || null,
      },
    })

    transactions.push(transaction)
    remainingToConsume = remainingToConsume.minus(consumeFromBatch)
  }

  const totalConsumed = qty.minus(remainingToConsume)
  await client.product.update({
    where: { id: productId },
    data: {
      currentStock: { decrement: totalConsumed.toNumber() },
    },
  })

  return transactions
}

export async function getProductBatches(productId: string) {
  const batches = await prisma.productBatch.findMany({
    where: { productId },
    orderBy: { createdAt: 'asc' },
    include: {
      receipts: {
        where: {
          remainingQuantity: { gt: 0 },
        },
        orderBy: { createdAt: 'asc' },
        include: {
          supplier: {
            select: { id: true, supplierName: true },
          },
          purchaseInvoice: {
            select: { id: true, invoiceNumber: true },
          },
        },
      },
    },
  })

  return batches.map((batch) => {
    const totalRemaining = batch.receipts.reduce(
      (sum, r) => sum + Number(r.remainingQuantity),
      0
    )
    const avgCost =
      totalRemaining > 0
        ? batch.receipts.reduce(
            (sum, r) => sum + Number(r.remainingQuantity) * Number(r.purchaseRate),
            0
          ) / totalRemaining
        : 0

    return {
      id: batch.id,
      batchNumber: batch.batchNumber,
      expiryDate: batch.expiryDate,
      quantity: Number(batch.quantity),
      totalRemaining,
      avgCost: Math.round(avgCost * 100) / 100,
      status: getBatchStatus(batch.expiryDate),
      suppliers: [...new Set(batch.receipts.map((r) => r.supplier.supplierName))],
      receipts: batch.receipts.map((r) => ({
        id: r.id,
        supplierId: r.supplierId,
        supplierName: r.supplier.supplierName,
        purchaseInvoiceId: r.purchaseInvoiceId,
        invoiceNumber: r.purchaseInvoice?.invoiceNumber,
        quantity: Number(r.quantity),
        remainingQuantity: Number(r.remainingQuantity),
        purchaseRate: Number(r.purchaseRate),
        createdAt: r.createdAt,
      })),
    }
  })
}

export async function getInventoryValue(): Promise<number> {
  const receipts = await prisma.batchReceipt.findMany({
    where: {
      remainingQuantity: { gt: 0 },
    },
    select: {
      remainingQuantity: true,
      purchaseRate: true,
    },
  })

  const value = receipts.reduce(
    (sum, r) => sum + Number(r.remainingQuantity) * Number(r.purchaseRate),
    0
  )

  return Math.round(value * 100) / 100
}

export async function getExpiryStats() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const thirtyDaysFromNow = new Date(today)
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)

  const [expiredResult, expiringResult] = await Promise.all([
    prisma.batchReceipt.findMany({
      where: {
        remainingQuantity: { gt: 0 },
        batch: {
          expiryDate: { lt: today },
        },
      },
      include: {
        batch: true,
      },
    }),
    prisma.batchReceipt.findMany({
      where: {
        remainingQuantity: { gt: 0 },
        batch: {
          expiryDate: {
            gte: today,
            lt: thirtyDaysFromNow,
          },
        },
      },
      include: {
        batch: true,
      },
    }),
  ])

  const expiredValue = expiredResult.reduce(
    (sum, r) => sum + Number(r.remainingQuantity) * Number(r.purchaseRate),
    0
  )

  const expiringSoonCount = new Set(expiringResult.map((r) => r.batchId)).size
  const expiringValue = expiringResult.reduce(
    (sum, r) => sum + Number(r.remainingQuantity) * Number(r.purchaseRate),
    0
  )

  return {
    expiredStockValue: Math.round(expiredValue * 100) / 100,
    expiringSoonCount,
    expiringSoonValue: Math.round(expiringValue * 100) / 100,
  }
}

import { PrismaClient } from '@prisma/client'
import { Prisma } from '@prisma/client'

const prisma = new PrismaClient()

async function backfillBatches() {
  const products = await prisma.product.findMany({
    where: {
      currentStock: { gt: 0 },
    },
    include: {
      batches: true,
    },
  })

  console.log(`Found ${products.length} products with stock > 0`)

  for (const product of products) {
    if (product.batches.length > 0) {
      console.log(`Product ${product.name} (${product.id}) already has ${product.batches.length} batch(es), skipping`)
      continue
    }

    const defaultSupplier = await prisma.supplier.findFirst({
      where: { status: 'ACTIVE' },
    })

    if (!defaultSupplier) {
      console.log(`No active supplier found for product ${product.name}, skipping`)
      continue
    }

    const batch = await prisma.productBatch.create({
      data: {
        productId: product.id,
        batchNumber: 'OPENING',
        expiryDate: null,
        quantity: product.currentStock,
      },
    })

    await prisma.batchReceipt.create({
      data: {
        batchId: batch.id,
        supplierId: defaultSupplier.id,
        sourceType: 'OPENING',
        quantity: product.currentStock,
        remainingQuantity: product.currentStock,
        purchaseRate: product.purchasePrice,
      },
    })

    console.log(`Created OPENING batch for product ${product.name} with qty ${product.currentStock}`)
  }

  console.log('Backfill completed')
}

backfillBatches()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function reconcileStock() {
  console.log('Starting stock reconciliation (batches are the source of truth)...')

  const products = await prisma.product.findMany({
    select: { id: true, name: true, currentStock: true },
  })

  let productFixes = 0
  let batchFixes = 0

  for (const product of products) {
    const batches = await prisma.productBatch.findMany({
      where: { productId: product.id },
      select: { id: true, quantity: true },
    })

    // 1. Reconcile each batch.quantity to its receipt layers (deepest source of truth)
    for (const batch of batches) {
      const agg = await prisma.batchReceipt.aggregate({
        where: { batchId: batch.id },
        _sum: { remainingQuantity: true },
      })
      const receiptSum = Number(agg._sum.remainingQuantity || 0)
      const current = Number(batch.quantity)
      if (receiptSum !== current) {
        await prisma.productBatch.update({
          where: { id: batch.id },
          data: { quantity: receiptSum },
        })
        batchFixes++
        console.log(
          `  Batch ${batch.id} (product ${product.name}): quantity ${current} -> ${receiptSum}`,
        )
      }
    }

    // 2. Reconcile product.currentStock to the sum of its batch quantities
    const batchAgg = await prisma.productBatch.aggregate({
      where: { productId: product.id },
      _sum: { quantity: true },
    })
    const batchSum = Number(batchAgg._sum.quantity || 0)
    const currentStock = Number(product.currentStock)
    if (batchSum !== currentStock) {
      await prisma.product.update({
        where: { id: product.id },
        data: { currentStock: batchSum },
      })
      productFixes++
      console.log(
        `  Product ${product.name} (${product.id}): currentStock ${currentStock} -> ${batchSum}`,
      )
    }
  }

  console.log(
    `Reconciliation complete. Batches updated: ${batchFixes}, products updated: ${productFixes}`,
  )
}

reconcileStock()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

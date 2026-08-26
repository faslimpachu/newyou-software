import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const passwordHash = await bcrypt.hash('change-me-immediately', 10)

  await prisma.user.upsert({
    where: { username: 'superadmin' },
    update: { active: true },
    create: {
      username: 'superadmin',
      name: 'Super Admin',
      passwordHash,
      role: 'superadmin',
      active: true,
    },
  })

  await prisma.mRSequence.upsert({
    where: { id: 'GLOBAL' },
    update: {},
    create: { id: 'GLOBAL', lastNumber: 0 },
  })

  await prisma.visitSequence.upsert({
    where: { id: 'NUTRITION' },
    update: {},
    create: { id: 'NUTRITION', centerType: 'NUTRITION', lastNumber: 0 },
  })

  await prisma.visitSequence.upsert({
    where: { id: 'AYURCARE' },
    update: {},
    create: { id: 'AYURCARE', centerType: 'AYURCARE', lastNumber: 0 },
  })

  console.log('Seed completed')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

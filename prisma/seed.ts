import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.staff.createMany({
    data: [
      {
        name: 'Admin User',
        role: 'admin',
        email: 'admin@newyou.com',
        phone: '8111999581',
        centerType: 'both',
        active: true,
      },
      {
        name: 'Dr. Consulting Physician',
        role: 'doctor',
        email: 'doctor@newyou.com',
        phone: '8111999581',
        centerType: 'both',
        active: true,
      },
      {
        name: 'Dietitian Doe',
        role: 'dietitian',
        email: 'dietitian@newyou.com',
        phone: '8111999582',
        centerType: 'nutrition',
        active: true,
      },
      {
        name: 'Ayurcare Practitioner',
        role: 'doctor',
        email: 'practitioner@newyou.com',
        phone: '8111999582',
        centerType: 'ayurcare',
        active: true,
      },
    ],
  });

  await prisma.mRSequence.upsert({
    where: { id: 'GLOBAL' },
    update: {},
    create: { id: 'GLOBAL', lastNumber: 0 },
  });

  await prisma.visitSequence.upsert({
    where: { id: 'NUTRITION' },
    update: {},
    create: { id: 'NUTRITION', centerType: 'NUTRITION', lastNumber: 0 },
  });

  await prisma.visitSequence.upsert({
    where: { id: 'AYURCARE' },
    update: {},
    create: { id: 'AYURCARE', centerType: 'AYURCARE', lastNumber: 0 },
  });

  console.log('Seed completed');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

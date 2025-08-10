import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.tag.createMany({
    data: [
      {
        id: '4452656d-9fa4-4bd0-ba38-70492e31d180',
        name: 'EMERGENCY_FUND'
      },
      {
        id: 'f2e868af-8333-459f-b161-cbc6544c24bd',
        name: 'EXCLUDE_FROM_ANALYSIS'
      }
    ],
    skipDuplicates: true
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

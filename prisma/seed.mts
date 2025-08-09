import { PrismaClient } from '@prisma/client';

import {
  TAG_ID_EMERGENCY_FUND,
  TAG_ID_EXCLUDE_FROM_ANALYSIS
} from '../libs/common/src/lib/tag-ids.mjs';

const prisma = new PrismaClient();

async function main() {
  await prisma.tag.createMany({
    data: [
      {
        id: TAG_ID_EMERGENCY_FUND,
        name: 'EMERGENCY_FUND'
      },
      {
        id: TAG_ID_EXCLUDE_FROM_ANALYSIS,
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

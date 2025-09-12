import 'dotenv/config';
import { join } from 'node:path';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: join('prisma', 'schema.prisma'),
  migrations: {
    path: join('prisma', 'migrations'),
    seed: 'node prisma/seed.mts'
  }
});

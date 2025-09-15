import 'dotenv/config';
import { join } from 'node:path';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  migrations: {
    path: join('prisma', 'migrations'),
    seed: `node ${join('prisma', 'seed.mts')}`
  },
  schema: join('prisma', 'schema.prisma')
});

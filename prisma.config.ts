import { config } from 'dotenv';
import { expand } from 'dotenv-expand';
import { join } from 'node:path';
import { defineConfig } from 'prisma/config';

expand(config({ quiet: true }));

export default defineConfig({
  migrations: {
    path: join('prisma', 'migrations'),
    seed: `node ${join('prisma', 'seed.mts')}`
  },
  schema: join('prisma', 'schema.prisma')
});

import { defineConfig } from '@prisma/config';
import { config } from 'dotenv';
import { expand } from 'dotenv-expand';
import { join } from 'node:path';

expand(config({ quiet: true }));

export default defineConfig({
  migrations: {
    path: join(__dirname, '..', 'prisma', 'migrations'),
    seed: `node ${join(__dirname, '..', 'prisma', 'seed.mts')}`
  },
  schema: join(__dirname, '..', 'prisma', 'schema.prisma')
});

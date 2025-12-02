import { defineConfig, env } from '@prisma/config';
import { config } from 'dotenv';
import { expand } from 'dotenv-expand';
import { join } from 'node:path';

expand(config({ quiet: true }));

export default defineConfig({
  datasource: {
    url: env('DATABASE_URL')
  },
  migrations: {
    path: join(__dirname, '..', 'prisma', 'migrations'),
    seed: `node ${join(__dirname, '..', 'prisma', 'seed.mts')}`
  },
  schema: join(__dirname, '..', 'prisma', 'schema.prisma')
});

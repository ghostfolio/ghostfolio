import dotenv from 'dotenv';
import dotenvExpand from 'dotenv-expand';
import { join } from 'node:path';
import { defineConfig } from 'prisma/config';

const myEnv = dotenv.config();
dotenvExpand.expand(myEnv);

export default defineConfig({
  migrations: {
    path: join('prisma', 'migrations'),
    seed: `node ${join('prisma', 'seed.mts')}`
  },
  schema: join('prisma', 'schema.prisma')
});

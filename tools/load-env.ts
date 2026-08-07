import { config } from 'dotenv';
import { expand } from 'dotenv-expand';

expand(config({ path: process.env.GHOSTFOLIO_ENV_FILE, quiet: true }));

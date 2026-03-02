import { defineConfig } from 'evalite/config';

export default defineConfig({
  setupFiles: ['dotenv/config'],
  maxConcurrency: 3,
  testTimeout: 120_000,
  trialCount: 1,
  hideTable: true
});

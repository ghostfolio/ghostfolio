import { DEFAULT_HOST, DEFAULT_PORT } from '@ghostfolio/common/config';

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export const environment = {
  production: true,
  rootUrl: `http://${DEFAULT_HOST}:${DEFAULT_PORT}`,
  // Fallback is needed when app starts outside npm scripts (e.g. `node main`).
  version: process.env.npm_package_version ?? getPackageVersion() ?? 'dev'
};

function getPackageVersion() {
  try {
    const packageJson = JSON.parse(
      readFileSync(resolve(process.cwd(), 'package.json'), 'utf8')
    ) as { version?: string };

    return packageJson.version;
  } catch {
    return undefined;
  }
}

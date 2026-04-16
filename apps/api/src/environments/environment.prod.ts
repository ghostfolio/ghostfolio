import { DEFAULT_HOST, DEFAULT_PORT } from '@ghostfolio/common/config';

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const getVersion = () => {
  if (process.env.APP_VERSION) {
    return process.env.APP_VERSION;
  }

  if (process.env.npm_package_version) {
    return process.env.npm_package_version;
  }

  try {
    const packageJson = JSON.parse(
      readFileSync(join(process.cwd(), 'package.json'), 'utf8')
    );

    return packageJson.version ?? 'dev';
  } catch {
    return 'dev';
  }
};

export const environment = {
  production: true,
  rootUrl: `http://${DEFAULT_HOST}:${DEFAULT_PORT}`,
  version: getVersion()
};

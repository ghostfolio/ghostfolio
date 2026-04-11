import { DEFAULT_HOST, DEFAULT_PORT } from '@ghostfolio/common/config';

export const environment = {
  production: true,
  rootUrl: `http://${DEFAULT_HOST}:${DEFAULT_PORT}`,
  version: process.env.npm_package_version ?? 'dev'
};

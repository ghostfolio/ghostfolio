import { DEFAULT_HOST, DEFAULT_PORT } from '@ghostfolio/common/config';

export const environment = {
  production: true,
  rootUrl: `http://${DEFAULT_HOST}:${DEFAULT_PORT}`,
  version: `${require('../../../../package.json').version}`
};

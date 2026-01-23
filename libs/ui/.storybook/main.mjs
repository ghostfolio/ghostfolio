import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);

/** @type {import('@storybook/angular').StorybookConfig} */
const config = {
  addons: [getAbsolutePath('@storybook/addon-docs')],
  framework: {
    name: getAbsolutePath('@storybook/angular'),
    options: {}
  },
  staticDirs: [
    {
      from: '../../../apps/client/src/assets',
      to: '/assets'
    }
  ],
  stories: ['../**/*.stories.@(js|jsx|ts|tsx|mdx)']
};

export default config;

// To customize your webpack configuration you can use the webpackFinal field.
// Check https://storybook.js.org/docs/react/builders/webpack#extending-storybooks-webpack-config
// and https://nx.dev/packages/storybook/documents/custom-builder-configs

function getAbsolutePath(value) {
  return dirname(require.resolve(join(value, 'package.json')));
}

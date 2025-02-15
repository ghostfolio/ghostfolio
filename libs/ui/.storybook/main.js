/** @type {import('@storybook/angular').StorybookConfig} */
const config = {
  addons: ['@storybook/addon-essentials'],
  framework: {
    name: '@storybook/angular',
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

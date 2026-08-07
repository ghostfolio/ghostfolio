const { NxAppWebpackPlugin } = require('@nx/webpack/app-plugin');
const path = require('path');

// These options were migrated by @nx/webpack:convert-to-inferred from
// the project.json file and merged with the options in this file
const configValues = {
  build: {
    default: {
      compiler: 'tsc',
      deleteOutputPath: false,
      main: './src/main.ts',
      outputPath: 'dist/apps/api',
      outputHashing: 'none',
      sourceMap: true,
      target: 'node',
      tsConfig: './tsconfig.app.json'
    },
    production: {
      extractLicenses: true,
      fileReplacements: [
        {
          replace: path.resolve(__dirname, './src/environments/environment.ts'),
          with: path.resolve(
            __dirname,
            './src/environments/environment.prod.ts'
          )
        }
      ],
      generatePackageJson: true,
      inspect: false,
      optimization: true
    }
  }
};

// Determine the correct configValue to use based on the configuration
const configuration = process.env.NX_TASK_TARGET_CONFIGURATION || 'default';

const buildOptions = {
  ...configValues.build.default,
  ...configValues.build[configuration]
};

/**
 * @type {import('webpack').WebpackOptionsNormalized}
 */
module.exports = async () => ({
  plugins: [new NxAppWebpackPlugin(buildOptions)]
});

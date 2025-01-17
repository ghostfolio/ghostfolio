const { FlatCompat } = require('@eslint/eslintrc');
const js = require('@eslint/js');
const baseConfig = require('../../eslint.config.cjs');

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended
});

module.exports = [
  {
    ignores: ['**/dist']
  },
  ...baseConfig,
  ...compat.extends('plugin:cypress/recommended'),
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    // Override or add rules here
    rules: {},
    languageOptions: {
      parserOptions: {
        project: ['apps/ui-e2e/tsconfig.json']
      }
    }
  },
  {
    files: ['src/plugins/index.js'],
    rules: {
      '@typescript-eslint/no-var-requires': 'off',
      'no-undef': 'off'
    }
  }
];

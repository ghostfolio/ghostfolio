const baseConfig = require('../../eslint.config.cjs');

module.exports = [
  {
    ignores: ['**/dist']
  },
  ...baseConfig,
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    // Override or add rules here
    rules: {},
    languageOptions: {
      parserOptions: {
        project: ['libs/common/tsconfig.*?.json']
      }
    }
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    // Override or add rules here
    rules: {
      '@typescript-eslint/prefer-nullish-coalescing': 'error'
    }
  },
  {
    files: ['**/*.js', '**/*.jsx'],
    // Override or add rules here
    rules: {}
  }
];

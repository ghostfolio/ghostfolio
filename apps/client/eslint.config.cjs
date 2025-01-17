const baseConfig = require('../../eslint.config.cjs');
const angularEslintEslintPluginEslintPlugin = require('@angular-eslint/eslint-plugin-eslint-plugin');
const typescriptEslintEslintPlugin = require('@typescript-eslint/eslint-plugin');

module.exports = [
  {
    ignores: ['**/dist']
  },
  ...baseConfig,
  {
    plugins: {
      '@angular-eslint/eslint-plugin': angularEslintEslintPluginEslintPlugin,
      '@typescript-eslint': typescriptEslintEslintPlugin
    }
  },
  {
    rules: {
      '@angular-eslint/component-selector': [
        'error',
        {
          type: 'element',
          prefix: 'gf',
          style: 'kebab-case'
        }
      ],
      '@angular-eslint/directive-selector': [
        'error',
        {
          type: 'attribute',
          prefix: 'gf',
          style: 'camelCase'
        }
      ]
    }
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    // Override or add rules here
    rules: {},
    languageOptions: {
      parserOptions: {
        project: ['apps/client/tsconfig.*?.json']
      }
    }
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    // Override or add rules here
    rules: {}
  },
  {
    files: ['**/*.js', '**/*.jsx'],
    // Override or add rules here
    rules: {}
  },
  {
    files: ['**/*.ts'],
    rules: {
      '@angular-eslint/prefer-standalone': 'off'
    }
  }
];

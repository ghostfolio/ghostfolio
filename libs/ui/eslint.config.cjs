const baseConfig = require('../../eslint.config.cjs');
const angularEslintPlugin = require('@angular-eslint/eslint-plugin');
const typescriptEslintPlugin = require('@typescript-eslint/eslint-plugin');
const angularTemplateEslintPlugin = require('@angular-eslint/eslint-plugin-template');
const angularTemplateParser = require('@angular-eslint/template-parser');

module.exports = [
  {
    ignores: ['**/dist']
  },
  ...baseConfig,
  {
    plugins: {
      '@angular-eslint': angularEslintPlugin,
      '@typescript-eslint': typescriptEslintPlugin
    }
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    rules: {
      '@angular-eslint/directive-selector': [
        'error',
        {
          type: 'attribute',
          prefix: 'gf',
          style: 'camelCase'
        }
      ],
      '@angular-eslint/component-selector': [
        'error',
        {
          type: 'element',
          prefix: 'gf',
          style: 'kebab-case'
        }
      ],
      '@angular-eslint/prefer-inject': 'off',
      '@angular-eslint/prefer-standalone': 'off',
      '@typescript-eslint/prefer-nullish-coalescing': 'error'
    },
    languageOptions: {
      parserOptions: {
        project: ['libs/ui/tsconfig.*?.json']
      }
    }
  },
  {
    files: ['**/*.html'],
    plugins: {
      '@angular-eslint/template': angularTemplateEslintPlugin
    },
    languageOptions: {
      parser: angularTemplateParser
    }
  },
  {
    ignores: ['**/*.stories.ts']
  }
];

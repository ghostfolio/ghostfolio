const { FlatCompat } = require('@eslint/eslintrc');
const js = require('@eslint/js');
const nxEslintPlugin = require('@nx/eslint-plugin');

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended
});

module.exports = [
  {
    ignores: ['**/dist']
  },
  ...compat.extends('plugin:storybook/recommended'),
  { plugins: { '@nx': nxEslintPlugin } },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    rules: {
      '@nx/enforce-module-boundaries': [
        'warn',
        {
          enforceBuildableLibDependency: true,
          allow: [],
          depConstraints: [
            {
              sourceTag: '*',
              onlyDependOnLibsWithTags: ['*']
            }
          ]
        }
      ],
      '@typescript-eslint/no-extra-semi': 'error',
      'no-extra-semi': 'off'
    }
  },
  ...compat
    .config({
      extends: ['plugin:@nx/typescript']
    })
    .map((config) => ({
      ...config,
      files: ['**/*.ts', '**/*.tsx', '**/*.cts', '**/*.mts'],
      rules: {
        ...config.rules
      }
    })),
  ...compat
    .config({
      extends: ['plugin:@nx/javascript']
    })
    .map((config) => ({
      ...config,
      files: ['**/*.js', '**/*.jsx', '**/*.cjs', '**/*.mjs'],
      rules: {
        ...config.rules
      }
    })),
  ...compat
    .config({
      plugins: ['eslint-plugin-import', '@typescript-eslint'],
      extends: [
        'plugin:@typescript-eslint/recommended-type-checked',
        'plugin:@typescript-eslint/stylistic-type-checked'
      ]
    })
    .map((config) => ({
      ...config,
      files: ['**/*.ts'],
      rules: {
        ...config.rules,
        '@typescript-eslint/consistent-indexed-object-style': 'off',
        '@typescript-eslint/dot-notation': 'off',
        '@typescript-eslint/explicit-member-accessibility': [
          'off',
          {
            accessibility: 'explicit'
          }
        ],
        '@typescript-eslint/member-ordering': 'warn',
        '@typescript-eslint/naming-convention': [
          'off',
          {
            selector: 'default',
            format: ['camelCase'],
            leadingUnderscore: 'allow',
            trailingUnderscore: 'allow'
          },
          {
            selector: ['variable', 'classProperty', 'typeProperty'],
            format: ['camelCase', 'UPPER_CASE'],
            leadingUnderscore: 'allow',
            trailingUnderscore: 'allow'
          },
          {
            selector: 'objectLiteralProperty',
            format: null
          },
          {
            selector: 'enumMember',
            format: ['camelCase', 'UPPER_CASE', 'PascalCase']
          },
          {
            selector: 'typeLike',
            format: ['PascalCase']
          }
        ],
        '@typescript-eslint/no-empty-interface': 'warn',
        '@typescript-eslint/no-inferrable-types': [
          'warn',
          {
            ignoreParameters: true
          }
        ],
        '@typescript-eslint/no-non-null-assertion': 'warn',
        '@typescript-eslint/no-shadow': [
          'warn',
          {
            hoist: 'all'
          }
        ],
        '@typescript-eslint/unified-signatures': 'error',
        '@typescript-eslint/no-loss-of-precision': 'warn',
        '@typescript-eslint/no-var-requires': 'warn',
        'arrow-body-style': 'off',
        'constructor-super': 'error',
        eqeqeq: ['error', 'smart'],
        'guard-for-in': 'warn',
        'id-blacklist': 'off',
        'id-match': 'off',
        'import/no-deprecated': 'warn',
        'no-bitwise': 'error',
        'no-caller': 'error',
        'no-debugger': 'error',
        'no-empty': 'off',
        'no-eval': 'error',
        'no-fallthrough': 'error',
        'no-new-wrappers': 'error',
        'no-restricted-imports': ['error', 'rxjs/Rx'],
        'no-undef-init': 'error',
        'no-underscore-dangle': 'off',
        'no-var': 'error',
        radix: 'error',
        'no-unsafe-optional-chaining': 'warn',
        'no-extra-boolean-cast': 'warn',
        'no-empty-pattern': 'warn',
        'no-useless-catch': 'warn',
        'no-unsafe-finally': 'warn',
        'no-prototype-builtins': 'warn',
        'no-async-promise-executor': 'warn',
        'no-constant-condition': 'warn',

        // The following rules are part of eslint:recommended
        // and can be remove once solved
        'no-constant-binary-expression': 'warn',
        'no-loss-of-precision': 'warn',

        // The following rules are part of @typescript-eslint/recommended-type-checked
        // and can be remove once solved
        '@typescript-eslint/await-thenable': 'warn',
        '@typescript-eslint/ban-ts-comment': 'warn',
        '@typescript-eslint/no-base-to-string': 'warn',
        '@typescript-eslint/no-empty-object-type': 'warn',
        '@typescript-eslint/no-explicit-any': 'warn',
        '@typescript-eslint/no-floating-promises': 'warn',
        '@typescript-eslint/no-misused-promises': 'warn',
        '@typescript-eslint/no-redundant-type-constituents': 'warn',
        '@typescript-eslint/no-require-imports': 'warn',
        '@typescript-eslint/no-unnecessary-type-assertion': 'warn',
        '@typescript-eslint/no-unsafe-argument': 'warn',
        '@typescript-eslint/no-unsafe-assignment': 'warn',
        '@typescript-eslint/no-unsafe-enum-comparison': 'warn',
        '@typescript-eslint/no-unsafe-function-type': 'warn',
        '@typescript-eslint/no-unsafe-member-access': 'warn',
        '@typescript-eslint/no-unsafe-return': 'warn',
        '@typescript-eslint/no-unsafe-call': 'warn',
        '@typescript-eslint/no-unused-vars': [
          'error',
          {
            caughtErrors: 'none'
          }
        ],
        '@typescript-eslint/no-wrapper-object-types': 'warn',
        '@typescript-eslint/only-throw-error': 'warn',
        '@typescript-eslint/prefer-promise-reject-errors': 'warn',
        '@typescript-eslint/require-await': 'warn',
        '@typescript-eslint/restrict-template-expressions': 'warn',
        '@typescript-eslint/unbound-method': 'warn',

        // The following rules are part of @typescript-eslint/stylistic-type-checked
        // and can be remove once solved
        '@typescript-eslint/prefer-nullish-coalescing': 'warn', // TODO: Requires strictNullChecks: true
        '@typescript-eslint/prefer-regexp-exec': 'warn'
      }
    }))
];

/* eslint-disable */
export default {
  displayName: 'common',

  globals: {},
  transform: {
    '^.+\\.[tj]sx?$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }]
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  coverageDirectory: '../../coverage/libs/common',
  setupFiles: ['<rootDir>/jest.setup.ts'],
  preset: '../../jest.preset.js'
};

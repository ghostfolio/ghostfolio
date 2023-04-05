/* eslint-disable */
export default {
  displayName: 'api',

  globals: {},
  transform: {
    '^.+\\.[tj]s$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.spec.json'
      }
    ]
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../../coverage/apps/api',
  testTimeout: 10000,
  testEnvironment: 'node',
  preset: '../../jest.preset.js'
};

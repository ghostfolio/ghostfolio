/* eslint-disable */
export default {
  displayName: 'api',

  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/tsconfig.spec.json'
    }
  },
  transform: {
    '^.+\\.[tj]s$': 'ts-jest'
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../../coverage/apps/api',
  testTimeout: 10000,
  testEnvironment: 'node',
  preset: '../../jest.preset.js'
};

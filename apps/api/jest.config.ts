/* eslint-disable */

// Run tests in UTC for deterministic date-based calculations. Set TEST_TZ to
// run them with the instance in another time zone.
process.env.TZ = process.env.TEST_TZ ?? 'UTC';

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
  testEnvironment: 'node',
  preset: '../../jest.preset.js'
};

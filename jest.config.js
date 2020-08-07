module.exports = {
  globalSetup: "<rootDir>/test/setup.config.js",
  'transform': {
    '.(js|ts|tsx)': 'ts-jest'
  },
  'testMatch': [
    '**/test/**/?(*.)+(spec|test).[jt]s?(x)'
  ],
  'testTimeout': 120 * 1000,
  'collectCoverageFrom': [
    'src/**/*',
    '!**/node_modules/**'
  ],
  'coveragePathIgnorePatterns': [
    'node_modules/',
  ],
  'testPathIgnorePatterns': [
    '/node_modules/',
    '/lib/'
  ],
  'modulePathIgnorePatterns': [
    '<rootDir>/lib'
  ]
};

module.exports = {
  globalSetup: "<rootDir>/test/setup.config.js",
  'transform': {
    '.(js|ts|tsx)': 'ts-jest'
  },
  'testMatch': [
    '**/test/**/?(*.)+(spec|test).[jt]s?(x)'
  ],
  'testTimeout': 10 * 60 * 1000, // 10 minutes
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

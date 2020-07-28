module.exports = {
  'transform': {
    '.(js|ts|tsx)': 'ts-jest'
  },
  'testMatch': [
    '**/test/**/?(*.)+(spec|test).[jt]s?(x)'
  ],
  'testTimeout': 30 * 1000,
  'collectCoverageFrom': [
    'src/lib/**/*',
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

// jest.config.ts

import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest', // Use ts-jest preset for TypeScript
  testEnvironment: 'node', // Use Node.js environment
  clearMocks: true, // Automatically clear mock calls and instances between every test
  collectCoverage: true, // Enable coverage collection
  coverageDirectory: 'coverage', // Specify coverage directory
  coverageProvider: 'v8', // Use V8 for coverage
  testMatch: ['**/tests/**/*.test.ts'], // Specify test file patterns
  moduleFileExtensions: ['ts', 'js', 'json', 'node'], // File extensions to recognize
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.json', // Path to your tsconfig
    },
  },
  setupFilesAfterEnv: ['./tests/jest.setup.ts'], // Setup file for Jest
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1', // Handle path aliases if any
  },
};

export default config;

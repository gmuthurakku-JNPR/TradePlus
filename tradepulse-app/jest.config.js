/**
 * Jest Configuration for TradePulse
 * 
 * Testing Framework Setup:
 * - TypeScript support with ts-jest
 * - Path alias resolution matching tsconfig
 * - Coverage thresholds for quality gate
 * - Node environment for engine testing
 */

export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/__tests__/**/*.spec.ts',
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  collectCoverageFrom: [
    'src/engines/**/*.ts',
    'src/utils/**/*.ts',
    'src/hooks/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/**/QUICK_START.ts',
    '!src/**/examples/**',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@engines/(.*)$': '<rootDir>/src/engines/$1',
    '^@types$': '<rootDir>/src/types/index.ts',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@hooks/(.*)$': '<rootDir>/src/hooks/$1',
    '^@services/(.*)$': '<rootDir>/src/services/$1',
    '^@persistence/(.*)$': '<rootDir>/src/persistence/$1',
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        baseUrl: '.',
        paths: {
          '@/*': ['./src/*'],
          '@engines/*': ['./src/engines/*'],
          '@types': ['./src/types'],
          '@utils/*': ['./src/utils/*'],
          '@hooks/*': ['./src/hooks/*'],
          '@services/*': ['./src/services/*'],
          '@persistence/*': ['./src/persistence/*'],
        },
      },
    }],
  },
  verbose: true,
  testTimeout: 10000,
};

const { defineConfig } = require('vitest/config');

module.exports = defineConfig({
  test: {
    include: ['test/**/*.test.ts', 'test/**/*.spec.ts'],
    globals: true,
    environment: 'node',
    testTimeout: 30000,
    reporters: [
      'default',
      ['junit', { outputFile: './test-results/junit.xml' }],
    ],
  },
});

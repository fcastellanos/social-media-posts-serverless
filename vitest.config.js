const { defineConfig } = require('vitest/config');

module.exports = defineConfig({
  test: {
    reporters: [
      'default',
      ['junit', { outputFile: './test-results/junit.xml' }],
    ],
  },
});

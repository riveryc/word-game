/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true, // Makes expect, describe, it, etc. available globally like in Jest
    environment: 'jsdom', // Use JSDOM for tests that need a DOM
    // You can add more configurations here as needed, for example:
    // setupFiles: ['./tests/setupTests.js'], // For global test setup
    // coverage: { // Optional: for code coverage reports
    //   provider: 'v8', // or 'istanbul'
    //   reporter: ['text', 'json', 'html'],
    // },
  },
}); 
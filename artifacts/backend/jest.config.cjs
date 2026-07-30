module.exports = {
  testEnvironment: "node",
  transform: {},
  testMatch: ["<rootDir>/tests/**/*.test.js"],
  collectCoverageFrom: ["src/server.js"],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov"],
  coverageThreshold: {
    global: {
      branches: 30,
      functions: 40,
      lines: 40,
      statements: 40,
    },
  },
};

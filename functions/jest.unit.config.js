module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: [
    "**/tests/**/*.unit.ts",
    "**/tests/**/*.test.ts",
    "**/tests/**/*.spec.ts",
  ],
  setupFilesAfterEnv: ["<rootDir>/tests/unit.setup.ts"],
  moduleNameMapper: {
    "^src/(.*)$": "<rootDir>/src/$1",
    "^@/(.*)$": "<rootDir>/src/$1",
    "^@utils/(.*)$": "<rootDir>/src/utils/$1",
  },
};

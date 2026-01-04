module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/tests/**/*.integration.ts"],
  setupFilesAfterEnv: ["<rootDir>/tests/integration.setup.ts"],
  transform: {
    "^.+\\.ts$": [
      "ts-jest",
      {
        tsconfig: "tsconfig.test.json",
        isolatedModules: true,
      },
    ],
  },
  testTimeout: 60000,
};

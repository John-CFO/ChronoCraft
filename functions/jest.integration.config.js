module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  rootDir: ".",
  testMatch: ["<rootDir>/tests/**/*.integration.ts"],
  setupFilesAfterEnv: ["<rootDir>/tests/integration.setup.ts"],
  transform: {
    "^.+\\.ts$": [
      "ts-jest",
      {
        tsconfig: "<rootDir>/tsconfig.test.json",
      },
    ],
  },
  moduleDirectories: ["node_modules", "<rootDir>/node_modules"],
  verbose: true,
  testTimeout: 60000,
};

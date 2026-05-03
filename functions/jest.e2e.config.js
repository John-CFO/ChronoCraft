module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["<rootDir>/tests/e2e/**/*.e2e.test.ts"],
  setupFilesAfterEnv: ["<rootDir>/tests/e2e/setup.ts"],
  transform: {
    "^.+\\.ts$": [
      "ts-jest",
      { tsconfig: "<rootDir>/tsconfig.test.json", isolatedModules: false },
    ],
  },
  verbose: true,
  moduleFileExtensions: ["ts", "js", "json", "node"],
};

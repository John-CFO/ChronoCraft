module.exports = {
  rootDir: ".",
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["<rootDir>/tests/unit/**/*.ts"],
  testPathIgnorePatterns: ["\\.e2e\\.test\\.ts$", "\\.integration\\.ts$"],
  setupFilesAfterEnv: ["<rootDir>/tests/unit.setup.ts"],
  moduleNameMapper: {
    "^src/(.*)$": "<rootDir>/src/$1",
    "^@/(.*)$": "<rootDir>/src/$1",
    "^@utils/(.*)$": "<rootDir>/src/utils/$1",
  },
  transform: {
    "^.+\\.ts$": [
      "ts-jest",
      {
        tsconfig: "tsconfig.test.json",
      },
    ],
  },
  verbose: true,
};

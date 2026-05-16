// jest.race.config.js
module.exports = {
  rootDir: ".",
  preset: "ts-jest",
  testEnvironment: "node",

  testMatch: ["<rootDir>/tests/race-conditions/**/*.test.ts"],

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

  setupFiles: ["<rootDir>/tests/firebaseAdminTest.ts"],

  verbose: true,
};

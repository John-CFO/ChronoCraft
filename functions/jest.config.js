// functions/jest.config.js
export default {
  preset: "ts-jest/presets/default-esm",
  testEnvironment: "node",
  setupFilesAfterEnv: ["<rootDir>/functions/test/setupTests.ts"],
  extensionsToTreatAsEsm: [".ts"],
  transform: {
    "^.+\\.ts$": ["ts-jest", { useESM: true }],
  },
};

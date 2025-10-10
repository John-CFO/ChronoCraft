// jest.config.js

module.exports = {
  preset: "jest-expo",
  setupFilesAfterEnv: [
    "<rootDir>/jest.setup.js",
    "@testing-library/jest-native/extend-expect",
  ],
  testEnvironment: "node",
  transform: {
    "^.+\\.(js|jsx|ts|tsx)$": "babel-jest",
  },
  transformIgnorePatterns: [
    "node_modules/(?!(jest-)?@?react-native|@react-native|expo(nent)?|@expo(nent)?|@unimodules|unimodules|@firebase)",
  ],
  moduleNameMapper: {
    "^.*firebaseConfig$": "<rootDir>/__mocks__/firebaseConfig.ts",
  },
};

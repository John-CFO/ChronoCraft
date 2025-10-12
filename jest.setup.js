// jest.setup.js

jest.mock("firebase/auth", () => ({
  getAuth: jest.fn(() => ({ currentUser: { uid: "test-uid" } })),
  User: jest.fn(),
}));

jest.mock("firebase/firestore", () => ({
  doc: jest.fn(),
  updateDoc: jest.fn(),
}));

jest.mock("react-native/Libraries/Animated/NativeAnimatedHelper");

// replace react-native-modal with a simple passthrough to avoid anims
jest.mock("react-native-modal", () => {
  const React = require("react");
  const { View } = require("react-native");
  return ({ children, isVisible }) =>
    isVisible ? React.createElement(View, null, children) : null;
});

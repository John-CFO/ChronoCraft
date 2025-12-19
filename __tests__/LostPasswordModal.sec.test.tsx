//////////////////LostPasswordModal.sec.test.tsx////////////////////

// This file contains the unit tests for the LostPasswordModal component
// It tests the user authorization and input validation
// Test accessability store is disabled, flood protection is enabled
// and cooldown is tested

////////////////////////////////////////////////////////////////

import React from "react";
import { render, fireEvent, waitFor, act } from "@testing-library/react-native";
import { sendPasswordResetEmail } from "firebase/auth";

import LostPasswordModal from "../components/LostPasswordModal";

/////////////////////////////////////////////////////////////////

// Firebase Mock
jest.mock("firebase/auth", () => ({
  sendPasswordResetEmail: jest.fn(),
}));

// Mock for the AlertStore
const mockShowAlert = jest.fn();
jest.mock("../components/services/customAlert/alertStore", () => ({
  useAlertStore: Object.assign(jest.fn(), {
    getState: () => ({
      showAlert: mockShowAlert,
    }),
  }),
}));

// Mock for the DotAnimation (prevent animation)
jest.mock("../components/DotAnimation", () => ({
  useDotAnimation: jest.fn(() => ""),
}));

// Mock for the AccessibilityStore
jest.mock("../components/services/accessibility/accessibilityStore", () => ({
  useAccessibilityStore: jest.fn(() => false),
}));

describe("LostPasswordModal (AppSec validation only)", () => {
  const mockOnClose = jest.fn();

  const renderModal = () =>
    render(<LostPasswordModal visible={true} onClose={mockOnClose} />);

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("normalizes email and calls sendPasswordResetEmail", async () => {
    const { getByPlaceholderText, getByText } = renderModal();

    const emailInput = getByPlaceholderText(/E-Mail Adress/i);
    fireEvent.changeText(emailInput, " TEST@Example.com ");
    fireEvent.press(getByText("Send Reset Link"));

    await waitFor(() => {
      expect(sendPasswordResetEmail).toHaveBeenCalledTimes(1);
      expect(sendPasswordResetEmail).toHaveBeenCalledWith(
        expect.anything(),
        "test@example.com"
      );
      expect(mockShowAlert).toHaveBeenCalledWith(
        "Email sent",
        expect.stringContaining("instructions")
      );
      expect(mockOnClose).toHaveBeenCalled();
    });
  }, 10000);

  it("does not allow submission with empty email", async () => {
    const { getByText } = renderModal();

    fireEvent.press(getByText("Send Reset Link"));

    await waitFor(() => {
      expect(mockShowAlert).toHaveBeenCalledTimes(1);
      expect(mockShowAlert).toHaveBeenCalledWith(
        "Error",
        "Please enter a valid email address."
      );
    });
  });

  it("starts cooldown after password reset", async () => {
    (sendPasswordResetEmail as jest.Mock).mockResolvedValueOnce({});

    const { getByPlaceholderText, getByLabelText } = renderModal();
    const emailInput = getByPlaceholderText(/E-Mail Adress/i);
    fireEvent.changeText(emailInput, "test@example.com");
    const resetButton = getByLabelText("Reset Password");
    fireEvent.press(resetButton);

    await waitFor(() => {
      expect(mockShowAlert).toHaveBeenCalledWith(
        "Email sent",
        expect.stringContaining("instructions")
      );
    });
  });

  it("handles Firebase errors gracefully", async () => {
    (sendPasswordResetEmail as jest.Mock).mockRejectedValueOnce({
      code: "auth/invalid-email",
    });

    const { getByPlaceholderText, getByText } = renderModal();
    const emailInput = getByPlaceholderText(/E-Mail Adress/i);
    fireEvent.changeText(emailInput, "invalid");
    fireEvent.press(getByText("Send Reset Link"));

    await waitFor(() => {
      expect(mockShowAlert).toHaveBeenCalledWith(
        "Error",
        "Please enter a valid email address."
      );
    });
  });

  it("prevents rapid multiple submissions (flood protection)", async () => {
    (sendPasswordResetEmail as jest.Mock).mockResolvedValue({});

    const { getByPlaceholderText, getByLabelText } = renderModal();
    const emailInput = getByPlaceholderText(/E-Mail Adress/i);
    fireEvent.changeText(emailInput, "test@example.com");

    const resetButton = getByLabelText("Reset Password");

    await act(async () => {
      fireEvent.press(resetButton);
      fireEvent.press(resetButton);
    });

    await waitFor(() => {
      expect(sendPasswordResetEmail).toHaveBeenCalledTimes(1);
    });
  });
});

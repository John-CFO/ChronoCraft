/////////////////////////////// emailService.test.ts //////////////////////////////////

// This file contains the unit tests for the emailService.ts file.

///////////////////////////////////////////////////////////////////////////////////////

import { Resend } from "resend";

import { sendPasswordResetEmail } from "../../../src/services/emailService";
import "../../../tests/unit.setup";

///////////////////////////////////////////////////////////////////////////////////////

process.env.RESEND_API_KEY = "test-resend-api-key";
process.env.RESEND_FROM_EMAIL = "no-reply@test.com";

jest.mock("resend");

const mockSend = jest.fn();

(Resend as jest.Mock).mockImplementation(() => ({
  emails: {
    send: mockSend,
  },
}));

describe("emailService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should send password reset email", async () => {
    mockSend.mockResolvedValue({ id: "1" });

    await sendPasswordResetEmail("test@example.com", "https://reset.link");

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "test@example.com",
        subject: "Reset your password",
      }),
    );
  });
});

////////////////////////////////////// requestPasswordReset.integration.ts /////////////////////////////////

// This file contains integration tests for the requestPasswordResetHandler function

////////////////////////////////////////////////////////////////////////////////////////////////////////////

import "../integration.setup";
import { requestPasswordResetHandler } from "../../src/functions/requestPasswordReset.function";
import * as emailService from "../../src/services/emailService";
import { auth } from "../../src/firebaseAdmin";

////////////////////////////////////////////////////////////////////////////////////////////////////////////

jest
  .spyOn(emailService, "sendPasswordResetEmail")
  .mockResolvedValue({ id: "test-id" } as any);
jest
  .spyOn(auth, "generatePasswordResetLink")
  .mockResolvedValue("https://reset.link");

describe("requestPasswordReset (integration)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should reject invalid email", async () => {
    await expect(
      requestPasswordResetHandler({
        data: { email: "" },
        rawRequest: { headers: {}, socket: {} },
      } as any),
    ).rejects.toThrow();
  });

  it("should execute full flow", async () => {
    const result = await requestPasswordResetHandler({
      data: { email: "test@example.com" },
      rawRequest: {
        headers: { "x-forwarded-for": "127.0.0.1" },
        socket: {},
      },
    } as any);

    expect(result.success).toBe(true);

    expect(auth.generatePasswordResetLink).toHaveBeenCalledWith(
      "test@example.com",
    );

    expect(emailService.sendPasswordResetEmail).toHaveBeenCalledWith(
      "test@example.com",
      "https://reset.link",
    );
  });
});

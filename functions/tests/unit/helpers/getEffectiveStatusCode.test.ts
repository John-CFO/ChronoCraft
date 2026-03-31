//////////////////////// getEffectiveStatusCode.test.ts //////////////////////////

// This file contains the unit tests for the getEffectiveStatusCode helper function.

////////////////////////////////////////////////////////////////////////////////////

import { getEffectiveStatusCode } from "../../utils/getEffectiveStatusCode";

describe("getEffectiveStatusCode helper", () => {
  it("should return 429 for plain RateLimit object", () => {
    const rateLimitObj = {
      valid: false,
      retryAfterSeconds: 30,
      message: "Too many attempts",
    };

    const res = {
      status: 200,
      body: rateLimitObj,
    };

    const status = getEffectiveStatusCode(res as any);
    expect(status).toBe(429);
  });

  it("should return 200 for successful plain object", () => {
    const successObj = { valid: true, data: { foo: "bar" } };
    const res = { status: 200, body: successObj };
    const status = getEffectiveStatusCode(res as any);
    expect(status).toBe(200);
  });

  it("should map Firebase HttpsError codes to proper HTTP status", () => {
    const httpsError = { code: "unauthenticated", message: "Login required" };
    const res = { status: 200, body: httpsError };
    const status = getEffectiveStatusCode(res as any);
    expect(status).toBe(401);
  });
});

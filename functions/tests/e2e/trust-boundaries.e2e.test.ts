////////////////////////// trust-boundaries.e2e.ts ///////////////////////////////

// This file contains the E2E tests for the Trust Boundaries feature

/////////////////////////////////////////////////////////////////////////////////

import {
  callFunction,
  getIdTokenForUser,
  TEST_USERS,
  resetTotpState,
  resetRateLimitState,
  testEnv,
} from "./setup";
import { hotp } from "../../src/security/totpCore";
import { totpEnrollAndVerify } from "./totp.helpers";

////////////////////////////////////////////////////////////////////////////////////

// types
type CallResult = {
  status: number;
  body: any;
};

////////////////////////////////////////////////////////////////////////////////////

// --- Helper functions for error handling ---

// Unwrap the result of a Callable Function (if wrapped in "result")
const unwrapBody = (body: any): any => {
  if (body && typeof body === "object" && "result" in body) {
    return body.result;
  }
  return body;
};

// checks if the body is a Firebase HttpsError
const isFirebaseError = (body: any): boolean =>
  body &&
  typeof body === "object" &&
  ("code" in body || ("error" in body && typeof body.error === "object"));

// extracts the error.code from a Firebase HttpsError
const getErrorCode = (body: any): string | undefined => {
  const unwrapped = unwrapBody(body);
  if (!unwrapped) return undefined;
  if (typeof unwrapped === "object" && "code" in unwrapped)
    return unwrapped.code;
  if (typeof unwrapped === "object" && "error" in unwrapped)
    return unwrapped.error?.code;
  return undefined;
};

// normalize a error code (removes prefixes like "auth/", converts to lowercase)
const normalizeErrorCode = (code: string): string => {
  const normalized = code.toLowerCase();
  // delete average prefixes (e.g. "auth/", "functions/", "internal/")
  const withoutPrefix = normalized.replace(/^(auth|functions|internal)\//, "");
  return withoutPrefix;
};

// set the logical HTTP status code based on the response body
function getEffectiveStatusCode(res: CallResult): number {
  // if the body is a simple string (e.g. "Not Found"), take the HTTP status
  if (typeof res.body === "string") {
    return res.status;
  }

  const body = unwrapBody(res.body);
  if (!body) return res.status || 500;

  // try to get an HTTP status from body.error.status
  if (body.error && body.error.status) {
    const statusMap: Record<string, number> = {
      INVALID_ARGUMENT: 400,
      UNAUTHENTICATED: 401,
      PERMISSION_DENIED: 403,
      NOT_FOUND: 404,
      ALREADY_EXISTS: 409,
      RESOURCE_EXHAUSTED: 429,
      FAILED_PRECONDITION: 412,
      ABORTED: 409,
      OUT_OF_RANGE: 400,
      UNIMPLEMENTED: 501,
      INTERNAL: 500,
      UNAVAILABLE: 503,
      DEADLINE_EXCEEDED: 504,
    };
    const mapped = statusMap[body.error.status];
    if (mapped) return mapped;
  }

  if (isFirebaseError(body)) {
    const code = getErrorCode(body);
    if (code) {
      const normalized = normalizeErrorCode(code);
      if (normalized.includes("unauthenticated")) return 401;
      if (normalized.includes("permission-denied")) return 403;
      if (normalized.includes("invalid-argument")) return 400;
      if (normalized.includes("failed-precondition")) return 412;
      if (normalized.includes("not-found")) return 404;
      if (normalized.includes("resource-exhausted")) return 429;
    }
    return 500;
  }

  return res.status;
}

// expect that the request was successful (logical status 2xx)
const expectSuccess = (res: CallResult) => {
  const status = getEffectiveStatusCode(res);
  expect(status).toBeGreaterThanOrEqual(200);
  expect(status).toBeLessThan(300);
  expect(res.body).toBeDefined();
};

// expect an authentication error (401 or 403)
const expectUnauthenticated = (res: CallResult) => {
  const status = getEffectiveStatusCode(res);
  expect(status === 401 || status === 403).toBe(true);
};

// expect a validation error (400 or 422)
const expectValidationError = (res: CallResult) => {
  const status = getEffectiveStatusCode(res);
  expect(status === 400 || status === 422).toBe(true);
};

describe("Trust Boundaries E2E", () => {
  it("should allow owner to read their document", async () => {
    const db = testEnv.authenticatedContext("test-user").firestore();
    const ref = db.collection("Users").doc("test-user");

    await ref.set({ name: "John" });

    const snap = await ref.get();
    expect(snap.exists).toBe(true);
    expect(snap.data()?.name).toBe("John");
  });
});

describe("Authentication Boundaries", () => {
  it("should allow authenticated user to perform login/register actions", async () => {
    const idToken = await getIdTokenForUser(TEST_USERS[0].uid);

    const loginRes = await callFunction({
      functionName: "authValidatorFunction",
      idToken,
      body: {
        action: "login",
        payload: { email: "user1@example.com", password: "password" },
      },
      isCallable: true,
    });
    expectSuccess(loginRes);

    const registerRes = await callFunction({
      functionName: "authValidatorFunction",
      idToken,
      body: {
        action: "register",
        payload: {
          email: "newuser@example.com",
          password: "password123",
          displayName: "New User",
        },
      },
      isCallable: true,
    });
    expectSuccess(registerRes);

    const loginNewUserRes = await callFunction({
      functionName: "authValidatorFunction",
      idToken,
      body: {
        action: "login",
        payload: { email: "newuser@example.com", password: "password123" },
      },
      isCallable: true,
    });
    expectSuccess(loginNewUserRes);
  });

  it("should reject malformed auth token", async () => {
    const res = await callFunction({
      functionName: "profileValidatorFunction",
      idToken: "not.a.valid.jwt",
      body: { displayName: "Test" },
      isCallable: true,
    });

    expectUnauthenticated(res);
  });

  it("should reject private endpoints without authentication", async () => {
    const testCases = [
      {
        functionName: "authValidatorFunction",
        body: { action: "verifyTotp", payload: "123456" },
        isCallable: true,
      },
      {
        functionName: "profileValidatorFunction",
        body: { displayName: "Test" },
        isCallable: true,
      },
      {
        functionName: "projectsAndWorkValidatorFunction",
        body: {
          action: "updateProject",
          payload: { id: "test" },
        },
        isCallable: true,
      },
      {
        functionName: "secureDeleteFunction",
        body: { userId: "test", serviceId: "test", subs: [] },
        isCallable: true,
      },
    ];

    for (const testCase of testCases) {
      const res = await callFunction({
        functionName: testCase.functionName,
        body: testCase.body,
        isCallable: testCase.isCallable,
      });
      expectUnauthenticated(res);
    }
  });

  it("should reject private endpoints with invalid auth header", async () => {
    const res = await callFunction({
      functionName: "profileValidatorFunction",
      body: { displayName: "Test" },
      idToken: "invalid.token.here",
      isCallable: true,
    });
    expectUnauthenticated(res);
  });
});

describe("Authorization Boundaries", () => {
  it("should have permission checks for cross-user actions", async () => {
    const testUser = TEST_USERS[0];
    const idToken = await getIdTokenForUser(testUser.uid);

    const res = await callFunction({
      functionName: "projectsAndWorkValidatorFunction",
      idToken,
      body: {
        action: "updateProject",
        payload: { projectId: "testProject2", name: "Hacked" },
      },
      isCallable: true,
    });

    const status = getEffectiveStatusCode(res);
    expect(status === 403 || status === 401).toBe(true);
  });

  it("should allow authorized user to access own profile", async () => {
    const testUser = TEST_USERS[0];
    const idToken = await getIdTokenForUser(testUser.uid);

    const res = await callFunction({
      functionName: "profileValidatorFunction",
      idToken,
      body: {
        displayName: "Updated Name",
      },
      isCallable: true,
    });
    expectSuccess(res);
  });

  it("should reject client-controlled userId (server owns identity)", async () => {
    const userA = TEST_USERS[0];
    const userB = TEST_USERS[1];

    const tokenA = await getIdTokenForUser(userA.uid);

    const res = await callFunction({
      functionName: "profileValidatorFunction",
      idToken: tokenA,
      body: { userId: userB.uid },
      isCallable: true,
    });

    expect(getEffectiveStatusCode(res)).toBe(400);
  });

  it("should reject cross-user manipulation via projectId injection", async () => {
    const userA = TEST_USERS[0];
    const userB = TEST_USERS[1];

    const tokenA = await getIdTokenForUser(userA.uid);

    const res = await callFunction({
      functionName: "projectsAndWorkValidatorFunction",
      idToken: tokenA,
      body: {
        action: "updateProject",
        payload: {
          projectId: "testProject2", // owns userB
          name: "Injected Name",
        },
      },
      isCallable: true,
    });

    expect(getEffectiveStatusCode(res)).toBe(403);
  });

  it("should reject cross-user project update (trust boundary enforcement)", async () => {
    const userA = TEST_USERS[0];
    const userB = TEST_USERS[1];

    const tokenA = await getIdTokenForUser(userA.uid);

    const res = await callFunction({
      functionName: "projectsAndWorkValidatorFunction",
      idToken: tokenA,
      body: {
        action: "updateProject",
        payload: {
          projectId: "testProject2", // owns userB
          name: "Injected Name",
        },
      },
      isCallable: true,
    });

    expect(getEffectiveStatusCode(res)).toBe(403);
  });
});

describe("Input Validation Boundaries", () => {
  it("should validate required parameters", async () => {
    const idToken = await getIdTokenForUser(TEST_USERS[0].uid);
    const res1 = await callFunction({
      functionName: "authValidatorFunction",
      idToken,
      body: {},
      isCallable: true,
    });
    expectValidationError(res1);

    const res2 = await callFunction({
      functionName: "authValidatorFunction",
      idToken,
      body: { action: "invalidAction" },
      isCallable: true,
    });
    expectValidationError(res2);
  });

  it("should validate data types", async () => {
    const idToken = await getIdTokenForUser(TEST_USERS[0].uid);
    const res = await callFunction({
      functionName: "projectsAndWorkValidatorFunction",
      idToken,
      body: { payload: {} },
      isCallable: true,
    });
    expectValidationError(res);
  });

  it("should reject oversized payload", async () => {
    const idToken = await getIdTokenForUser(TEST_USERS[0].uid);

    const bigString = "x".repeat(100000);

    const res = await callFunction({
      functionName: "profileValidatorFunction",
      idToken,
      body: { displayName: bigString },
      isCallable: true,
    });

    expectValidationError(res);
  });

  it("should reject wrong data types", async () => {
    const idToken = await getIdTokenForUser(TEST_USERS[0].uid);

    const res = await callFunction({
      functionName: "projectsAndWorkValidatorFunction",
      idToken,
      body: {
        action: "updateProject",
        payload: 12345,
      },
      isCallable: true,
    });

    expectValidationError(res);
  });
});

describe("Error Handling Boundaries", () => {
  it("should return consistent error format", async () => {
    const idToken = await getIdTokenForUser(TEST_USERS[0].uid);
    const res = await callFunction({
      functionName: "authValidatorFunction",
      idToken,
      body: { action: "verifyTotp" },
      isCallable: true,
    });
    expectValidationError(res);
    expect(isFirebaseError(unwrapBody(res.body))).toBe(true);
  });
});

describe("Rate Limit Boundaries", () => {
  it("should implement rate limiting (only if enabled)", async () => {
    const requests = [];
    for (let i = 0; i < 5; i++) {
      requests.push(
        callFunction({
          functionName: "authValidatorFunction",
          body: {
            action: "login",
            payload: { email: `user${i}@test.com`, password: "test" },
          },
          isCallable: true,
        }),
      );
    }
    const results = await Promise.all(requests);
    expect(results.length).toBe(5);
    results.forEach((r) => {
      expect(getEffectiveStatusCode(r)).toBeLessThan(500);
    });
    if (process.env.RATE_LIMIT_EXPECTED === "true") {
      const hasRateLimit = results.some(
        (r) => getEffectiveStatusCode(r) === 429,
      );
      expect(hasRateLimit).toBe(true);
    }
  });
});

describe("TOTP Callable Functions", () => {
  const uid = TEST_USERS[0].uid;

  beforeEach(async () => {
    await resetTotpState(uid);
    await resetRateLimitState(uid);
  });

  it("should call verifyTotpToken callable (unauthenticated)", async () => {
    const res = await callFunction({
      functionName: "verifyTotpToken",
      body: { token: "123456" },
      isCallable: true,
    });
    expectUnauthenticated(res);
  });

  it("should create enrollment and verify TOTP token correctly (enroll flow)", async () => {
    const uid = TEST_USERS[0].uid;
    const idToken = await getIdTokenForUser(uid);

    const createRes = await callFunction({
      functionName: "createTotpSecret",
      idToken,
      body: {},
      isCallable: true,
    });

    const createBody = unwrapBody(createRes.body);
    const otpAuthUrl = createBody.otpAuthUrl;
    const enrollmentId = createBody.enrollmentId;

    expect(otpAuthUrl).toBeDefined();
    expect(enrollmentId).toBeDefined();
    expect((createBody as any).secret).toBeUndefined();

    const secretMatch = /[?&]secret=([^&]+)/i.exec(otpAuthUrl);
    expect(secretMatch).not.toBeNull();
    const secret = decodeURIComponent(secretMatch![1]);

    const counter = Math.floor(Date.now() / 1000 / 30);
    const token = hotp(secret, counter);

    const verifyRes = await callFunction({
      functionName: "verifyTotpToken",
      idToken,
      body: { token, enrollmentId },
      isCallable: true,
    });

    expectSuccess(verifyRes);
    const verifyBody = unwrapBody(verifyRes.body);
    expect(verifyBody.valid).toBe(true);
  });

  it("should verify TOTP token correctly", async () => {
    const uid = TEST_USERS[0].uid;
    const idToken = await getIdTokenForUser(uid);

    const { secret } = await totpEnrollAndVerify(uid);

    const counter = Math.floor(Date.now() / 1000 / 30);
    const token = hotp(secret, counter);

    const res = await callFunction({
      functionName: "verifyTotpLogin",
      idToken,
      body: { token },
      isCallable: true,
    });

    expectSuccess(res);
    const body = unwrapBody(res.body);
    expect(body.valid).toBe(true);
  });

  it("should reject access to another user's data", async () => {
    const userA = TEST_USERS[0];
    const userB = TEST_USERS[1];

    const tokenA = await getIdTokenForUser(userA.uid);

    const res = await callFunction({
      functionName: "profileValidatorFunction",
      idToken: tokenA,
      body: { userId: userB.uid },
      isCallable: true,
    });

    expectValidationError(res);
  });

  it("should complete full TOTP enroll + verify flow", async () => {
    const { otpAuthUrl, enrollmentId, token, verifyBody } =
      await totpEnrollAndVerify(TEST_USERS[0].uid);
    expect(otpAuthUrl).toBeDefined();
    expect(enrollmentId).toBeDefined();
    expect(verifyBody.valid).toBe(true);
  });

  it("must never expose totp secret", async () => {
    const idToken = await getIdTokenForUser(TEST_USERS[0].uid);
    const res = await callFunction({
      functionName: "createTotpSecret",
      idToken,
      body: {},
      isCallable: true,
    });
    const body = unwrapBody(res.body);
    expect(body).toHaveProperty("otpAuthUrl");
    expect((body as any).secret).toBeUndefined();
  });

  it("should reject unauthenticated verifyTotpToken call", async () => {
    const res = await callFunction({
      functionName: "verifyTotpToken",
      body: { token: "123456" },
      isCallable: true,
    });
    expectUnauthenticated(res);
  });

  it("should reject invalid TOTP token with valid:false", async () => {
    const uid = TEST_USERS[0].uid;
    const idToken = await getIdTokenForUser(uid);

    await totpEnrollAndVerify(uid);

    const res = await callFunction({
      functionName: "verifyTotpLogin",
      idToken,
      body: { token: "000000" },
      isCallable: true,
    });

    expect(getEffectiveStatusCode(res)).toBe(200);
    expect(res.body).toEqual(
      expect.objectContaining({
        result: expect.objectContaining({
          valid: false,
          message: "Invalid TOTP code",
        }),
      }),
    );
  });

  it("should reject reused TOTP token (replay protection)", async () => {
    const uid = TEST_USERS[0].uid;
    const idToken = await getIdTokenForUser(uid);

    const { secret } = await totpEnrollAndVerify(uid);

    const counter = Math.floor(Date.now() / 1000 / 30);
    const token = hotp(secret, counter);

    await callFunction({
      functionName: "verifyTotpLogin",
      idToken,
      body: { token },
      isCallable: true,
    });

    const res2 = await callFunction({
      functionName: "verifyTotpLogin",
      idToken,
      body: { token },
      isCallable: true,
    });

    expect(getEffectiveStatusCode(res2)).toBe(200);

    const body = res2.body?.result;

    expect(body).toBeDefined();
    expect(body.valid).toBe(false);

    expect(
      body.message === "TOTP already used" ||
        body.message?.startsWith("Too many attempts"),
    ).toBe(true);
  });

  it("should not allow login TOTP before verification is completed", async () => {
    const uid = TEST_USERS[0].uid;
    const idToken = await getIdTokenForUser(uid);

    const createRes = await callFunction({
      functionName: "createTotpSecret",
      idToken,
      body: {},
      isCallable: true,
    });

    const body = unwrapBody(createRes.body);
    const secretMatch = /[?&]secret=([^&]+)/i.exec(body.otpAuthUrl)!;
    const secret = decodeURIComponent(secretMatch[1]);

    const counter = Math.floor(Date.now() / 1000 / 30);
    const token = hotp(secret, counter);

    const res = await callFunction({
      functionName: "verifyTotpLogin",
      idToken,
      body: { token },
      isCallable: true,
    });

    const status = getEffectiveStatusCode(res);

    if (status === 412) {
      expect(status).toBe(412);
    } else {
      // fallback: for early RateLimit usablility
      expect(status).toBe(200);

      const result = res.body?.result;
      expect(result).toBeDefined();
      expect(result.valid).toBe(false);
      expect(result.message).toMatch(/Too many attempts/i);
    }
  });

  it("should reject mismatched enrollmentId", async () => {
    const uidA = TEST_USERS[0].uid;
    const tokenA = await getIdTokenForUser(uidA);

    const createRes = await callFunction({
      functionName: "createTotpSecret",
      idToken: tokenA,
      body: {},
      isCallable: true,
    });

    const bodyA = unwrapBody(createRes.body);
    const enrollmentId = bodyA.enrollmentId;

    const uidB = TEST_USERS[1].uid;
    const tokenB = await getIdTokenForUser(uidB);

    const res = await callFunction({
      functionName: "verifyTotpToken",
      idToken: tokenB,
      body: {
        token: "123456",
        enrollmentId,
      },
      isCallable: true,
    });

    expect(getEffectiveStatusCode(res)).toBe(403);
  });
});

export { unwrapBody, getEffectiveStatusCode };

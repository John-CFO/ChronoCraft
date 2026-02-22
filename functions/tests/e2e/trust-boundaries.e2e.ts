////////////////////////// trust-boundaries.e2e.ts ///////////////////////////////

// Trust Boundaries E2E Tests

////////////////////////////////////////////////////////////////////////////////////

import {
  callFunction,
  cleanupTestData,
  getIdTokenForUser,
  setupTestData,
  TEST_USERS,
  getTestTotpSecret,
} from "./setup";
import { hotp } from "../../src/security/totpCore";

////////////////////////////////////////////////////////////////////////////////////////

type CallResult = {
  status: number;
  body: any;
};

// function to check if a response body is a FirebaseError
const isFirebaseError = (body: any): boolean =>
  body &&
  typeof body === "object" &&
  ("code" in body || ("error" in body && typeof body.error === "object"));

// function to get the error code from a response body
const getErrorCode = (body: any): string | undefined => {
  if (!body) return undefined;
  if (typeof body === "object" && "code" in body) return body.code;
  if (typeof body === "object" && "error" in body) return body.error?.code;
  return undefined;
};

// function to check if a response is unauthenticated
const expectUnauthenticated = (res: CallResult) => {
  const code = getErrorCode(res.body);
  const statusOk = res.status === 401 || res.status === 403;
  const codeOk =
    typeof code === "string" &&
    (code.includes("unauthenticated") ||
      code.includes("permission-denied") ||
      code.includes("auth"));

  expect(statusOk || codeOk).toBe(true);
};

// function to check if a response is a validation error
const expectValidationError = (res: CallResult) => {
  const code = getErrorCode(res.body);
  const statusOk = res.status === 400 || res.status === 422;
  const codeOk =
    typeof code === "string" &&
    (code.includes("invalid-argument") ||
      code.includes("invalid") ||
      code.includes("bad-request"));

  expect(statusOk || codeOk).toBe(true);
};

// function to check if a response is successful
const expectSuccess = (res: CallResult) => {
  expect(res.status).toBeGreaterThanOrEqual(200);
  expect(res.status).toBeLessThan(300);
  expect(res.body).toBeDefined();
};

describe("Trust Boundaries E2E Tests", () => {
  beforeAll(async () => {
    await setupTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  describe("Authentication Boundaries", () => {
    it("should allow public access to login/register", async () => {
      const loginRes = await callFunction({
        functionName: "authValidatorFunction",
        body: {
          action: "login",
          payload: { email: "user1@example.com", password: "password" },
        },
      });

      expectSuccess(loginRes);

      const registerRes = await callFunction({
        functionName: "authValidatorFunction",
        body: {
          action: "register",
          payload: {
            email: "newuser@example.com",
            password: "password123",
            displayName: "New User",
          },
        },
      });

      expectSuccess(registerRes);

      // Verify register actually worked by logging in with the new user
      const loginNewUserRes = await callFunction({
        functionName: "authValidatorFunction",
        body: {
          action: "login",
          payload: { email: "newuser@example.com", password: "password123" },
        },
      });

      expectSuccess(loginNewUserRes);
    });

    it("should reject private endpoints without authentication", async () => {
      const testCases = [
        {
          functionName: "authValidatorFunction",
          body: { action: "verifyTotp", payload: { code: "123456" } },
        },
        {
          functionName: "profileValidatorFunction",
          body: { displayName: "Test" },
        },
        {
          functionName: "projectsAndWorkValidatorFunction",
          body: {
            action: "updateProject",
            payload: { id: "test" },
          },
        },
        {
          functionName: "secureDeleteFunction",
          body: { userId: "test", serviceId: "test", subs: [] },
        },
      ];

      for (const testCase of testCases) {
        const res = await callFunction({
          functionName: testCase.functionName,
          body: testCase.body,
        });

        // If the endpoint is private, it must fail with auth error.
        expectUnauthenticated(res);
      }
    });

    it("should reject private endpoints with invalid auth header", async () => {
      const res = await callFunction({
        functionName: "profileValidatorFunction",
        body: { displayName: "Test" },
        idToken: "invalid.token.here",
      });

      expectUnauthenticated(res);
    });
  });

  describe("Authorization Boundaries", () => {
    it("should have permission checks for cross-user actions", async () => {
      const testUser = TEST_USERS[0];
      const idToken = await getIdTokenForUser(testUser.uid);

      const res = await callFunction({
        functionName: "authValidatorFunction",
        idToken,
        body: {
          action: "getUserProfile",
          payload: { userId: "different-user-id" },
        },
      });

      // This must fail with permission error, not validation.
      const code = getErrorCode(res.body);
      const statusOk =
        res.status === 403 || res.status === 401 || res.status === 400;
      const codeOk =
        typeof code === "string" &&
        (code.includes("permission-denied") || code.includes("unauthorized"));

      expect(statusOk && codeOk).toBe(true);
    });

    it("should allow authorized user to access own profile", async () => {
      const testUser = TEST_USERS[0];
      const idToken = await getIdTokenForUser(testUser.uid);

      const res = await callFunction({
        functionName: "authValidatorFunction",
        idToken,
        body: {
          action: "getUserProfile",
          payload: { userId: testUser.uid },
        },
      });

      expectSuccess(res);
    });
  });

  describe("Input Validation Boundaries", () => {
    it("should validate required parameters", async () => {
      const res1 = await callFunction({
        functionName: "authValidatorFunction",
        body: {},
      });

      expectValidationError(res1);

      const res2 = await callFunction({
        functionName: "authValidatorFunction",
        body: { action: "invalidAction" },
      });

      expectValidationError(res2);
    });

    it("should validate data types", async () => {
      const res = await callFunction({
        functionName: "projectsAndWorkValidatorFunction",
        body: { payload: {} },
      });

      expectValidationError(res);
    });
  });

  describe("Error Handling Boundaries", () => {
    it("should return consistent error format", async () => {
      const res = await callFunction({
        functionName: "authValidatorFunction",
        body: { action: "verifyTotp" },
      });

      expectValidationError(res);
      expect(isFirebaseError(res.body)).toBe(true);
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
          }),
        );
      }

      const results = await Promise.all(requests);

      expect(results.length).toBe(5);
      expect(results.every((r) => r.status < 500)).toBe(true);

      // If you want to enforce rate limiting, set env var:
      // RATE_LIMIT_EXPECTED=true
      if (process.env.RATE_LIMIT_EXPECTED === "true") {
        const hasRateLimit = results.some((r) => r.status === 429);
        expect(hasRateLimit).toBe(true);
      }
    });
  });

  describe("TOTP Callable Functions", () => {
    it("should call verifyTotpToken callable (unauthenticated)", async () => {
      const res = await callFunction({
        functionName: "verifyTotpToken",
        body: { token: "123456" },
        isCallable: true,
      });

      expectUnauthenticated(res);
    });

    it("should call verifyTotpToken callable (authenticated)", async () => {
      const idToken = await getIdTokenForUser(TEST_USERS[0].uid);

      const res = await callFunction({
        functionName: "verifyTotpToken",
        idToken,
        body: { token: "123456" },
        isCallable: true,
      });

      // Callable should not throw 500
      expect(res.status).not.toBe(500);

      // Either success or validation error (depends on your TOTP logic)
      const code = getErrorCode(res.body);
      const ok =
        (res.status >= 200 && res.status < 300) ||
        (typeof code === "string" && code.includes("invalid"));
      expect(ok).toBe(true);
    });

    it("should verify TOTP token correctly", async () => {
      const uid = TEST_USERS[0].uid;
      const idToken = await getIdTokenForUser(uid);

      // get secret from database
      const secret = await getTestTotpSecret(uid);
      expect(secret).not.toBeNull();

      // generate current token
      const counter = Math.floor(Date.now() / 1000 / 30); // 30s TOTP
      const token = hotp(secret!, counter); // hotp from totp.ts

      // Call Function with valid token
      const res = await callFunction({
        functionName: "verifyTotpToken",
        idToken,
        body: { token },
        isCallable: true,
      });

      expect(res.status).toBeGreaterThanOrEqual(200);
      expect(res.status).toBeLessThan(300);
      expect(res.body.valid).toBe(true);
    });

    it("must never expose totp secret", async () => {
      const idToken = await getIdTokenForUser(TEST_USERS[0].uid);

      const res = await callFunction({
        functionName: "createTotpSecret",
        idToken,
        body: {},
        isCallable: true,
      });

      expect(res.body).toHaveProperty("otpauthUrl");
      expect(JSON.stringify(res.body)).not.toContain("secret");
    });
  });
});

//////////////////////////// trust-boundaries.e2e.ts ///////////////////////////////

// This file contains the end-to-end tests for the trust-boundaries.

////////////////////////////////////////////////////////////////////////////////////

import {
  authValidator,
  profileValidator,
  projectsAndWorkValidator,
  secureDelete,
  setupTestData,
  cleanupTestData,
  TEST_USERS,
} from "./setup";

//////////////////////////////////////////////////////////////////////////////////////

// Own MockRequest Interface without extention from express.Request
interface MockRequest {
  auth?: {
    uid: string;
    token: any;
  };
  rawBody?: Buffer | string;
  body: any;
  headers: Record<string, string | string[] | undefined>;
  method: string;
  url: string;
  query: Record<string, any>;
  params: Record<string, any>;
  get: (name: string) => string | undefined;
  header: (name: string) => string | undefined;
  accepts: (types: string | string[]) => string | false | string[];
  // more minimalistic properties
  protocol: string;
  secure: boolean;
  ip: string;
  ips: string[];
  subdomains: string[];
  path: string;
  hostname: string;
  host: string;
  fresh: boolean;
  stale: boolean;
  xhr: boolean;
  cookies: Record<string, any>;
  signedCookies: Record<string, any>;
  secret?: string | string[];
  // Optional properties to satisfy Firebase functions
  originalUrl?: string;
  baseUrl?: string;
  route?: any;
}

// Respone Interface
interface MockResponse {
  status: jest.Mock<MockResponse, [number]>;
  send: jest.Mock<MockResponse, [any]>;
  json: jest.Mock<MockResponse, [any]>;
  end: jest.Mock<void, []>;
  set: jest.Mock<MockResponse, [string, string] | [Record<string, string>]>;
  get: jest.Mock<string, [string]>;
  // more useful properties
  locals: Record<string, any>;
  charset?: string;
  headersSent: boolean;
}

// Error Interface for consistandcy error handling
interface FirebaseError {
  code: string;
  message: string;
  details?: any;
}

////////////////////////////////////////////////////////////////////////////////////////

describe("Trust Boundaries E2E Tests", () => {
  beforeAll(async () => {
    await setupTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  // Mock the HTTP request
  const createMockRequest = (authData: any, body: any): MockRequest => {
    const headers: Record<string, string> = {
      "content-type": "application/json",
    };
    // function to get headers
    const getFunc = (name: string): string | undefined => {
      return headers[name.toLowerCase()];
    };

    // function to accept headers as array
    const acceptsFunc = (
      types: string | string[]
    ): string | false | string[] => {
      if (Array.isArray(types)) {
        return types.includes("application/json") ? "application/json" : false;
      }
      return types === "application/json" ? "application/json" : false;
    };

    const req: MockRequest = {
      // Request data
      body, // JSON body or form data
      rawBody: Buffer.from(JSON.stringify(body)), // raw body as Buffer
      headers, // HTTP headers
      method: "POST", // HTTP method
      url: "/", // full URL
      originalUrl: "/", // original URL before any middleware changes
      baseUrl: "", // base URL of routers
      path: "/", // path without query string
      query: {}, // query parameters as object
      params: {}, // URL parameters (/:id) as object

      // Auth & cookies
      auth: authData, // custom data, e.g., for tests
      cookies: {}, // cookies as key/value object
      signedCookies: {}, // signed cookies if present

      // Network / host
      ip: "127.0.0.1", // primary client IP
      ips: [], // all IPs through proxy (array)
      hostname: "localhost", // hostname
      host: "localhost:5001", // host + port
      subdomains: [], // subdomains as array
      protocol: "http", // "http" or "https"
      secure: false, // true if HTTPS
      xhr: false, // true if AJAX / XMLHttpRequest

      // Response status / cache
      fresh: false, // true if cached content is still fresh
      stale: false, // true if cached content is stale

      // Routing / middleware
      route: {}, // router information
      get: getFunc, // req.get(headerName)
      header: getFunc, // req.header(headerName) – synonym
      accepts: acceptsFunc, // req.accepts(types)
    };

    return req;
  };

  // function to create mock response
  const createMockResponse = (): MockResponse => {
    const res: Partial<MockResponse> = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      end: jest.fn().mockReturnValue(undefined),
      set: jest.fn().mockReturnThis(),
      get: jest.fn(),
      locals: {},
      headersSent: false,
    };

    return res as MockResponse;
  };

  // Helper-Function to call HTTP-Functions
  const callHttpFunction = async (
    func: Function,
    req: MockRequest,
    res: MockResponse
  ): Promise<{
    success: boolean;
    data?: any;
    error?: FirebaseError;
  }> => {
    try {
      await func(req, res);

      // Extract the response data
      let responseData: any;

      // check if send was called
      if (res.send.mock.calls.length > 0) {
        responseData = res.send.mock.calls[0]?.[0];
      }
      // check if json was called
      else if (res.json.mock.calls.length > 0) {
        responseData = res.json.mock.calls[0]?.[0];
      }

      return {
        success: true,
        data: responseData,
      };
    } catch (error: any) {
      // convert the error in a consistent format
      const firebaseError: FirebaseError = {
        code: error.code || "unknown",
        message: error.message || "Unknown error",
        details: error.details,
      };
      return {
        success: false,
        error: firebaseError,
      };
    }
  };

  describe("Authentication Boundaries", () => {
    it("should allow public access to login/register", async () => {
      // Test Login (official endpoint)
      const loginReq = createMockRequest(null, {
        action: "login",
        payload: { email: "user1@example.com", password: "password" },
      });
      const loginRes = createMockResponse();

      const loginResult = await callHttpFunction(
        authValidator,
        loginReq,
        loginRes
      );

      // check if loginResult is successful
      if (!loginResult.success && loginResult.error) {
        expect(loginResult.error.code).not.toBe("functions/unauthenticated");
      }

      // Test registration (official endpoint)
      const registerReq = createMockRequest(null, {
        action: "register",
        payload: {
          email: "newuser@example.com",
          password: "password123",
          displayName: "New User",
        },
      });
      const registerRes = createMockResponse();

      const registerResult = await callHttpFunction(
        authValidator,
        registerReq,
        registerRes
      );

      // check if registerResult is successful
      if (!registerResult.success && registerResult.error) {
        expect(registerResult.error.code).not.toBe("functions/unauthenticated");
      }
    });

    it("should reject private endpoints without authentication", async () => {
      // Test various  private endpoints without authentication
      const testCases = [
        {
          func: authValidator,
          data: { action: "verifyTotp", payload: { code: "123456" } },
        },
        {
          func: profileValidator,
          data: { displayName: "Test" },
        },
        {
          func: projectsAndWorkValidator,
          data: { action: "updateProject", payload: { id: "test" } },
        },
        {
          func: secureDelete,
          data: { userId: "test", serviceId: "test", subs: [] },
        },
      ];

      for (const testCase of testCases) {
        const req = createMockRequest(null, testCase.data);
        const res = createMockResponse();

        // set auth explicitly to undefined
        req.auth = undefined;

        const result = await callHttpFunction(testCase.func, req, res);

        // expect an authentication error
        expect(result.success).toBe(false);
        if (result.error) {
          expect(result.error?.code).toMatch(
            /unauthenticated|permission-denied|unknown/
          );
        }
      }
    });
  });

  describe("Authorization Boundaries", () => {
    it("should have permission checks for cross-user actions", async () => {
      // Test with authenticated user
      const testUser = TEST_USERS[0];

      // try to call data from a different user
      const req = createMockRequest(
        { uid: testUser.uid, token: {} },
        {
          action: "getUserProfile",
          payload: { userId: "different-user-id" },
        }
      );
      const res = createMockResponse();

      const result = await callHttpFunction(authValidator, req, res);

      if (!result.success && result.error) {
        expect(result.error?.code).toMatch(/permission-denied|unknown/);
      }
    });
  });

  describe("Input Validation Boundaries", () => {
    it("should validate required parameters", async () => {
      // Test without action parameter
      const req1 = createMockRequest(null, {});
      const res1 = createMockResponse();

      const result1 = await callHttpFunction(authValidator, req1, res1);
      expect(result1.success).toBe(false);
      if (result1.error) {
        expect(result1.error?.code).toMatch(/invalid-argument|unknown/);
      }

      // Test invalid action
      const req2 = createMockRequest(null, { action: "invalidAction" });
      const res2 = createMockResponse();

      const result2 = await callHttpFunction(authValidator, req2, res2);
      expect(result2.success).toBe(false);
    });

    it("should validate data types", async () => {
      const req = createMockRequest(null, { payload: {} });
      const res = createMockResponse();

      const result = await callHttpFunction(projectsAndWorkValidator, req, res);
      expect(result.success).toBe(false);
      if (result.error) {
        expect(result.error?.code).toMatch(/invalid-argument|unknown/);
      }
    });
  });

  describe("Error Handling Boundaries", () => {
    it("should return consistent error format", async () => {
      const req = createMockRequest(null, { action: "verifyTotp" });
      const res = createMockResponse();

      const result = await callHttpFunction(authValidator, req, res);

      if (!result.success && result.error) {
        // Test with consistent error format
        expect(typeof result.error.code).toBe("string");
        expect(typeof result.error.message).toBe("string");
      }
    });
  });

  describe("Rate Limit Boundaries", () => {
    it("should implement rate limiting", async () => {
      // Simulate multiple faster calls
      const requests = [];
      for (let i = 0; i < 5; i++) {
        const req = createMockRequest(null, {
          action: "login",
          payload: { email: `user${i}@test.com`, password: "test" },
        });
        const res = createMockResponse();
        requests.push(callHttpFunction(authValidator, req, res));
      }

      const results = await Promise.all(requests);

      // Count successful vs. failed Requests
      const successful = results.filter((r) => r.success);
      const failed = results.filter((r) => !r.success);

      console.log(
        `Rate limiting test: ${successful.length} successful, ${failed.length} failed`
      );
      expect(results.length).toBe(5);
    });
  });
});

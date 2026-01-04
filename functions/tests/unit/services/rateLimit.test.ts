////////////////////////// rateLimit.unit.ts /////////////////////////////////

// This file contains the unit tests for the RateLimiter class.

//////////////////////////////////////////////////////////////////////////////

import * as admin from "firebase-admin";

import { RateLimiter } from "../../../src/utils/rateLimit";
import { RateLimitError } from "../../../src/errors/domain.errors";

//////////////////////////////////////////////////////////////////////////////

// mock firebase-admin
jest.mock("firebase-admin", () => {
  const mockFirestore = {
    collection: jest.fn(),
    runTransaction: jest.fn(),
  };

  return {
    apps: [],
    firestore: jest.fn(() => mockFirestore),
    initializeApp: jest.fn(),
  };
});

describe("RateLimiter Unit Tests", () => {
  let rateLimiterInstance: RateLimiter;
  let mockDb: any;
  let mockCollection: any;
  let mockDoc: any;

  beforeEach(() => {
    mockDoc = {
      get: jest.fn(),
      set: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    mockCollection = jest.fn(() => ({
      doc: jest.fn(() => mockDoc),
    }));

    mockDb = {
      collection: mockCollection,
      runTransaction: jest.fn(async (callback) => {
        const transaction = {
          get: mockDoc.get,
          set: (_docRef: any, data: any) => mockDoc.set(data),
          update: (_docRef: any, data: any) => mockDoc.update(data),
        };
        return callback(transaction);
      }),
    };

    const mockFirestore = admin.firestore as jest.MockedFunction<
      typeof admin.firestore
    >;
    mockFirestore.mockReturnValue(mockDb as any);

    rateLimiterInstance = new RateLimiter();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("checkLimit", () => {
    it("should create new record on first request", async () => {
      const now = Date.now();
      jest.spyOn(Date, "now").mockReturnValue(now);

      mockDoc.get.mockResolvedValue({ exists: false });

      await rateLimiterInstance.checkLimit("user123", "login", 5, 60000);

      expect(mockDb.runTransaction).toHaveBeenCalled();
      expect(mockDoc.set).toHaveBeenCalledWith({
        count: 1,
        resetAt: expect.any(Object),
        firstAttempt: expect.any(Object),
        lastAttempt: expect.any(Object),
        uid: "user123",
        action: "login",
      });
    });

    it("should increment count within window", async () => {
      const now = Date.now();
      jest.spyOn(Date, "now").mockReturnValue(now);

      mockDoc.get.mockResolvedValue({
        exists: true,
        data: () => ({
          count: 2,
          resetAt: { toMillis: () => now + 30000 },
        }),
      });

      await rateLimiterInstance.checkLimit("user123", "login", 5, 60000);

      expect(mockDoc.update).toHaveBeenCalledWith({
        count: 3,
        lastAttempt: expect.any(Object),
      });
    });

    it("should reset after window expires", async () => {
      const now = Date.now();
      jest.spyOn(Date, "now").mockReturnValue(now);

      mockDoc.get.mockResolvedValue({
        exists: true,
        data: () => ({
          count: 5,
          resetAt: { toMillis: () => now - 1000 },
        }),
      });

      await rateLimiterInstance.checkLimit("user123", "login", 5, 60000);

      expect(mockDoc.set).toHaveBeenCalledWith({
        count: 1,
        resetAt: expect.any(Object),
        firstAttempt: expect.any(Object),
        lastAttempt: expect.any(Object),
        uid: "user123",
        action: "login",
      });
    });

    it("should throw RateLimitError when limit exceeded", async () => {
      const now = Date.now();
      jest.spyOn(Date, "now").mockReturnValue(now);

      mockDoc.get.mockResolvedValue({
        exists: true,
        data: () => ({
          count: 5,
          resetAt: { toMillis: () => now + 30000 },
        }),
      });

      await expect(
        rateLimiterInstance.checkLimit("user123", "login", 5, 60000)
      ).rejects.toThrow(RateLimitError);

      expect(mockDoc.update).not.toHaveBeenCalled();
    });

    it("should handle transaction errors gracefully", async () => {
      mockDb.runTransaction.mockRejectedValue(new Error("Database error"));

      // Should not throw, allows request to proceed
      await expect(
        rateLimiterInstance.checkLimit("user123", "login", 5, 60000)
      ).resolves.not.toThrow();
    });
  });

  describe("getRemainingAttempts", () => {
    it("should return max attempts for non-existent record", async () => {
      mockDoc.get.mockResolvedValue({ exists: false });
      const remaining = await rateLimiterInstance.getRemainingAttempts(
        "user123",
        "login"
      );

      expect(remaining).toBeGreaterThan(0);
    });

    it("should calculate remaining attempts", async () => {
      const now = Date.now();
      jest.spyOn(Date, "now").mockReturnValue(now);

      mockDoc.get.mockResolvedValue({
        exists: true,
        data: () => ({
          count: 3,
          resetAt: { toMillis: () => now + 30000 },
        }),
      });

      const remaining = await rateLimiterInstance.getRemainingAttempts(
        "user123",
        "login",
        10 // maxAttempts
      );

      expect(remaining).toBe(7); // 10 - 3 = 7 Attempts remaining
    });
    it("should return max attempts when window expired", async () => {
      const now = Date.now();
      jest.spyOn(Date, "now").mockReturnValue(now);

      mockDoc.get.mockResolvedValue({
        exists: true,
        data: () => ({
          count: 5,
          resetAt: { toMillis: () => now - 1000 },
        }),
      });

      const remaining = await rateLimiterInstance.getRemainingAttempts(
        "user123",
        "login"
      );

      // If window expired, should returns the default-value.
      expect(remaining).toBeGreaterThan(0);
    });
  });

  describe("resetLimit", () => {
    it("should delete rate limit record", async () => {
      await rateLimiterInstance.resetLimit("user123", "login");

      expect(mockDoc.delete).toHaveBeenCalled();
    });
  });
});

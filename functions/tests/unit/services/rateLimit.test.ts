////////////////////////// rateLimit.unit.ts /////////////////////////////////

// This file contains the unit tests for the RateLimiter class.

//////////////////////////////////////////////////////////////////////////////

import { RateLimitError } from "../../../src/errors/domain.errors";

//////////////////////////////////////////////////////////////////////////////

// define mocks before doMock to avoid hoisting issues
const mockDoc = {
  get: jest.fn(),
  set: jest.fn(),
  update: jest.fn(),
  delete: jest.fn().mockResolvedValue(undefined),
};

const mockCollection = jest.fn().mockReturnValue({
  doc: jest.fn().mockReturnValue(mockDoc),
});

const mockRunTransaction = jest.fn();

const mockFirestore = {
  collection: mockCollection,
  runTransaction: mockRunTransaction,
};
// ------------------------------------------------

// firebase-admin with doMock (not hoisted)
jest.doMock("firebase-admin", () => ({
  apps: [],
  firestore: jest.fn(() => mockFirestore),
  initializeApp: jest.fn(),
}));

// Helpclass for Timestamp-Mocking
class MockTimestamp {
  constructor(
    private seconds: number,
    private nanoseconds: number,
  ) {}
  toMillis() {
    return this.seconds * 1000 + this.nanoseconds / 1_000_000;
  }
  static fromMillis(millis: number) {
    return new MockTimestamp(
      Math.floor(millis / 1000),
      (millis % 1000) * 1_000_000,
    );
  }
}

jest.doMock("firebase-admin/firestore", () => ({
  Timestamp: {
    fromMillis: (millis: number) => MockTimestamp.fromMillis(millis),
  },
}));

// mock logger to avoid side effects and allow assertions
jest.doMock("../../../src/utils/logger", () => ({
  logEvent: jest.fn(),
}));

// import testing dependencies after mocks
import { RateLimiter } from "../../../src/utils/rateLimit";

describe("RateLimiter Unit Tests", () => {
  let rateLimiter: RateLimiter;

  beforeEach(() => {
    jest.clearAllMocks();
    rateLimiter = new RateLimiter();
  });

  describe("checkLimit", () => {
    it("should create new record on first request", async () => {
      const now = Date.now();
      jest.spyOn(Date, "now").mockReturnValue(now);

      mockDoc.get.mockResolvedValue({ exists: false });

      mockRunTransaction.mockImplementation(async (callback: any) => {
        const transaction = {
          get: mockDoc.get,
          set: (ref: any, data: any) => mockDoc.set(data),
          update: (ref: any, data: any) => mockDoc.update(data),
        };
        await callback(transaction);
      });

      await rateLimiter.checkLimit("user123", "login", 5, 60000);

      expect(mockRunTransaction).toHaveBeenCalled();
      expect(mockDoc.set).toHaveBeenCalledWith({
        tokens: 4,
        capacity: 5,
        refillRatePerMs: 5 / 60000,
        lastRefill: expect.any(MockTimestamp),
        resetAt: expect.any(MockTimestamp),
        failCount: 0,
        blockedUntil: null,
        count: 1,
      });
    });

    it("should increment count within window", async () => {
      const now = Date.now();
      jest.spyOn(Date, "now").mockReturnValue(now);

      mockDoc.get.mockResolvedValue({
        exists: true,
        data: () => ({
          tokens: 3,
          capacity: 5,
          refillRatePerMs: 5 / 60000,
          lastRefill: MockTimestamp.fromMillis(now),
          resetAt: MockTimestamp.fromMillis(now + 50000),
          failCount: 0,
          blockedUntil: null,
          count: 2,
        }),
      });

      mockRunTransaction.mockImplementation(async (callback: any) => {
        const transaction = {
          get: mockDoc.get,
          set: (ref: any, data: any) => mockDoc.set(data),
          update: (ref: any, data: any) => mockDoc.update(data),
        };
        await callback(transaction);
      });

      await rateLimiter.checkLimit("user123", "login", 5, 60000);

      expect(mockDoc.update).toHaveBeenCalledWith({
        tokens: 2,
        lastRefill: expect.any(MockTimestamp),
        resetAt: expect.any(MockTimestamp),
        failCount: 0,
        blockedUntil: null,
        count: 3,
        lastAttempt: expect.any(MockTimestamp),
      });
    });

    it("should refill tokens after window expires", async () => {
      const now = Date.now();
      jest.spyOn(Date, "now").mockReturnValue(now);

      mockDoc.get.mockResolvedValue({
        exists: true,
        data: () => ({
          tokens: 0,
          capacity: 5,
          refillRatePerMs: 5 / 60000,
          lastRefill: MockTimestamp.fromMillis(now - 70000),
          resetAt: MockTimestamp.fromMillis(now - 10000),
          failCount: 3,
          blockedUntil: null,
          count: 5,
        }),
      });

      mockRunTransaction.mockImplementation(async (callback: any) => {
        const transaction = {
          get: mockDoc.get,
          set: (ref: any, data: any) => mockDoc.set(data),
          update: (ref: any, data: any) => mockDoc.update(data),
        };
        await callback(transaction);
      });

      await rateLimiter.checkLimit("user123", "login", 5, 60000);

      // await an update not a set, because doc already exists
      expect(mockDoc.update).toHaveBeenCalledWith({
        tokens: 4,
        lastRefill: expect.any(MockTimestamp),
        resetAt: expect.any(MockTimestamp),
        failCount: 0,
        blockedUntil: null,
        count: 6,
        lastAttempt: expect.any(MockTimestamp),
      });
      expect(mockDoc.set).not.toHaveBeenCalled();
    });

    it("should throw RateLimitError when limit exceeded", async () => {
      const now = Date.now();
      jest.spyOn(Date, "now").mockReturnValue(now);

      mockDoc.get.mockResolvedValue({
        exists: true,
        data: () => ({
          tokens: 0,
          capacity: 5,
          refillRatePerMs: 5 / 60000,
          lastRefill: MockTimestamp.fromMillis(now - 1000),
          resetAt: MockTimestamp.fromMillis(now + 59000),
          failCount: 2,
          blockedUntil: null,
          count: 5,
        }),
      });

      mockRunTransaction.mockImplementation(async (callback: any) => {
        const transaction = {
          get: mockDoc.get,
          set: (ref: any, data: any) => mockDoc.set(data),
          update: (ref: any, data: any) => mockDoc.update(data),
        };
        await expect(callback(transaction)).rejects.toThrow(RateLimitError);
        throw new RateLimitError("Too many attempts");
      });

      await expect(
        rateLimiter.checkLimit("user123", "login", 5, 60000),
      ).rejects.toThrow(RateLimitError);

      expect(mockDoc.update).toHaveBeenCalledWith(
        expect.objectContaining({
          failCount: 3,
          blockedUntil: expect.any(MockTimestamp),
        }),
      );
    });

    it("should fail-closed for uid on transaction error", async () => {
      mockRunTransaction.mockRejectedValue(new Error("Database error"));

      await expect(
        rateLimiter.checkLimit("user123", "login", 5, 60000),
      ).rejects.toThrow(RateLimitError);

      const { logEvent } = require("../../../src/utils/logger");
      expect(logEvent).toHaveBeenCalledWith(
        "ratelimit-transaction-failure",
        "error",
        expect.objectContaining({ error: "Database error" }),
      );
    });
  });

  describe("getRemainingAttempts", () => {
    it("should return max attempts for non-existent record", async () => {
      mockDoc.get.mockResolvedValue({ exists: false });

      const remaining = await rateLimiter.getRemainingAttempts(
        "user123",
        "login",
        5,
      );
      expect(remaining).toBe(5);
    });

    it("should calculate remaining attempts", async () => {
      const now = Date.now();
      jest.spyOn(Date, "now").mockReturnValue(now);

      mockDoc.get.mockResolvedValue({
        exists: true,
        data: () => ({
          count: 3,
          resetAt: MockTimestamp.fromMillis(now + 30000),
        }),
      });

      const remaining = await rateLimiter.getRemainingAttempts(
        "user123",
        "login",
        10,
      );
      expect(remaining).toBe(7);
    });

    it("should return max attempts when window expired", async () => {
      const now = Date.now();
      jest.spyOn(Date, "now").mockReturnValue(now);

      mockDoc.get.mockResolvedValue({
        exists: true,
        data: () => ({
          count: 5,
          resetAt: MockTimestamp.fromMillis(now - 1000),
        }),
      });

      const remaining = await rateLimiter.getRemainingAttempts(
        "user123",
        "login",
        5,
      );
      expect(remaining).toBe(5);
    });
  });

  describe("resetLimit", () => {
    it("should delete rate limit record", async () => {
      mockCollection.mockReturnValueOnce({
        doc: jest.fn().mockReturnValue({
          delete: mockDoc.delete,
        }),
      });

      await rateLimiter.resetLimit("user123", "login");

      expect(mockDoc.delete).toHaveBeenCalled();
    });
  });

  describe("checkIP", () => {
    it("should allow requests under the limit", async () => {
      const ip = "123.123.123.123";
      mockDoc.get.mockResolvedValue({ exists: false });

      mockRunTransaction.mockImplementation(async (callback: any) => {
        const transaction = {
          get: mockDoc.get,
          set: (ref: any, data: any) => mockDoc.set(data),
          update: (ref: any, data: any) => mockDoc.update(data),
        };
        await callback(transaction);
      });

      await rateLimiter.checkIP(ip, "login", 3, 10000);

      expect(mockDoc.set).toHaveBeenCalledWith(
        expect.objectContaining({
          capacity: 3,
          tokens: 2,
        }),
      );
    });

    it("should throw RateLimitError when IP exceeds limit", async () => {
      const ip = "123.123.123.123";
      const now = Date.now();
      jest.spyOn(Date, "now").mockReturnValue(now);

      mockDoc.get.mockResolvedValue({
        exists: true,
        data: () => ({
          tokens: 0,
          capacity: 3,
          refillRatePerMs: 3 / 10000,
          lastRefill: MockTimestamp.fromMillis(now - 1000),
          resetAt: MockTimestamp.fromMillis(now + 9000),
          failCount: 0,
          blockedUntil: null,
          count: 3,
        }),
      });

      mockRunTransaction.mockImplementation(async (callback: any) => {
        const transaction = {
          get: mockDoc.get,
          set: (ref: any, data: any) => mockDoc.set(data),
          update: (ref: any, data: any) => mockDoc.update(data),
        };
        await expect(callback(transaction)).rejects.toThrow(RateLimitError);
        throw new RateLimitError("Too many attempts");
      });

      await expect(rateLimiter.checkIP(ip, "login", 3, 10000)).rejects.toThrow(
        RateLimitError,
      );
    });

    it("should fail-open for IP on transaction error", async () => {
      mockRunTransaction.mockRejectedValue(new Error("Database error"));

      await expect(
        rateLimiter.checkIP("123.123.123.123", "login", 5, 60000),
      ).resolves.toBeUndefined();
    });
  });

  describe("checkDevice", () => {
    it("should allow known device under limit", async () => {
      const deviceId = "known-device-01";
      mockDoc.get.mockResolvedValue({ exists: false });

      mockRunTransaction.mockImplementation(async (callback: any) => {
        const transaction = {
          get: mockDoc.get,
          set: (ref: any, data: any) => mockDoc.set(data),
          update: (ref: any, data: any) => mockDoc.update(data),
        };
        await callback(transaction);
      });

      await rateLimiter.checkDevice(deviceId, "login", 5, 10000, {
        strict: false,
      });

      expect(mockDoc.set).toHaveBeenCalledWith(
        expect.objectContaining({ capacity: 5 }),
      );
    });

    it("should apply strict limit for unknown device", async () => {
      const deviceId = "unknown-device-01";
      mockDoc.get.mockResolvedValue({ exists: false });

      mockRunTransaction.mockImplementation(async (callback: any) => {
        const transaction = {
          get: mockDoc.get,
          set: (ref: any, data: any) => mockDoc.set(data),
          update: (ref: any, data: any) => mockDoc.update(data),
        };
        await callback(transaction);
      });

      await rateLimiter.checkDevice(deviceId, "login", 2, 10000, {
        strict: true,
      });

      // if strict: true and maxAttempts=2 → capacity = max(1, floor(2/2)) = 1
      expect(mockDoc.set).toHaveBeenCalledWith(
        expect.objectContaining({ capacity: 1 }),
      );
    });

    it("should throw RateLimitError when device exceeds limit", async () => {
      const deviceId = "unknown-device-01";
      const now = Date.now();
      jest.spyOn(Date, "now").mockReturnValue(now);

      mockDoc.get.mockResolvedValue({
        exists: true,
        data: () => ({
          tokens: 0,
          capacity: 2,
          refillRatePerMs: 2 / 10000,
          lastRefill: MockTimestamp.fromMillis(now - 1000),
          resetAt: MockTimestamp.fromMillis(now + 9000),
          failCount: 0,
          blockedUntil: null,
          count: 2,
        }),
      });

      mockRunTransaction.mockImplementation(async (callback: any) => {
        const transaction = {
          get: mockDoc.get,
          set: (ref: any, data: any) => mockDoc.set(data),
          update: (ref: any, data: any) => mockDoc.update(data),
        };
        await expect(callback(transaction)).rejects.toThrow(RateLimitError);
        throw new RateLimitError("Too many attempts");
      });

      await expect(
        rateLimiter.checkDevice(deviceId, "login", 2, 10000, { strict: true }),
      ).rejects.toThrow(RateLimitError);
    });

    it("should fail-open for device on transaction error", async () => {
      mockRunTransaction.mockRejectedValue(new Error("Database error"));

      await expect(
        rateLimiter.checkDevice("device-01", "login", 5, 60000),
      ).resolves.toBeUndefined();
    });
  });
});

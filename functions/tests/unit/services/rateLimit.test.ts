////////////////////////// rateLimit.unit.ts /////////////////////////////////

// Unit tests for RateLimiter class with fully mocked Firestore
///////////////////////////////////////////////////////////////////////////////

import { RateLimitError } from "../../../src/errors/domain.errors";

// -------------------- Firestore & Jest Mocks --------------------

const createMockDoc = (): any => {
  const doc: any = {};
  doc.collection = jest.fn(() => doc);
  doc.doc = jest.fn(() => doc);
  doc.get = jest.fn();
  doc.set = jest.fn().mockResolvedValue(undefined);
  doc.update = jest.fn().mockResolvedValue(undefined);
  doc.delete = jest.fn().mockResolvedValue(undefined);
  return doc;
};

const mockFirestoreDoc = createMockDoc();

const mockFirestore = {
  collection: jest.fn(() => mockFirestoreDoc),
  runTransaction: jest.fn(),
};

jest.doMock("firebase-admin", () => ({
  apps: [],
  firestore: jest.fn(() => mockFirestore),
  initializeApp: jest.fn(),
}));

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

jest.doMock("../../../src/utils/logger", () => ({
  logEvent: jest.fn(),
}));

// -------------------- Import After Mocks --------------------
import { RateLimiter } from "../../../src/utils/rateLimit";

// -------------------- Helper for Transactions --------------------
const runTransaction = async (callback: any) => {
  await callback({
    get: mockFirestoreDoc.get,
    set: mockFirestoreDoc.set,
    update: mockFirestoreDoc.update,
  });
};

// -------------------- Test Suite --------------------
describe("RateLimiter Unit Tests", () => {
  let rateLimiter: RateLimiter;

  beforeEach(() => {
    jest.clearAllMocks();
    rateLimiter = new RateLimiter();
  });

  // -------------------- checkLimit --------------------
  describe("checkLimit", () => {
    it("should create new record on first request", async () => {
      const now = Date.now();
      jest.spyOn(Date, "now").mockReturnValue(now);
      mockFirestoreDoc.get.mockResolvedValue({ exists: false });
      mockFirestore.runTransaction.mockImplementation(runTransaction);

      await rateLimiter.checkLimit("user123", "login", 5, 60000);

      expect(mockFirestore.runTransaction).toHaveBeenCalled();

      // check that will call set with correct data
      expect(mockFirestoreDoc.set).toHaveBeenCalledWith(
        expect.anything(), // DocumentReference
        expect.objectContaining({ tokens: 4, capacity: 5 }),
      );
    });

    it("should increment count within window", async () => {
      const now = Date.now();
      jest.spyOn(Date, "now").mockReturnValue(now);
      mockFirestoreDoc.get.mockResolvedValue({
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
      mockFirestore.runTransaction.mockImplementation(runTransaction);

      await rateLimiter.checkLimit("user123", "login", 5, 60000);

      expect(mockFirestoreDoc.update).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ tokens: 2, count: 3 }),
      );
    });

    it("should refill tokens after window expires", async () => {
      const now = Date.now();
      jest.spyOn(Date, "now").mockReturnValue(now);
      mockFirestoreDoc.get.mockResolvedValue({
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
      mockFirestore.runTransaction.mockImplementation(runTransaction);

      await rateLimiter.checkLimit("user123", "login", 5, 60000);
      expect(mockFirestoreDoc.update).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ tokens: 4, count: 6 }),
      );
    });

    it("should throw RateLimitError when limit exceeded", async () => {
      const now = Date.now();
      jest.spyOn(Date, "now").mockReturnValue(now);
      mockFirestoreDoc.get.mockResolvedValue({
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

      mockFirestore.runTransaction.mockImplementation(async (callback: any) => {
        await expect(
          callback({
            get: mockFirestoreDoc.get,
            set: mockFirestoreDoc.set,
            update: mockFirestoreDoc.update,
          }),
        ).rejects.toThrow(RateLimitError);
        throw new RateLimitError("Too many attempts");
      });

      await expect(
        rateLimiter.checkLimit("user123", "login", 5, 60000),
      ).rejects.toThrow(RateLimitError);
    });

    it("should fail-closed for uid on transaction error", async () => {
      mockFirestore.runTransaction.mockRejectedValue(
        new Error("Database error"),
      );
      await expect(
        rateLimiter.checkLimit("user123", "login", 5, 60000),
      ).rejects.toThrow(RateLimitError);
    });
  });

  // -------------------- getRemainingAttempts --------------------
  describe("getRemainingAttempts", () => {
    it("should return max attempts for non-existent record", async () => {
      mockFirestoreDoc.get.mockResolvedValue({ exists: false });
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
      mockFirestoreDoc.get.mockResolvedValue({
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
      mockFirestoreDoc.get.mockResolvedValue({
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

  // -------------------- resetLimit --------------------
  describe("resetLimit", () => {
    it("should delete rate limit record", async () => {
      await rateLimiter.resetLimit("uid", "user123", "login");
      expect(mockFirestoreDoc.delete).toHaveBeenCalled();
    });
  });

  // -------------------- checkIP --------------------
  describe("checkIP", () => {
    it("should allow requests under the limit", async () => {
      const ip = "123.123.123.123";
      mockFirestoreDoc.get.mockResolvedValue({ exists: false });
      mockFirestore.runTransaction.mockImplementation(runTransaction);

      await rateLimiter.checkIP(ip, "login", 3, 10000);
      // check set-call with correct data (capacity should be 3, tokens should be 2)
      expect(mockFirestoreDoc.set).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ tokens: 2, capacity: 3 }),
      );
    });

    it("should throw RateLimitError when IP exceeds limit", async () => {
      const ip = "123.123.123.123";
      const now = Date.now();
      jest.spyOn(Date, "now").mockReturnValue(now);
      mockFirestoreDoc.get.mockResolvedValue({
        exists: true,
        data: () => ({ tokens: 0, capacity: 3 }),
      });
      mockFirestore.runTransaction.mockImplementation(async (callback: any) => {
        await expect(
          callback({
            get: mockFirestoreDoc.get,
            set: mockFirestoreDoc.set,
            update: mockFirestoreDoc.update,
          }),
        ).rejects.toThrow(RateLimitError);
        throw new RateLimitError("Too many attempts");
      });

      await expect(rateLimiter.checkIP(ip, "login", 3, 10000)).rejects.toThrow(
        RateLimitError,
      );
    });

    it("should fail-open for IP on transaction error", async () => {
      mockFirestore.runTransaction.mockRejectedValue(
        new Error("Database error"),
      );
      await expect(
        rateLimiter.checkIP("123.123.123.123", "login", 5, 60000),
      ).resolves.toBeUndefined();
    });
  });

  // -------------------- checkDevice --------------------
  describe("checkDevice", () => {
    it("should allow known device under limit", async () => {
      const deviceId = "known-device-01";
      mockFirestoreDoc.get.mockResolvedValue({ exists: false });
      mockFirestore.runTransaction.mockImplementation(runTransaction);

      await rateLimiter.checkDevice(deviceId, "login", 5, 10000, {
        strict: false,
      });
      // check set-call with correct data (capacity should be 5, tokens should be 4)
      expect(mockFirestoreDoc.set).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ tokens: 4, capacity: 5 }),
      );
    });

    it("should apply strict limit for unknown device", async () => {
      const deviceId = "unknown-device-01";
      mockFirestoreDoc.get.mockResolvedValue({ exists: false });
      mockFirestore.runTransaction.mockImplementation(runTransaction);

      await rateLimiter.checkDevice(deviceId, "login", 2, 10000, {
        strict: true,
      });
      // strict minimizes capacity to 1 for unknown devices, so check that set is called with capacity 1 and tokens 0
      expect(mockFirestoreDoc.set).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ tokens: 0, capacity: 1 }),
      );
    });

    it("should throw RateLimitError when device exceeds limit", async () => {
      const now = Date.now();
      jest.spyOn(Date, "now").mockReturnValue(now);
      mockFirestoreDoc.get.mockResolvedValue({
        exists: true,
        data: () => ({ tokens: 0, capacity: 2 }),
      });
      mockFirestore.runTransaction.mockImplementation(async (callback: any) => {
        await expect(
          callback({
            get: mockFirestoreDoc.get,
            set: mockFirestoreDoc.set,
            update: mockFirestoreDoc.update,
          }),
        ).rejects.toThrow(RateLimitError);
        throw new RateLimitError("Too many attempts");
      });

      await expect(
        rateLimiter.checkDevice("unknown-device-01", "login", 2, 10000, {
          strict: true,
        }),
      ).rejects.toThrow(RateLimitError);
    });

    it("should fail-open for device on transaction error", async () => {
      mockFirestore.runTransaction.mockRejectedValue(
        new Error("Database error"),
      );
      await expect(
        rateLimiter.checkDevice("device-01", "login", 5, 60000),
      ).resolves.toBeUndefined();
    });
  });
});

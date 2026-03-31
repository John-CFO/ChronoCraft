///////////////////////////////// rateLimit.unit.ts //////////////////////////////////

// This file contains unit tests for rateLimit.ts and rateLimitHelpers.ts

//////////////////////////////////////////////////////////////////////////////////////

import {
  RateLimiter,
  refillTokens,
  calculatePenalty,
  Scope,
  Clock,
} from "../../../src/utils/rateLimit";
import { RateLimitError } from "../../../src/errors/domain.errors";
import { hashRateLimitId } from "../../../src/utils/rateLimitKey";

//////////////////////////////////////////////////////////////////////////////////////

// Silence console logging to keep unit test output clean
beforeEach(() => {
  jest.spyOn(console, "info").mockImplementation(() => {});
  jest.spyOn(console, "warn").mockImplementation(() => {});
  jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

// ---- Test HMAC Key (deterministic!) ----
const TEST_RATE_LIMIT_HMAC_KEY = "unit-test-rate-limit-key";

// ---- Mock Clock ----
class MockClock implements Clock {
  private _now: number;
  constructor(now = 0) {
    this._now = now;
  }
  now() {
    return this._now;
  }
  advance(ms: number) {
    this._now += ms;
  }
}

// ---- Fake Firestore Ref ----
type FakeRef = {
  scope: Scope;
  hashedId: string;
  action: string;
};

// ---- Fake Store (HMAC-aware) ----
class FakeStore {
  public docs: Record<string, any> = {};

  private key(scope: Scope, hashedId: string, action: string) {
    return `${scope}:${hashedId}:${action}`;
  }

  private hash(id: string) {
    return hashRateLimitId(id, TEST_RATE_LIMIT_HMAC_KEY);
  }

  getRef(scope: Scope, id: string, action: string): FakeRef {
    return {
      scope,
      hashedId: this.hash(id),
      action,
    };
  }

  async getActionDoc(scope: Scope, id: string, action: string) {
    const ref = this.getRef(scope, id, action);
    return this.docs[this.key(ref.scope, ref.hashedId, ref.action)] ?? null;
  }

  async setActionDoc(scope: Scope, id: string, action: string, doc: any) {
    const ref = this.getRef(scope, id, action);
    this.docs[this.key(ref.scope, ref.hashedId, ref.action)] = doc;
  }

  async updateActionDoc(
    scope: Scope,
    id: string,
    action: string,
    patch: Partial<any>,
  ) {
    const ref = this.getRef(scope, id, action);
    const key = this.key(ref.scope, ref.hashedId, ref.action);
    if (!this.docs[key]) throw new Error("Doc not found");
    this.docs[key] = { ...this.docs[key], ...patch };
  }

  async deleteActionDoc(scope: Scope, id: string, action: string) {
    const ref = this.getRef(scope, id, action);
    delete this.docs[this.key(ref.scope, ref.hashedId, ref.action)];
  }

  async recursiveDelete(scope: Scope, id: string) {
    const hashedId = this.hash(id);
    for (const k of Object.keys(this.docs)) {
      if (k.startsWith(`${scope}:${hashedId}:`)) delete this.docs[k];
    }
  }

  async runTransaction<T>(cb: (tx: any) => Promise<T>): Promise<T> {
    const tx = {
      get: async (ref: FakeRef) => {
        const doc = this.docs[this.key(ref.scope, ref.hashedId, ref.action)];
        return doc ? { exists: true, data: () => doc } : { exists: false };
      },
      set: async (ref: FakeRef, doc: any) => {
        this.docs[this.key(ref.scope, ref.hashedId, ref.action)] = doc;
      },
      update: async (ref: FakeRef, patch: Partial<any>) => {
        const key = this.key(ref.scope, ref.hashedId, ref.action);
        if (!this.docs[key]) throw new Error("Doc not found");
        this.docs[key] = { ...this.docs[key], ...patch };
      },
    };
    return cb(tx);
  }
}

// ---- Pure helper tests ----
describe("RateLimiter helpers", () => {
  it("refillTokens adds tokens correctly", () => {
    const now = 1000;
    const res = refillTokens(2, 0, now, 0.001, 5);
    expect(res.tokens).toBeGreaterThan(2);
    expect(res.tokens).toBeLessThanOrEqual(5);
  });

  it("calculatePenalty caps at MAX_EXPONENT", () => {
    expect(calculatePenalty(1)).toBe(60_000);
    expect(calculatePenalty(10)).toBe(60_000 * 64);
  });
});

// ---- Core RateLimiter tests ----
describe("RateLimiter", () => {
  let clock: MockClock;
  let store: FakeStore;
  let limiter: RateLimiter;

  beforeEach(() => {
    clock = new MockClock(0);
    store = new FakeStore();
    limiter = new RateLimiter(store as any, clock);
  });

  it("allows first request for UID", async () => {
    await expect(limiter.checkLimit("user1", "login")).resolves.toBeUndefined();
    const doc = await store.getActionDoc("uid", "user1", "login");
    expect(doc).not.toBeNull();
  });

  it("throws RateLimitError when request is throttled", async () => {
    const now = clock.now();
    await store.setActionDoc("uid", "user1", "login", {
      tokens: 0,
      capacity: 1,
      refillRatePerMs: 0,
      lastRefill: { toMillis: () => now },
      failCount: 1,
    });

    await expect(
      limiter.checkLimit("user1", "login", 1, 1000),
    ).rejects.toBeInstanceOf(RateLimitError);
  });

  it("resets limits without throwing", async () => {
    await store.setActionDoc("uid", "user1", "login", { tokens: 0 });
    await expect(
      limiter.resetLimit("uid", "user1", "login"),
    ).resolves.toBeUndefined();
    const doc = await store.getActionDoc("uid", "user1", "login");
    expect(doc).toBeNull();
  });

  it("returns remaining attempts correctly", async () => {
    const now = clock.now();
    await store.setActionDoc("uid", "user1", "login", {
      tokens: 3,
      capacity: 5,
      refillRatePerMs: 0.001,
      lastRefill: { toMillis: () => now },
    });
    const remaining = await limiter.getRemainingAttempts(
      "user1",
      "login",
      5,
      "uid",
    );
    expect(remaining).toBeGreaterThan(0);
  });

  it("handles IP-missing gracefully", async () => {
    await expect(limiter.checkIP("", "login")).resolves.toBeUndefined();
  });

  it("handles fail-open for IP and device", async () => {
    store.runTransaction = async () => {
      throw new Error("TX failed");
    };
    await expect(limiter.checkIP("1.2.3.4", "login")).resolves.toBeUndefined();
    await expect(
      limiter.checkDevice("device1", "login"),
    ).resolves.toBeUndefined();
  });
});

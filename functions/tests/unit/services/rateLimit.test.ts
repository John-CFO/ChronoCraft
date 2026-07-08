/////////////////////////////// rateLimit.test.ts //////////////////////////////////

// Updated for new unified RateLimiter API (patched)

//////////////////////////////////////////////////////////////////////////////////////

// ---- mock firebase-admin BEFORE imports ----
jest.mock("firebase-admin", () => {
  return {
    apps: [],
    initializeApp: jest.fn(),
    firestore: () => ({
      runTransaction: async (cb: any) => {
        const tx = {
          get: async (ref: any) => {
            const doc = ref.__store[ref.key];
            return doc ? { exists: true, data: () => doc } : { exists: false };
          },
          set: async (ref: any, data: any) => {
            ref.__store[ref.key] = data;
          },
          update: async (ref: any, patch: any) => {
            if (!ref.__store[ref.key]) throw new Error("Doc not found");
            ref.__store[ref.key] = {
              ...ref.__store[ref.key],
              ...patch,
            };
          },
        };
        return cb(tx);
      },
    }),
  };
});

/////////////////////////////////////////////////////////////////////////////////////

import {
  RateLimiter,
  refillTokens,
  calculatePenalty,
  Clock,
} from "../../../src/utils/rateLimit";
import { RateLimitError } from "../../../src/errors/domain.errors";

//////////////////////////////////////////////////////////////////////////////////////

beforeEach(() => {
  jest.spyOn(console, "info").mockImplementation(() => {});
  jest.spyOn(console, "warn").mockImplementation(() => {});
  jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

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

// ---- Fake Store ----
class FakeStore {
  public docs: Record<string, any> = {};

  private makeKey(
    useCase: string,
    ip: string,
    device: string,
    action: string,
    uid: string,
  ) {
    return `${useCase}:${ip}:${device}:${action}:${uid}`;
  }

  getRef(
    useCase: string,
    ip: string,
    device: string,
    action: string,
    uid: string,
  ) {
    return {
      key: this.makeKey(useCase, ip, device, action, uid),
    } as any;
  }

  async runTransaction(cb: any) {
    const tx = {
      get: async (ref: any) => {
        const doc = this.docs[ref.key];

        return doc
          ? { exists: true, data: () => doc }
          : { exists: false, data: () => undefined };
      },

      set: (ref: any, data: any) => {
        this.docs[ref.key] = data;
      },

      update: (ref: any, patch: any) => {
        const existing = this.docs[ref.key];
        if (!existing) throw new Error("Doc not found");

        this.docs[ref.key] = {
          ...existing,
          ...patch,
        };
      },
    };

    return cb(tx);
  }

  async getActionDoc(
    useCase: string,
    ip: string,
    device: string,
    action: string,
    uid: string,
  ) {
    return this.docs[this.makeKey(useCase, ip, device, action, uid)] ?? null;
  }

  async setActionDoc(
    useCase: string,
    ip: string,
    device: string,
    action: string,
    uid: string,
    data: any,
  ) {
    this.docs[this.makeKey(useCase, ip, device, action, uid)] = data;
  }

  async updateActionDoc(
    useCase: string,
    ip: string,
    device: string,
    action: string,
    uid: string,
    data: any,
  ) {
    const key = this.makeKey(useCase, ip, device, action, uid);

    this.docs[key] = {
      ...(this.docs[key] ?? {}),
      ...data,
    };
  }

  async deleteActionDoc(
    useCase: string,
    ip: string,
    device: string,
    action: string,
    uid: string,
  ) {
    delete this.docs[this.makeKey(useCase, ip, device, action, uid)];
  }
}

// ---- Context ----
const ctx = {
  uid: "user1",
  ip: "1.2.3.4",
  deviceId: "device1",
};

// ---- Helper tests ----
describe("RateLimiter helpers", () => {
  it("refillTokens adds tokens correctly", () => {
    const now = 1000;
    const res = refillTokens(2, 0, now, 0.001, 5);
    expect(res.tokens).toBeGreaterThan(2);
    expect(res.tokens).toBeLessThanOrEqual(5);
  });

  it("calculatePenalty caps correctly", () => {
    expect(calculatePenalty(1)).toBe(60_000);
    expect(calculatePenalty(10)).toBe(60_000 * 64);
  });
});

// ---- Core tests ----
describe("RateLimiter", () => {
  let clock: MockClock;
  let store: FakeStore;
  let limiter: RateLimiter;

  beforeEach(() => {
    clock = new MockClock(0);
    store = new FakeStore();
    limiter = new RateLimiter(store as any, clock);
  });

  it("allows first request", async () => {
    await expect(
      limiter.check("mfa_totp", "login", ctx, {
        maxAttempts: 5,
        windowMs: 60_000,
      }),
    ).resolves.toBeUndefined();
  });

  it("throttles when no tokens left", async () => {
    const now = clock.now();

    await store.setActionDoc(
      "mfa_totp",
      ctx.ip,
      ctx.deviceId,
      "login",
      ctx.uid,
      {
        tokens: 0,
        capacity: 1,
        refillRatePerMs: 0,
        lastRefill: { toMillis: () => now },
        failCount: 1,
      },
    );

    await expect(
      limiter.check("mfa_totp", "login", ctx, {
        maxAttempts: 1,
        windowMs: 1000,
      }),
    ).rejects.toBeInstanceOf(RateLimitError);
  });

  it("returns remaining attempts", async () => {
    const now = clock.now();

    await store.setActionDoc(
      "mfa_totp",
      ctx.ip,
      ctx.deviceId,
      "login",
      ctx.uid,
      {
        tokens: 1,
        capacity: 5,
        refillRatePerMs: 0,
        lastRefill: { toMillis: () => clock.now() },
        failCount: 0,
      },
    );

    const remaining = await limiter.getRemainingAttempts(
      "mfa_totp",
      "login",
      ctx,
      5,
    );

    expect(remaining).toBeGreaterThan(0);
  });

  it("fails closed on transaction error", async () => {
    const admin = require("firebase-admin");

    store.runTransaction = async () => {
      throw new Error("TX failed");
    };

    await expect(
      limiter.check("mfa_totp", "login", ctx, {
        maxAttempts: 5,
        windowMs: 60_000,
      }),
    ).rejects.toBeInstanceOf(RateLimitError);
  });
});

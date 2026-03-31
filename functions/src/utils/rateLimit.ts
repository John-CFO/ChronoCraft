///////////////////////////////// rateLimit.ts //////////////////////////////////

import { Timestamp } from "firebase-admin/firestore";
import { logEvent } from "./logger";
import { RateLimitError } from "../errors/domain.errors";
import { RateLimitStore } from "./rateLimitStore";

// ---------- Clock abstraction ----------
export interface Clock {
  now(): number;
}

export class RealClock implements Clock {
  now(): number {
    return Date.now();
  }
}

// ---------- Scope & constants ----------
export type Scope = "uid" | "ip" | "device";

const BASE_PENALTY_MS = 60_000; // 60 seconds
const MAX_EXPONENT = 6; // 2^6 = 64x base

// ---------- Pure helpers ----------
export function refillTokens(
  tokens: number,
  lastRefill: number,
  now: number,
  rate: number,
  capacity: number,
): { tokens: number; lastRefill: number } {
  if (now <= lastRefill) return { tokens, lastRefill };
  const elapsed = now - lastRefill;
  const added = Math.floor(elapsed * rate);
  if (added === 0) return { tokens, lastRefill };

  const newTokens = Math.min(capacity, tokens + added);
  const timeForAdded = added / rate;
  return {
    tokens: newTokens,
    lastRefill: lastRefill + Math.floor(timeForAdded),
  };
}

export function calculatePenalty(failCount: number): number {
  const exponent = Math.min(failCount - 1, MAX_EXPONENT);
  return BASE_PENALTY_MS * Math.pow(2, exponent);
}

// ---------- Main RateLimiter ----------
export class RateLimiter {
  private store: RateLimitStore;
  private clock: Clock;

  constructor(store: RateLimitStore, clock?: Clock) {
    this.store = store;
    this.clock = clock || new RealClock();
  }

  // ----- Public API -----
  async checkLimit(
    uid: string,
    action: string,
    maxAttempts = 5,
    windowMs = 60_000,
  ) {
    return this.checkScope("uid", uid, action, maxAttempts, windowMs);
  }

  async checkIP(
    ip: string,
    action: string,
    maxAttempts = 30,
    windowMs = 10 * 60_000,
  ) {
    if (!ip) {
      logEvent("ip-missing", "warn", { action, ip });
      return;
    }
    return this.checkScope("ip", ip, action, maxAttempts, windowMs);
  }

  async checkDevice(
    deviceId: string,
    action: string,
    maxAttempts = 10,
    windowMs = 60_000,
    options?: { strict?: boolean },
  ) {
    const cap = options?.strict
      ? Math.max(1, Math.floor(maxAttempts / 2))
      : maxAttempts;
    return this.checkScope("device", deviceId, action, cap, windowMs);
  }

  async resetLimit(scope: Scope, id: string, action = "default") {
    await this.store.deleteActionDoc(scope, id, action).catch(() => {});
  }

  async resetAllLimitsForUser(uid: string) {
    const scopes: Scope[] = ["uid", "ip", "device"];
    for (const scope of scopes) {
      await this.store.recursiveDelete(scope, uid).catch(() => {});
    }
  }

  async getRemainingAttempts(
    id: string,
    action: string,
    maxAttempts = 5,
    scope: Scope = "uid",
  ): Promise<number> {
    const data = await this.store.getActionDoc(scope, id, action);
    const now = this.clock.now();

    if (!data) return maxAttempts;

    const blockedUntil = data.blockedUntil?.toMillis?.() ?? 0;
    if (blockedUntil > now) return 0;

    const capacity = data.capacity ?? maxAttempts;
    const rate = data.refillRatePerMs ?? capacity / (data.windowMs ?? 60_000);
    const tokens = data.tokens ?? capacity;
    const lastRefill = data.lastRefill?.toMillis?.() ?? now;

    const { tokens: available } = refillTokens(
      tokens,
      lastRefill,
      now,
      rate,
      capacity,
    );
    return Math.max(0, Math.floor(available));
  }

  // ----- Core logic -----
  private async checkScope(
    scope: Scope,
    id: string,
    action: string,
    capacity: number,
    windowMs: number,
  ) {
    if (!id) {
      logEvent("ratelimit-no-id", "warn", { scope, action });
      return;
    }

    const now = this.clock.now();
    const rate = capacity / windowMs;
    const ref = this.store.getRef(scope, id, action);

    try {
      await this.store.runTransaction(async (tx) => {
        const snap = await tx.get(ref);

        if (!snap.exists) {
          const doc = {
            tokens: capacity - 1,
            capacity,
            refillRatePerMs: rate,
            windowMs,
            lastRefill: Timestamp.fromMillis(now),
            resetAt: Timestamp.fromMillis(now + windowMs),
            failCount: 0,
            blockedUntil: null,
          };

          await tx.set(ref, doc);
          return;
        }

        const data = snap.data()!;
        const lastRefill = data.lastRefill?.toMillis?.() ?? now;
        const blockedUntil = data.blockedUntil?.toMillis?.() ?? 0;
        const failCount = data.failCount ?? 0;

        const storedTokens = data.tokens ?? capacity;
        const storedCapacity = data.capacity ?? capacity;
        const storedRate = data.refillRatePerMs ?? rate;

        if (blockedUntil > now) {
          const retryAfter = Math.ceil((blockedUntil - now) / 1000);

          logEvent("ratelimit-triggered", "info", {
            scope,
            id: "[redacted]",
            action,
            retryAfter,
            reason: "blocked",
          });

          throw new RateLimitError(undefined, retryAfter);
        }

        const { tokens: available, lastRefill: newLastRefill } = refillTokens(
          storedTokens,
          lastRefill,
          now,
          storedRate,
          storedCapacity,
        );

        if (available >= 1) {
          await tx.update(ref, {
            tokens: available - 1,
            lastRefill: Timestamp.fromMillis(newLastRefill),
            resetAt: Timestamp.fromMillis(now + windowMs),
            failCount: 0,
            blockedUntil: null,
          });
          return;
        }

        const newFailCount = failCount + 1;
        const penaltyMs = calculatePenalty(newFailCount);

        await tx.update(ref, {
          failCount: newFailCount,
          blockedUntil: Timestamp.fromMillis(now + penaltyMs),
          lastRefill: Timestamp.fromMillis(now),
        });

        const retryAfter = Math.ceil(penaltyMs / 1000);

        logEvent("ratelimit-triggered", "info", {
          scope,
          id: "[redacted]",
          action,
          retryAfter,
          reason: "throttled",
        });

        throw new RateLimitError(
          `Too many attempts. Retry after ${retryAfter}s`,
          retryAfter,
        );
      });
    } catch (err: any) {
      if (err instanceof RateLimitError) throw err;

      logEvent("ratelimit-transaction-failure", "error", {
        scope,
        id: "[redacted]",
        action,
        error: err.message ?? String(err),
      });

      if (scope === "uid") {
        throw new RateLimitError(
          "Rate limit verification failed. Please try again later.",
        );
      }
      // IP & device: fail-open
    }
  }
}

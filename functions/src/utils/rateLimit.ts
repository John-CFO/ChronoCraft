///////////////////////////////// rateLimit.ts //////////////////////////////////

// This files contains the implementation of the RateLimiter class,
// which is used to enforce rate limits on user actions.

///////////////////////////////////////////////////////////////////////////////

import { Timestamp } from "firebase-admin/firestore";
import * as admin from "firebase-admin";

import { logEvent } from "./logger";
import { RateLimitError } from "../errors/domain.errors";
import { RateLimitStore } from "./rateLimitStore";

// ---------- Clock ----------
export interface Clock {
  now(): number;
}

export class RealClock implements Clock {
  now(): number {
    return Date.now();
  }
}

// ---------- Types ----------
export type UseCase = "mfa_totp" | "password_reset" | "security";

export type RateLimitContext = {
  uid: string;
  ip: string;
  deviceId: string;
};

// ---------- Constants ----------
const BASE_PENALTY_MS = 60_000;
const MAX_EXPONENT = 6;

// ---------- Helpers ----------
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

// ---------- RateLimiter ----------
export class RateLimiter {
  private clock: Clock;

  constructor(
    private store: RateLimitStore,
    clock?: Clock,
  ) {
    this.clock = clock ?? new RealClock();
  }

  async check(
    useCase: UseCase,
    action: string,
    context: RateLimitContext,
    options?: {
      maxAttempts?: number;
      windowMs?: number;
    },
  ) {
    const maxAttempts = options?.maxAttempts ?? 5;
    const windowMs = options?.windowMs ?? 60_000;

    const now = this.clock.now();

    const ref = this.store.getRef(
      useCase,
      context.ip,
      context.deviceId,
      action,
      context.uid,
    );

    const rate = maxAttempts / windowMs;

    try {
      await admin.firestore().runTransaction(async (tx) => {
        const snap = await tx.get(ref);

        if (!snap.exists) {
          tx.set(ref, {
            tokens: maxAttempts - 1,
            capacity: maxAttempts,
            refillRatePerMs: rate,
            windowMs,
            lastRefill: Timestamp.fromMillis(now),
            resetAt: Timestamp.fromMillis(now + windowMs),
            failCount: 0,
            blockedUntil: null,
          });
          return;
        }

        const data = snap.data()!;
        const lastRefill = data.lastRefill?.toMillis?.() ?? now;
        const blockedUntil = data.blockedUntil?.toMillis?.() ?? 0;
        const failCount = data.failCount ?? 0;

        const storedTokens = data.tokens ?? maxAttempts;
        const storedCapacity = data.capacity ?? maxAttempts;
        const storedRate = data.refillRatePerMs ?? rate;

        if (blockedUntil > now) {
          const retryAfter = Math.ceil((blockedUntil - now) / 1000);

          logEvent("ratelimit-blocked", "info", {
            useCase,
            action,
            retryAfter,
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
          tx.update(ref, {
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

        tx.update(ref, {
          failCount: newFailCount,
          blockedUntil: Timestamp.fromMillis(now + penaltyMs),
          lastRefill: Timestamp.fromMillis(now),
        });

        const retryAfter = Math.ceil(penaltyMs / 1000);

        logEvent("ratelimit-throttled", "info", {
          useCase,
          action,
          retryAfter,
        });

        throw new RateLimitError(
          `Too many attempts. Retry after ${retryAfter}s`,
          retryAfter,
        );
      });
    } catch (err: any) {
      if (err instanceof RateLimitError) throw err;

      logEvent("ratelimit-error", "error", {
        useCase,
        action,
        error: err.message ?? String(err),
      });

      throw new RateLimitError(
        "Rate limit verification failed. Please try again later.",
      );
    }
  }

  async getRemainingAttempts(
    useCase: UseCase,
    action: string,
    context: RateLimitContext,
    maxAttempts = 5,
  ): Promise<number> {
    const now = this.clock.now();

    const data = await this.store.getActionDoc(
      useCase,
      context.ip,
      context.deviceId,
      action,
      context.uid,
    );

    if (!data) return maxAttempts;

    const blockedUntil = data.blockedUntil?.toMillis?.() ?? 0;
    if (blockedUntil > now) return 0;

    const capacity = data.capacity ?? maxAttempts;
    const rate = data.refillRatePerMs ?? capacity / 60_000;
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
}

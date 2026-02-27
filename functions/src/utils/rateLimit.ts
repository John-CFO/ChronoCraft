///////////////////////////////// rateLimit.ts //////////////////////////////////

// This file contains the implementation of the RateLimiter class,
// which is used to enforce rate limits on API requests.
// There are used inside the cloud functions in the application.
// Several scopes are supported (per user, per IP, per device) with exponential backoff penalties.

/////////////////////////////////////////////////////////////////////////////////

import admin from "firebase-admin";
import { Timestamp } from "firebase-admin/firestore";
import { logEvent } from "./logger";
import { RateLimitError } from "../errors/domain.errors";

if (!admin.apps.length) {
  admin.initializeApp();
}

type Scope = "uid" | "ip" | "device";

const COLLECTION = "RateLimits_v2"; // use new collection name to avoid clashing with old docs
const BASE_PENALTY_MS = 60_000; // base penalty for first full-bucket (60s)
const MAX_EXPONENT = 6; // cap exponent growth (2^6 = 64)

function docIdFor(scope: Scope, id: string, action: string) {
  const safeId = id.replace(/[\/\s:.]/g, "_");
  return `${scope}_${safeId}_${action}`;
}

function refillRatePerMs(capacity: number, windowMs: number) {
  return capacity / windowMs;
}

export class RateLimiter {
  private db = admin.firestore();

  // Backwards-compatible method signature
  async checkLimit(
    uid: string,
    action: string,
    maxAttempts: number = 5,
    windowMs: number = 60_000,
  ): Promise<void> {
    return this.checkScope("uid", uid, action, maxAttempts, windowMs);
  }

  // New: IP-level
  async checkIP(
    ip: string,
    action: string,
    maxAttempts: number = 30,
    windowMs: number = 10 * 60_000,
  ): Promise<void> {
    if (!ip) {
      // If we can't determine IP, be permissive (but log)
      logEvent("ip-missing", "warn", { action, ip });
      return;
    }
    return this.checkScope("ip", ip, action, maxAttempts, windowMs);
  }

  // New: Device-level (deviceId provided by client)
  async checkDevice(
    deviceId: string,
    action: string,
    maxAttempts: number = 10,
    windowMs: number = 60_000,
    options?: { strict?: boolean },
  ): Promise<void> {
    const cap = options?.strict
      ? Math.max(1, Math.floor(maxAttempts / 2))
      : maxAttempts;
    return this.checkScope("device", deviceId, action, cap, windowMs);
  }

  // public helper to reset a limit (keeps compatibility)
  async resetLimit(uid: string, action: string): Promise<void> {
    const ref = this.db
      .collection(COLLECTION)
      .doc(docIdFor("uid", uid, action));
    await ref.delete().catch(() => {});
  }

  // get remaining attempts (per uid)
  async getRemainingAttempts(
    uid: string,
    action: string,
    maxAttempts: number = 5,
  ): Promise<number> {
    const ref = this.db
      .collection(COLLECTION)
      .doc(docIdFor("uid", uid, action));
    const snap = await ref.get();
    if (!snap.exists) return maxAttempts;
    const data = snap.data() as any;
    const now = Date.now();
    const resetAt = data.resetAt?.toMillis?.() ?? 0;
    if (now >= resetAt) return maxAttempts;
    return Math.max(0, maxAttempts - (data.count ?? 0));
  }

  // Core: scope-aware token-bucket with exponential penalty
  private async checkScope(
    scope: Scope,
    id: string,
    action: string,
    capacity: number,
    windowMs: number,
  ): Promise<void> {
    if (!id) {
      // defensive: if there's no identifier, allow but log
      logEvent("ratelimit-no-id", "warn", { scope, action });
      return;
    }
    const ref = this.db.collection(COLLECTION).doc(docIdFor(scope, id, action));
    const nowMs = Date.now();
    const refillPerMs = refillRatePerMs(capacity, windowMs);

    try {
      await this.db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        if (!snap.exists) {
          // initialize doc and consume one token
          const doc = {
            tokens: capacity - 1,
            capacity,
            refillRatePerMs: refillPerMs,
            lastRefill: Timestamp.fromMillis(nowMs),
            resetAt: Timestamp.fromMillis(nowMs + windowMs),
            failCount: 0,
            blockedUntil: null,
            count: 1, // legacy compatible counter
          };
          tx.set(ref, doc);
          return;
        }

        const data = snap.data() as any;
        const lastRefillMs = data.lastRefill?.toMillis?.() ?? nowMs;
        const blockedUntilMs = data.blockedUntil?.toMillis?.() ?? 0;

        if (blockedUntilMs && blockedUntilMs > nowMs) {
          const retryAfter = Math.ceil((blockedUntilMs - nowMs) / 1000);
          // carry minimal metadata in the RateLimitError
          throw new RateLimitError(null, retryAfter);
        }

        // refill tokens
        const elapsed = Math.max(0, nowMs - lastRefillMs);
        const available = Math.min(
          data.capacity ?? capacity,
          (data.tokens ?? capacity) +
            elapsed * (data.refillRatePerMs ?? refillPerMs),
        );

        if (available >= 1) {
          // consume one and update
          const newTokens = available - 1;
          tx.update(ref, {
            tokens: newTokens,
            lastRefill: Timestamp.fromMillis(nowMs),
            resetAt: Timestamp.fromMillis(nowMs + windowMs),
            failCount: 0,
            blockedUntil: null,
            count: (data.count ?? 0) + 1,
            lastAttempt: Timestamp.fromMillis(nowMs),
          });
          return;
        }

        // no tokens available -> apply penalty/backoff
        const prevFail = data.failCount ?? 0;
        const newFail = prevFail + 1;
        const exponent = Math.min(newFail - 1, MAX_EXPONENT);
        const penaltyMs = BASE_PENALTY_MS * Math.pow(2, exponent); // exponential backoff
        const blockedUntil = Timestamp.fromMillis(nowMs + penaltyMs);

        tx.update(ref, {
          failCount: newFail,
          blockedUntil,
          lastRefill: Timestamp.fromMillis(nowMs),
          lastAttempt: Timestamp.fromMillis(nowMs),
        });

        const retryAfter = Math.ceil(penaltyMs / 1000);
        const rl = new RateLimitError(
          `Too many attempts. Retry after ${retryAfter}s`,
        );
        (rl as any).retryAfterSeconds = retryAfter;
        throw rl;
      });
    } catch (err: any) {
      if (err instanceof RateLimitError) throw err;
      // transaction failure => log and allow request (fail open),
      // but keep caller aware via logs
      logEvent("ratelimit-transaction-failure", "error", {
        scope,
        id,
        action,
        error: err instanceof Error ? err.message : String(err),
      });

      // Fail strategy based on scope
      if (scope === "uid") {
        // Fail-closed: block request if we cannot verify rate limit
        throw new RateLimitError(
          "Rate limit verification failed. Please try again later.",
        );
      }

      // IP & device: fail-open
      return;
    }
  }
}

// singleton
export const rateLimit = new RateLimiter();

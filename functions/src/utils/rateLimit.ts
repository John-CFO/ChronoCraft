///////////////////////////////// rateLimit.ts //////////////////////////////////

// This file contains the implementation of the RateLimiter class,
// which is used to enforce rate limits on API requests.
// There are used inside the cloud functions in the application.

/////////////////////////////////////////////////////////////////////////////////

import { Timestamp } from "firebase-admin/firestore";
import admin from "firebase-admin";

import { logEvent } from "./logger";
import { RateLimitError } from "../errors/domain.errors";

/////////////////////////////////////////////////////////////////////////////////

export interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
  action: string;
}

////////////////////////////////////////////////////////////////////////////////

export class RateLimiter {
  // define database and default config
  private db = admin.firestore();
  private defaultConfig: RateLimitConfig = {
    maxAttempts: 5,
    windowMs: 60_000, // 1 minute
    action: "default",
  };

  // checkLimti method
  async checkLimit(
    uid: string,
    action: string,
    maxAttempts?: number,
    windowMs?: number
  ): Promise<void> {
    // use RateLimitConfig interface to define action, maxAttempts and windowMs
    const config: RateLimitConfig = {
      action,
      maxAttempts: maxAttempts || this.defaultConfig.maxAttempts,
      windowMs: windowMs || this.defaultConfig.windowMs,
    };
    // enforce rate limit
    await this.enforceRateLimit(uid, config);
  }

  // enforceRateLimit method
  private async enforceRateLimit(
    uid: string,
    config: RateLimitConfig
  ): Promise<void> {
    const ref = this.db.collection("RateLimits").doc(`${uid}_${config.action}`);
    const now = Date.now();

    // run transaction
    try {
      await this.db.runTransaction(async (transaction) => {
        const snap = await transaction.get(ref);
        // condition to check if snap exists
        if (!snap.exists) {
          // First request
          transaction.set(ref, {
            count: 1,
            resetAt: Timestamp.fromMillis(now + config.windowMs),
            firstAttempt: Timestamp.fromMillis(now),
            lastAttempt: Timestamp.fromMillis(now),
            uid,
            action: config.action,
          });
          return; // return nothing
        }

        const data = snap.data()!;
        const resetAt = data.resetAt.toMillis();

        // condition to check if now is greater than resetAt
        if (now >= resetAt) {
          // Window expired, reset
          transaction.set(ref, {
            count: 1,
            resetAt: Timestamp.fromMillis(now + config.windowMs),
            firstAttempt: Timestamp.fromMillis(now),
            lastAttempt: Timestamp.fromMillis(now),
            uid,
            action: config.action,
          });
          return;
        }
        // condition to check if count is greater than or equal to maxAttempts
        if (data.count >= config.maxAttempts) {
          // log rate limit exceeded
          logEvent("Rate limit exceeded", "warn", {
            uid,
            action: config.action,
            attempts: data.count,
            limit: config.maxAttempts,
            windowMs: config.windowMs,
          });
          // Error if rate limit exceeded
          throw new RateLimitError();
        }

        // Increment count
        transaction.update(ref, {
          count: data.count + 1,
          lastAttempt: Timestamp.fromMillis(now),
        });
      });
    } catch (error) {
      if (error instanceof RateLimitError) {
        throw error;
      }
      // Don't block requests on rate limit errors
      logEvent("Rate limit transaction failed", "error", {
        uid,
        action: config.action,
        error: error instanceof Error ? error.message : String(error),
      });
      // Allow request to proceed if rate limiting fails
    }
  }

  // getRemainingAttempts method
  async getRemainingAttempts(
    uid: string,
    action: string,
    maxAttempts: number = this.defaultConfig.maxAttempts
  ): Promise<number> {
    const ref = this.db.collection("RateLimits").doc(`${uid}_${action}`);
    const snap = await ref.get();
    // check if snap exists
    if (!snap.exists) {
      return maxAttempts; // Return of the expected maxAttempts value
    }

    const data = snap.data()!;
    const now = Date.now();
    const resetAt = data.resetAt.toMillis();
    //condition: if the current time is greater than or equal to the reset time, return to maxAttempts
    if (now >= resetAt) {
      return maxAttempts;
    }
    // return the number of remaining attempts
    return Math.max(0, maxAttempts - data.count);
  }

  // resetLimit method
  async resetLimit(uid: string, action: string): Promise<void> {
    const ref = this.db.collection("RateLimits").doc(`${uid}_${action}`);
    await ref.delete();
  }
}

// Singleton instance
export const rateLimiter = new RateLimiter();

// Legacy function for backward compatibility
export async function rateLimit(
  uid: string,
  action: string,
  max: number,
  windowMs: number
): Promise<void> {
  // run checkLimit
  try {
    await rateLimiter.checkLimit(uid, action, max, windowMs);
  } catch (error) {
    // Log the error if rate limiting fails
    logEvent("Rate limit check failed", "error", {
      uid,
      action,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/////////////////////////// rateLimitInstance.ts ///////////////////////////////

// This file contains the implementation of the rateLimitInstance function,
// which is used to create a new instance of the RateLimiter class.

//////////////////////////////////////////////////////////////////////////////////

import * as admin from "firebase-admin";

import { FirestoreRateLimitStore } from "./rateLimitStore";
import { RateLimiter } from "./rateLimit";

//////////////////////////////////////////////////////////////////////////////////

const isRateLimitDisabled = process.env.RATE_LIMIT_DISABLED === "true";

if (process.env.NODE_ENV !== "test" && isRateLimitDisabled) {
  throw new Error("RATE_LIMIT_DISABLED must not be enabled outside test");
}

// Disabled stub (must exactly match the RateLimiter shape)
const disabledRateLimiter = {
  check: async () => {},
  getRemainingAttempts: async () => 0,
} as unknown as RateLimiter;

// Factory
function createRateLimiter(): RateLimiter {
  if (isRateLimitDisabled) {
    return disabledRateLimiter;
  }

  const store = new FirestoreRateLimitStore(
    admin.firestore(),
    process.env.RATE_LIMIT_HMAC_KEY,
  );

  return new RateLimiter(store);
}

// Singleton (runtime use)
export const rateLimit = createRateLimiter();

// Test-safe factory (no shared state)
export function getRateLimit(): RateLimiter {
  return createRateLimiter();
}

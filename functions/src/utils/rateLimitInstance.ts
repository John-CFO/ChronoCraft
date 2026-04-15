/////////////////////////// rateLimitInstance.ts ///////////////////////////////

// This file contains the implementation of the rateLimitInstance function,
// which is used to create a new instance of the RateLimiter class.

//////////////////////////////////////////////////////////////////////////////////

import * as admin from "firebase-admin";

import { FirestoreRateLimitStore } from "./rateLimitStore";
import { RateLimiter } from "./rateLimit";

//////////////////////////////////////////////////////////////////////////////////

const isRateLimitDisabled = process.env.RATE_LIMIT_DISABLED === "true";

const disabledRateLimiter = {
  checkLimit: async () => {},
  checkIP: async () => {},
  checkDevice: async () => {},
  resetLimit: async () => {},
  resetAllLimitsForUser: async () => {},
  getRemainingAttempts: async () => 0,
} as unknown as RateLimiter;

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

//////////////////////////////////////////////////////////////////////////////////

// Hybrid export solution to manage the export trade off between functions and tests
const rateLimitInstance = createRateLimiter();
export function getRateLimit(): RateLimiter {
  return createRateLimiter(); // for tests
}

export const rateLimit = rateLimitInstance;

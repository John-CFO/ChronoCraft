/////////////////////////// rateLimitInstance.ts ///////////////////////////////

// This file contains the implementation of the rateLimitInstance function,
// which is used to create a new instance of the RateLimiter class.

//////////////////////////////////////////////////////////////////////////////////

import * as admin from "firebase-admin";

import { FirestoreRateLimitStore } from "./rateLimitStore";
import { RateLimiter } from "./rateLimit";

//////////////////////////////////////////////////////////////////////////////////

const store = new FirestoreRateLimitStore(
  admin.firestore(),
  process.env.RATE_LIMIT_HMAC_KEY,
);

export const rateLimit = new RateLimiter(store);

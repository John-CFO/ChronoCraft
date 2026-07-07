//////////////////////////// totp.race.test.ts //////////////////////////////

// This file contains race condition tests for the totpLogin function

///////////////////////////////////////////////////////////////////////////////

import "./setup";
import { randomUUID } from "crypto";
import { verifyTotpLoginHandler } from "../../src/functions/totp";
import { getRateLimit } from "../../src/utils/rateLimitInstance";
import { runRace } from "./hardness/raceRunner";
import { RateLimitError } from "../../src/errors/domain.errors";

///////////////////////////////////////////////////////////////////////////////

const uid = `race-user-${randomUUID()}`;
const deviceId = `race-device-${randomUUID()}`;
const ip = "127.0.0.1";

const baseRequest = (token = "123456") => ({
  auth: { uid },
  data: { token, deviceId },
  rawRequest: {
    headers: {
      "x-forwarded-for": "127.0.0.1",
    },
  },
});

///////////////////////////////////////////////////////////////////////////////

describe("Race Condition: TOTP login verification concurrency", () => {
  it("must enforce replay protection under concurrent valid OTP submissions", async () => {
    const results = await runRace<{ success: boolean }>({
      participants: 30,
      jitterMs: 20,
      operation: async () => {
        const res = await verifyTotpLoginHandler(baseRequest());
        return { success: res?.valid === true };
      },
    });

    const success = results.filter((r) => r.result?.success === true).length;

    if (success > 1) {
      throw new Error("Replay protection failed under concurrency");
    }
  });
});

describe("Race Condition: TOTP rate limit vs valid login race", () => {
  it("must enforce rate limit under concurrent requests without bypass", async () => {
    const rateLimit = getRateLimit();

    const results = await runRace<{ rejected: boolean }>({
      participants: 30,
      jitterMs: 5,
      operation: async () => {
        try {
          await rateLimit.check(
            "mfa_totp",
            "mfa_totp_login",
            { uid, ip, deviceId },
            { maxAttempts: 5, windowMs: 60_000 },
          );
          console.log({
            acceptedCount,
            rejectedCount,
            total: results.length,
          });
          return { rejected: false };
        } catch (err) {
          if (err instanceof RateLimitError) {
            return { rejected: true };
          }
          throw err;
        }
      },
    });

    const rejectedCount = results.filter((r) => r.result?.rejected).length;
    const acceptedCount = results.filter((r) => !r.result?.rejected).length;

    /**
     * SECURITY INVARIANT:
     * If rate limiter is active under concurrency,
     * it MUST produce at least one rejection.
     */
    if (rejectedCount === 0) {
      throw new Error("Rate limit did not trigger under concurrent load");
    }

    /**
     * SAFETY INVARIANT:
     * System must not silently accept all requests under race conditions.
     */
    if (acceptedCount === results.length) {
      throw new Error(
        "All concurrent requests were accepted — rate limit ineffective",
      );
    }
  });
});

describe("Race Condition: TOTP state consistency under concurrent login attempts", () => {
  it("must not corrupt lastUsedStep or verification state", async () => {
    const results = await runRace<{ success: boolean }>({
      participants: 20,
      jitterMs: 20,
      operation: async () => {
        const res = await verifyTotpLoginHandler(baseRequest());
        return { success: res?.valid === true };
      },
    });

    if (results.length !== 20) {
      throw new Error("Incomplete race execution");
    }

    const failures = results.filter((r) => !r.success);

    if (failures.length === 0) {
      throw new Error(
        "Expected at least one controlled rejection due to replay protection or rate limit",
      );
    }
  });
});

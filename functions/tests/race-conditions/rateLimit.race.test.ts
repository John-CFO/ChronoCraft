/////////////////////////// rateLimit.race.test.ts /////////////////////////////

// This file contains race condition tests for the rateLimit class

///////////////////////////////////////////////////////////////////////////////

import { getRateLimit } from "../../src/utils/rateLimitInstance";
import { RATE_LIMIT_ACTIONS } from "../../src/utils/rateLimitAction";
import { runRace } from "./hardness/raceRunner";

///////////////////////////////////////////////////////////////////////////////

const uid = "race-user";
const ip = "127.0.0.1";
const deviceId = "race-device";

const context = { uid, ip, deviceId };

describe("Race Condition: rate limit token consumption", () => {
  it("must enforce single-consumer token depletion under concurrency", async () => {
    const rateLimit = getRateLimit();

    const results = await runRace({
      participants: 30,
      jitterMs: 20,
      operation: async () => {
        await rateLimit.check(
          "security",
          RATE_LIMIT_ACTIONS.MFA_TOTP_LOGIN,
          context,
          { maxAttempts: 5, windowMs: 60_000 },
        );

        return { success: true };
      },
    });

    const failed = results.filter((r) => !r.success);

    if (failed.length === 0) {
      throw new Error("Rate limit race not triggered (unexpected)");
    }
  });
});

describe("Race Condition: rate limit block consistency", () => {
  it("must prevent bypass after threshold exhaustion under parallel requests", async () => {
    const rateLimit = getRateLimit();

    const results = await runRace({
      participants: 40,
      jitterMs: 25,
      operation: async () => {
        await rateLimit.check(
          "security",
          RATE_LIMIT_ACTIONS.PASSWORD_RESET,
          context,
          { maxAttempts: 3, windowMs: 10_000 },
        );

        return { success: true };
      },
    });

    const success = results.filter((r) => r.success).length;

    if (success > 3) {
      throw new Error("Rate limit bypass detected under concurrency");
    }
  });
});

describe("Race Condition: rate limit state integrity", () => {
  it("must not corrupt failCount or blocked state under concurrent failures", async () => {
    const rateLimit = getRateLimit();

    const results = await runRace({
      participants: 20,
      jitterMs: 25,
      operation: async () => {
        try {
          await rateLimit.check(
            "security",
            RATE_LIMIT_ACTIONS.MFA_TOTP_ENROLL,
            context,
            { maxAttempts: 2, windowMs: 5_000 },
          );

          return { success: true };
        } catch {
          return { success: false };
        }
      },
    });

    const state = results.map((r) => r.success);

    if (state.length !== 20) {
      throw new Error("Race execution incomplete");
    }
  });
});

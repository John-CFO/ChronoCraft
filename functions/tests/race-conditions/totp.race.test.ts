//////////////////////////// totp.race.test.ts //////////////////////////////

// This file contains race condition tests for the totpLogin function

///////////////////////////////////////////////////////////////////////////////

import "./setup";
import { randomUUID } from "crypto";
import { verifyTotpLoginHandler } from "../../src/functions/totp";
import { getRateLimit } from "../../src/utils/rateLimitInstance";
import { runRace } from "./hardness/raceRunner";

///////////////////////////////////////////////////////////////////////////////

const uid = `race-user-${randomUUID()}`;
const deviceId = `race-device-${randomUUID()}`;

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
  it("must block excess verification attempts under parallel execution", async () => {
    const rateLimit = getRateLimit();

    const results = await runRace<{ type: string; success: boolean }>({
      participants: 40,
      jitterMs: 25,
      operation: async (index) => {
        if (index % 2 === 0) {
          // real Login-Comparsion
          const result = await verifyTotpLoginHandler(baseRequest());
          return { type: "login", success: result?.valid === true };
        } else {
          // only Rate‑Limit‑Check (no Login)
          await rateLimit.check("mfa_totp", "mfa_totp_login", {
            uid,
            ip: "127.0.0.1",
            deviceId,
          });
          return { type: "ratelimit", success: true };
        }
      },
    });

    // count only Login‑Results – access via result.type
    const loginSuccesses = results.filter(
      (r) => r.result?.type === "login" && r.success,
    ).length;

    if (loginSuccesses > 5) {
      throw new Error("Rate limit bypass under concurrent TOTP verification");
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

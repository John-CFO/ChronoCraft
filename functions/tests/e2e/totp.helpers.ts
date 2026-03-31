////////////////////////////// totp.helpers.ts //////////////////////////////

// This file contains helper functions for the TOTP E2E tests

/////////////////////////////////////////////////////////////////////////////

import { hotp } from "../../src/security/totpCore";
import { callFunction, getIdTokenForUser } from "./setup";
import { unwrapBody } from "./trust-boundaries.e2e.test";

/////////////////////////////////////////////////////////////////////////////
// Helper-function: complete totp flow for a user
export async function totpEnrollAndVerify(uid: string) {
  const idToken = await getIdTokenForUser(uid);

  // generate enrollment
  const createRes = await callFunction({
    functionName: "createTotpSecret",
    idToken,
    body: {},
    isCallable: true,
  });

  const createBody = unwrapBody(createRes.body);
  const { otpAuthUrl, enrollmentId } = createBody;

  if (!otpAuthUrl || !enrollmentId) throw new Error("TOTP Enrollment failed");

  // parse secret from otpAuthUrl (format: ...?secret=(BASE32)
  const secretMatch = /[?&]secret=([^&]+)/i.exec(otpAuthUrl);
  if (!secretMatch) throw new Error("Secret not found in otpAuthUrl");
  const secret = decodeURIComponent(secretMatch[1]);

  // generate current token
  const counter = Math.floor(Date.now() / 1000 / 30);
  const token = hotp(secret, counter);

  // validate token
  const verifyRes = await callFunction({
    functionName: "verifyTotpToken",
    idToken,
    body: { token, enrollmentId },
    isCallable: true,
  });
  const verifyBody = unwrapBody(verifyRes.body);

  if (!verifyBody.valid) throw new Error("TOTP Verification failed");

  return { otpAuthUrl, enrollmentId, secret, token, verifyBody };
}

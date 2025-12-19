////////////////// authValidator.ts /////////////////////////////

// This file contains the function that validates auth requests

///////////////////////////////////////////////////////////////

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

import { logEvent } from "./logging/logger";
import { LogicError } from "./errors/LogicError";
import { handleFunctionError } from "./errors/handleFunctionError";
import {
  LoginInputSchema,
  RegisterInputSchema,
  TotpCodeSchema,
} from "../../validation/authSchemas";
import { verifyToken } from "../../validation/utils/totp";

/////////////////////////////////////////////////////////////////

// Simple in-memory rate limit (pro Instance)
const rateLimitMap = new Map<string, number>();

interface AuthRequestData {
  action: "login" | "register" | "verifyTotp";
  payload: any;
}

export type UserDocLike = {
  exists: boolean;
  data(): any;
};

export interface AuthDeps {
  getUserDoc?: (uid: string) => Promise<UserDocLike>;
  verifyToken?: (secret: string, code: string) => boolean;
  logEvent?: typeof logEvent;
}

// Default-Implementierung für die "echte" Function
export const defaultAuthDeps: AuthDeps = {
  getUserDoc: async (uid) =>
    admin.firestore().collection("Users").doc(uid).get(),
  verifyToken: verifyToken,
  logEvent: logEvent,
};

export const authValidator = functions.https.onCall(
  async (request: functions.https.CallableRequest<any>) => {
    const req = request as any;
    const data: AuthRequestData | undefined = req.data;
    const uid = req.auth?.uid ?? req.context?.auth?.uid;
    const rawReq = req.rawRequest ?? req.context?.rawRequest;

    try {
      const res = await authValidatorLogic(data, uid, rawReq, defaultAuthDeps);
      return res;
    } catch (err: unknown) {
      const msg = handleFunctionError(err, "authValidator");
      logEvent("authValidator error", "error", {
        error: err,
        uid,
      });
      const code = (err as any)?.code ?? "internal";
      throw new functions.https.HttpsError(code, msg);
    }
  }
);

// pure logic (exported for unit tests)
export async function authValidatorLogic(
  data: AuthRequestData | undefined,
  uid: string | undefined,
  rawReq: any,
  deps: AuthDeps
): Promise<any> {
  const {
    getUserDoc = defaultAuthDeps.getUserDoc!,
    verifyToken = defaultAuthDeps.verifyToken!,
    logEvent = defaultAuthDeps.logEvent!,
  } = deps;

  // Basic action check
  if (!data?.action) {
    throw new LogicError("invalid-argument", "Missing action");
  }

  // Rate limit
  const ip =
    rawReq?.ip ??
    rawReq?.headers?.["x-forwarded-for"] ??
    rawReq?.headers?.["x-real-ip"] ??
    "anon";

  const rateKey = uid || ip;
  const count = rateLimitMap.get(rateKey) ?? 0;
  if (count > 20) {
    logEvent("Rate limit exceeded", "warn", { rateKey, count });
    throw new LogicError("resource-exhausted", "Too many requests");
  }
  rateLimitMap.set(rateKey, count + 1);

  // Actions
  if (data.action === "login") {
    LoginInputSchema.parse(data.payload);
    logEvent("login attempt", "info", { uid, input: data.payload });
    return { success: true };
  }

  if (data.action === "register") {
    RegisterInputSchema.parse(data.payload);
    logEvent("register attempt", "info", { uid, input: data.payload });
    return { success: true };
  }

  if (data.action === "verifyTotp") {
    if (!uid) {
      logEvent("Unauthenticated TOTP attempt", "warn");
      throw new LogicError("unauthenticated", "User must be authenticated");
    }

    const parsed = TotpCodeSchema.safeParse(data.payload);
    if (!parsed.success) {
      const msgs = parsed.error.issues.map((i) => i.message).join(", ");
      logEvent("invalid totp payload", "warn", { uid, msgs });
      throw new LogicError("invalid-argument", `Invalid TOTP payload: ${msgs}`);
    }

    // extract code
    let code: string;
    const payloadData = parsed.data;
    if (typeof payloadData === "string") code = payloadData;
    else if (
      payloadData &&
      typeof payloadData === "object" &&
      "code" in payloadData &&
      typeof (payloadData as any).code === "string"
    )
      code = (payloadData as { code: string }).code;
    else throw new LogicError("invalid-argument", "TOTP payload missing code");

    const userDoc = await getUserDoc(uid);
    if (!userDoc.exists) {
      logEvent("User not found for TOTP", "warn", { uid });
      throw new LogicError("not-found", "User not found");
    }

    const secret = userDoc.data()?.totpSecret;
    if (!secret) {
      logEvent("TOTP not configured", "warn", { uid });
      throw new LogicError("failed-precondition", "TOTP not configured");
    }

    const valid = verifyToken(secret, code);
    logEvent("verify totp", "info", { uid, valid });
    return { valid };
  }

  logEvent("unknown auth action", "warn", { uid, action: data.action });
  throw new LogicError("invalid-argument", "Unknown action");
}

export function __resetRateLimitMap() {
  rateLimitMap.clear();
}

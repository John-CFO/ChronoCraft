//////////////////////// totp.ts /////////////////////////////

// This file contains all the functions for TOTP / HOTP.
// Version: Secure MFA with defineSecret, AES-256-GCM, Custom Claims

//////////////////////////////////////////////////////////////

import { defineSecret } from "firebase-functions/params";
import * as Crypto from "crypto";

import { firestore, auth, FieldValue, Timestamp } from "../firebaseAdmin";
import { generateSecret, verifyTotp } from "../security/totpCore";
import { rateLimit } from "../utils/rateLimitInstance";
import {
  RateLimitError,
  ValidationError,
  NotFoundError,
  PermissionError,
  BusinessRuleError,
  ConflictError,
  AuthenticationError,
} from "../errors/domain.errors";
import { handleFunctionError } from "../errors/handleFunctionError";
import { FailedPreconditionError } from "../errors/domain.errors";

//////////////////////////////////////////////////////////////

// Configuration
const TOTP_ENCRYPTION_KEY = defineSecret("TOTP_ENCRYPTION_KEY");
const IV_LENGTH = 12; // AES-GCM standard IV length
const PENDING_COLLECTION = "mfa_totp_pending";
const TOTP_COLLECTION = "mfa_totp";

// Key-derivation
function deriveEncryptionKey(rawKey: string): Buffer {
  return Crypto.createHash("sha256").update(rawKey).digest(); // 32 Byte
}
// function to generate a TOTP (to use it in totp testing)
function buildOtpAuthUrl(
  uid: string,
  secret: string,
  issuer = "MyApp",
): string {
  return `otpauth://totp/${issuer}:${uid}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;
}

// Cipheriv

// function to encrypt a string
export function encrypt(text: string, rawKey: string): string {
  const key = deriveEncryptionKey(rawKey);
  const iv = Crypto.randomBytes(IV_LENGTH);
  const cipher = Crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(text, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return (
    iv.toString("hex") +
    ":" +
    authTag.toString("hex") +
    ":" +
    encrypted.toString("hex")
  );
}

// function to decrypt a string
export function decrypt(encryptedData: string, rawKey: string): string {
  const key = deriveEncryptionKey(rawKey);
  const parts = encryptedData.split(":");
  if (parts.length !== 3) throw new ValidationError("Corrupted TOTP secret");
  const iv = Buffer.from(parts[0], "hex");
  const authTag = Buffer.from(parts[1], "hex");
  const encryptedText = Buffer.from(parts[2], "hex");
  const decipher = Crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = decipher.update(encryptedText);
  return Buffer.concat([decrypted, decipher.final()]).toString("utf8");
}

// Handler

// Check TOTP Status - Handler only
export const checkTotpStatusHandler = async (request: any) => {
  try {
    if (!request.auth) {
      throw new AuthenticationError();
    }

    const uid = request.auth.uid;
    const totpRef = firestore.collection(TOTP_COLLECTION).doc(uid);
    const totpSnap = await totpRef.get();

    const enabled = totpSnap.exists && totpSnap.data()?.enabled === true;

    return { enabled };
  } catch (error) {
    console.error("Error in checkTotpStatusHandler:", error);
    throw handleFunctionError(error, "checkTotpStatusHandler");
  }
};

// Start Enrollment
export const createTotpSecretHandler = async (request: any) => {
  try {
    if (!request.auth) {
      throw new AuthenticationError();
    }

    const uid = request.auth.uid;

    const userRef = firestore.collection("Users").doc(uid);
    const userSnap = await userRef.get();
    if (!userSnap.exists) throw new NotFoundError("User");

    const userData = userSnap.data() || {};
    if (userData.totp?.enabled) {
      throw new BusinessRuleError(
        "TOTP already enabled",
        "TOTP is already enabled for this user.",
      );
    }

    const rawKey = await TOTP_ENCRYPTION_KEY.value();
    // Firestore requires a composite index for this query (uid + range filter on expiresAt)
    const pendingQuery = await firestore
      .collection(PENDING_COLLECTION)
      .where("uid", "==", uid)
      .where("expiresAt", ">", new Date())
      .limit(1)
      .get();
    let enrollmentId: string;
    let secret: string;
    let createdNew = false;

    if (!pendingQuery.empty) {
      const doc = pendingQuery.docs[0];
      enrollmentId = doc.id;
      secret = decrypt(doc.data().encryptedSecret, rawKey);
    } else {
      const lastEnroll =
        userData.totpEnrollment?.lastAttempt?.toDate?.() ?? null;

      if (lastEnroll && Date.now() - lastEnroll.getTime() < 60_000) {
        throw new RateLimitError(undefined, 60);
      }

      secret = generateSecret();
      console.log(secret);
      const encryptedSecret = encrypt(secret, rawKey);
      enrollmentId = Crypto.randomBytes(16).toString("hex");

      const expiresAt = Timestamp.fromMillis(Date.now() + 60 * 60 * 1000);

      await firestore.collection(PENDING_COLLECTION).doc(enrollmentId).set({
        uid,
        encryptedSecret,
        createdAt: FieldValue.serverTimestamp(),
        expiresAt,
        failedAttempts: 0,
      });

      createdNew = true;
    }

    if (createdNew) {
      await userRef.set(
        { totpEnrollment: { lastAttempt: FieldValue.serverTimestamp() } },
        { merge: true },
      );
    }

    return {
      enrollmentId,
      otpAuthUrl: buildOtpAuthUrl(uid, secret),
      message:
        "Scan the QR code with your authenticator app. This secret expires in 1 hour.",
    };
  } catch (error) {
    console.error("Error in createTotpSecretHandler:", error);
    throw handleFunctionError(error, "createTotpSecretHandler");
  }
};

// Confirm Enrollment + Enable TOTP
export const verifyTotpTokenHandler = async (request: any) => {
  try {
    if (!request.auth) {
      throw new AuthenticationError();
    }

    const { token, enrollmentId: providedEnrollmentId } = request.data ?? {};

    if (!token || token.length !== 6 || !/^\d+$/.test(token)) {
      throw new ValidationError("Invalid TOTP token");
    }

    const uid = request.auth.uid;

    const rawHeaders = (request as any).rawRequest?.headers ?? {};
    const forwarded =
      rawHeaders["x-forwarded-for"] ||
      rawHeaders["x-real-ip"] ||
      rawHeaders["x-appengine-user-ip"];

    const clientIp = forwarded ? String(forwarded).split(",")[0].trim() : null;

    const ACTION = "mfa_totp_enroll";
    await rateLimit.check("mfa_totp", ACTION, {
      uid,
      ip: clientIp ?? "",
      deviceId: "",
    });

    const rawKey = await TOTP_ENCRYPTION_KEY.value();
    const totpRef = firestore.collection(TOTP_COLLECTION).doc(uid);
    const userRef = firestore.collection("Users").doc(uid);

    let pendingRef: FirebaseFirestore.DocumentReference;

    if (providedEnrollmentId) {
      const directSnap = await firestore
        .collection(PENDING_COLLECTION)
        .doc(providedEnrollmentId)
        .get();

      if (directSnap.exists) {
        pendingRef = directSnap.ref;
      } else {
        const ownPendingQuery = await firestore
          .collection(PENDING_COLLECTION)
          .where("uid", "==", uid)
          .where("expiresAt", ">", new Date())
          .limit(1)
          .get();

        if (!ownPendingQuery.empty) {
          throw new PermissionError("access enrollment");
        }

        throw new NotFoundError("Enrollment session");
      }
    } else {
      const pendingQuery = await firestore
        .collection(PENDING_COLLECTION)
        .where("uid", "==", uid)
        .where("expiresAt", ">", new Date())
        .limit(1)
        .get();

      if (pendingQuery.empty) {
        throw new NotFoundError("Enrollment session");
      }

      pendingRef = pendingQuery.docs[0].ref;
    }

    await firestore.runTransaction(async (tx) => {
      const pendingSnap = await tx.get(pendingRef);

      if (!pendingSnap.exists) {
        throw new NotFoundError("Enrollment session");
      }

      const pendingData = pendingSnap.data()!;

      if (pendingData.uid !== uid) {
        throw new PermissionError("access enrollment");
      }

      if (pendingData.expiresAt.toDate() < new Date()) {
        tx.delete(pendingRef);
        throw new ValidationError("Enrollment session expired");
      }

      const FAILED_LIMIT = 5;
      const WINDOW_MS = 10 * 60 * 1000;

      let failedAttempts = pendingData.failedAttempts || 0;
      const lastFailed =
        pendingData.lastFailedAttempt?.toDate?.() ?? new Date(0);

      if (Date.now() - lastFailed.getTime() > WINDOW_MS) {
        failedAttempts = 0;
      }

      if (failedAttempts >= FAILED_LIMIT) {
        tx.delete(pendingRef);
        throw new BusinessRuleError(
          "Too many failed attempts. Enrollment reset.",
        );
      }

      const decryptedSecret = decrypt(pendingData.encryptedSecret, rawKey);

      const verification = verifyTotp(decryptedSecret, token);

      if (verification?.valid !== true) {
        tx.update(pendingRef, {
          failedAttempts: FieldValue.increment(1),
          lastFailedAttempt: FieldValue.serverTimestamp(),
        });
        throw new ValidationError("Invalid TOTP code");
      }

      const existing = await tx.get(totpRef);
      if (existing.exists) {
        throw new ConflictError("TOTP already configured");
      }

      tx.set(totpRef, {
        encryptedSecret: pendingData.encryptedSecret,
        enabled: true,
        createdAt: FieldValue.serverTimestamp(),
        lastVerified: FieldValue.serverTimestamp(),
      });

      tx.delete(pendingRef);

      tx.set(
        userRef,
        {
          totp: {
            enabled: true,
            enabledAt: FieldValue.serverTimestamp(),
          },
        },
        { merge: true },
      );
    });

    return { valid: true, message: "TOTP enabled successfully!" };
  } catch (error) {
    console.error("Error in verifyTotpTokenHandler:", error);
    throw handleFunctionError(error, "verifyTotpTokenHandler");
  }
};

// Login Verification + Custom Claims
export const verifyTotpLoginHandler = async (request: any) => {
  try {
    if (!request.auth) {
      throw new AuthenticationError();
    }

    const { token, deviceId } = request.data ?? {};

    if (!token || token.length !== 6 || !/^\d+$/.test(token)) {
      throw new ValidationError("Invalid TOTP token");
    }

    const uid = request.auth.uid;
    const isDev = process.env.NODE_ENV !== "production";

    const limits = {
      uid: {
        maxAttempts: Number(process.env.RL_UID_MAX_ATTEMPTS ?? (isDev ? 2 : 5)),
        windowMs: Number(
          process.env.RL_UID_WINDOW_MS ?? (isDev ? 5_000 : 60_000),
        ),
      },
      ip: {
        maxAttempts: Number(process.env.RL_IP_MAX_ATTEMPTS ?? (isDev ? 5 : 30)),
        windowMs: Number(
          process.env.RL_IP_WINDOW_MS ?? (isDev ? 5_000 : 600_000),
        ),
      },
      device: {
        knownMaxAttempts: Number(
          process.env.RL_DEVICE_KNOWN_MAX ?? (isDev ? 5 : 10),
        ),
        unknownMaxAttempts: Number(
          process.env.RL_DEVICE_UNKNOWN_MAX ?? (isDev ? 2 : 10),
        ),
        windowMs: Number(
          process.env.RL_DEVICE_WINDOW_MS ?? (isDev ? 5_000 : 60_000),
        ),
      },
    };

    // --- RATE LIMIT ---
    const rawHeaders = (request as any).rawRequest?.headers ?? {};
    const forwarded =
      rawHeaders["x-forwarded-for"] ||
      rawHeaders["x-real-ip"] ||
      rawHeaders["x-appengine-user-ip"];

    const clientIp = forwarded ? String(forwarded).split(",")[0].trim() : null;

    try {
      const ACTION = "mfa_totp_login";

      await rateLimit.check(
        "mfa_totp",
        ACTION,
        {
          uid,
          ip: clientIp ?? "",
          deviceId: deviceId ?? "",
        },
        {
          maxAttempts: limits.uid.maxAttempts,
          windowMs: limits.uid.windowMs,
        },
      );
    } catch (err: any) {
      if (err instanceof RateLimitError) {
        return {
          valid: false,
          message: `Too many attempts. Try again in ${err.retryAfterSeconds}s`,
          retryAfterSeconds: err.retryAfterSeconds,
        };
      }
      throw err;
    }

    // --- MFA ---
    const rawKey = await TOTP_ENCRYPTION_KEY.value();
    const totpRef = firestore.collection(TOTP_COLLECTION).doc(uid);
    const totpSnap = await totpRef.get();

    const pendingSnap = await firestore
      .collection(PENDING_COLLECTION)
      .where("uid", "==", uid)
      .where("expiresAt", ">", new Date())
      .limit(1)
      .get();

    if (!totpSnap.exists) {
      if (!pendingSnap.empty) {
        throw new FailedPreconditionError("TOTP verification not completed");
      }

      throw new NotFoundError("TOTP configuration");
    }

    const totpData = totpSnap.data()!;
    if (!totpData.enabled) {
      throw new FailedPreconditionError("TOTP verification not completed");
    }

    const decryptedSecret = decrypt(totpData.encryptedSecret, rawKey);
    const verification = verifyTotp(decryptedSecret, token);

    if (verification?.valid !== true) {
      await firestore
        .collection("Users")
        .doc(uid)
        .set(
          {
            "totp.failedLoginAttempts": FieldValue.increment(1),
            "totp.lastFailedLogin": FieldValue.serverTimestamp(),
          },
          { merge: true },
        );

      return { valid: false, message: "Invalid TOTP code" };
    }

    const matchedStep = verification.matchedStep!;

    // --- TRANSACTION (Replay Protection + State Update) ---
    const txResult = await firestore.runTransaction(async (tx) => {
      const totpDoc = await tx.get(totpRef);

      if (!totpDoc.exists) {
        throw new NotFoundError("TOTP configuration");
      }

      const data = totpDoc.data()!;
      const lastUsedStep = data.lastUsedStep ?? -1;

      // Replay Protection
      if (lastUsedStep >= matchedStep) {
        throw new ConflictError("TOTP already used");
      }

      const userRef = firestore.collection("Users").doc(uid);

      tx.set(
        userRef,
        {
          "totp.failedLoginAttempts": 0,
          "totp.lastVerified": FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

      tx.update(totpRef, {
        lastUsedStep: matchedStep,
        lastVerified: FieldValue.serverTimestamp(),
      });

      return { valid: true };
    });

    if (!txResult.valid) {
      return txResult;
    }

    // --- SUCCESS ---
    await auth.setCustomUserClaims(uid, {
      mfa_verified: true,
      mfa_verified_at: Date.now(),
    });

    return { valid: true, message: "TOTP verification successful" };
  } catch (error) {
    console.error("Error in verifyTotpLoginHandler:", error);
    throw handleFunctionError(error, "verifyTotpLoginHandler");
  }
};

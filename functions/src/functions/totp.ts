//////////////////////// totp.ts /////////////////////////////

// This file contains all the functions for TOTP / HOTP.
// Version: Secure MFA with defineSecret, AES-256-GCM, Custom Claims

//////////////////////////////////////////////////////////////

import { HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import * as Crypto from "crypto";

import { firestore, auth, FieldValue, Timestamp } from "../firebaseAdmin";
import { generateSecret, verifyTotp } from "../security/totpCore";

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
  if (parts.length !== 3) throw new Error("Invalid encrypted data format");
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
    if (!request.auth)
      throw new HttpsError("unauthenticated", "Login required");
    const uid = request.auth.uid;
    const totpRef = firestore.collection(TOTP_COLLECTION).doc(uid);
    const totpSnap = await totpRef.get();
    const enabled = totpSnap.exists && totpSnap.data()?.enabled === true;
    return { enabled };
  } catch (error) {
    console.error("Error in checkTotpStatusHandler:", error);
    throw error;
  }
};

// Start Enrollment
export const createTotpSecretHandler = async (request: any) => {
  try {
    if (!request.auth)
      throw new HttpsError("unauthenticated", "Login required");
    const uid = request.auth.uid;

    const userRef = firestore.collection("Users").doc(uid);
    const userSnap = await userRef.get();
    if (!userSnap.exists) throw new HttpsError("not-found", "User not found");

    const userData = userSnap.data() || {};
    if (userData.totp?.enabled) {
      throw new HttpsError("failed-precondition", "TOTP already enabled");
    }

    const rawKey = await TOTP_ENCRYPTION_KEY.value();

    // search for an existing pending enrollment for this user that hasn't expired yet
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
      // reuse existing enrollment - we can be sure that the doc exists because of the check above
      const doc = pendingQuery.docs[0];
      enrollmentId = doc.id;
      secret = decrypt(doc.data().encryptedSecret, rawKey);
    } else {
      // Rate-Limit: only check if we are creating a new secret
      const lastEnroll =
        userData.totpEnrollment?.lastAttempt?.toDate?.() ?? null;
      if (lastEnroll && Date.now() - lastEnroll.getTime() < 60_000) {
        throw new HttpsError(
          "resource-exhausted",
          "Please wait before requesting a new secret",
        );
      }

      // generate new secret
      secret = generateSecret();

      const encryptedSecret = encrypt(secret, rawKey);
      enrollmentId = Crypto.randomBytes(16).toString("hex"); // Random ID
      const expiresAt = Timestamp.fromMillis(Date.now() + 60 * 60 * 1000); // 1 Hour Expiration
      await firestore.collection(PENDING_COLLECTION).doc(enrollmentId).set({
        uid,
        encryptedSecret,
        createdAt: FieldValue.serverTimestamp(),
        expiresAt,
        failedAttempts: 0,
      });
      createdNew = true;
    }

    // update lastAttempt only if we created a new enrollment (or optionally always - here only on creation)
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
    throw error;
  }
};

// Confirm Enrollment + Enable TOTP
export const verifyTotpTokenHandler = async (request: any) => {
  try {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Login required");
    }

    const { token, enrollmentId: providedEnrollmentId } = request.data ?? {};

    if (!token || token.length !== 6 || !/^\d+$/.test(token)) {
      throw new HttpsError("invalid-argument", "Invalid TOTP token");
    }

    const uid = request.auth.uid;
    const rawKey = await TOTP_ENCRYPTION_KEY.value();
    const totpRef = firestore.collection(TOTP_COLLECTION).doc(uid);
    const userRef = firestore.collection("Users").doc(uid);

    // categorize pendingRef correctly into a DocumentReference with proper typing
    let pendingRef: FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>;

    if (providedEnrollmentId) {
      // use the provided enrollmentId from the client
      pendingRef = firestore
        .collection(PENDING_COLLECTION)
        .doc(providedEnrollmentId);
    } else {
      // search for an existing active enrollment session if no enrollmentId was provided (optional flow)
      const pendingQuery = await firestore
        .collection(PENDING_COLLECTION)
        .where("uid", "==", uid)
        .where("expiresAt", ">", new Date())
        .limit(1)
        .get();

      if (pendingQuery.empty) {
        throw new HttpsError(
          "not-found",
          "Enrollment session not found or expired",
        );
      }

      pendingRef = pendingQuery.docs[0].ref; // DocumentReference direct from QuerySnapshot
    }

    await firestore.runTransaction(async (tx) => {
      const pendingSnap = await tx.get(pendingRef);

      if (!pendingSnap.exists) {
        throw new HttpsError(
          "not-found",
          "Enrollment session not found or expired",
        );
      }

      const pendingData = pendingSnap.data()!;

      if (pendingData.uid !== uid) {
        throw new HttpsError(
          "permission-denied",
          "Enrollment does not belong to this user",
        );
      }

      if (pendingData.expiresAt.toDate() < new Date()) {
        tx.delete(pendingRef);
        throw new HttpsError("deadline-exceeded", "Enrollment session expired");
      }

      // Rate-Limiting and failed attempts handling
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
        throw new HttpsError(
          "failed-precondition",
          "Too many failed attempts. Enrollment reset.",
        );
      }

      const decryptedSecret = decrypt(pendingData.encryptedSecret, rawKey);
      const valid = verifyTotp(decryptedSecret, token);

      if (!valid) {
        tx.update(pendingRef, {
          failedAttempts: FieldValue.increment(1),
          lastFailedAttempt: FieldValue.serverTimestamp(),
        });
        throw new HttpsError("invalid-argument", "Invalid TOTP code");
      }

      const existing = await tx.get(totpRef);
      if (existing.exists) {
        throw new HttpsError("failed-precondition", "TOTP already configured");
      }

      tx.set(totpRef, {
        encryptedSecret: pendingData.encryptedSecret,
        enabled: true,
        createdAt: FieldValue.serverTimestamp(),
        lastVerified: FieldValue.serverTimestamp(),
      });

      // clear the session and set TOTP enabled atomically
      tx.delete(pendingRef);

      tx.set(
        userRef,
        { totp: { enabled: true, enabledAt: FieldValue.serverTimestamp() } },
        { merge: true },
      );
    });

    return { valid: true, message: "TOTP enabled successfully!" };
  } catch (error) {
    console.error("Error in verifyTotpTokenHandler:", error);
    throw error;
  }
};

// Login Verification + Custom Claims
export const verifyTotpLoginHandler = async (request: any) => {
  try {
    if (!request.auth)
      throw new HttpsError("unauthenticated", "Login required");
    const { token } = request.data ?? {};

    if (!token || token.length !== 6 || !/^\d+$/.test(token)) {
      throw new HttpsError("invalid-argument", "Invalid TOTP token");
    }

    const uid = request.auth.uid;
    const rawKey = await TOTP_ENCRYPTION_KEY.value(); // get the key
    const totpRef = firestore.collection(TOTP_COLLECTION).doc(uid);
    const totpSnap = await totpRef.get();
    if (!totpSnap.exists) {
      throw new HttpsError(
        "failed-precondition",
        "TOTP not configured for this user",
      );
    }

    const totpData = totpSnap.data()!;
    if (!totpData.enabled) {
      throw new HttpsError("failed-precondition", "TOTP is disabled");
    }
    const decryptedSecret = decrypt(totpData.encryptedSecret, rawKey);
    const valid = verifyTotp(decryptedSecret, token);

    if (!valid) {
      const userRef = firestore.collection("Users").doc(uid);
      await userRef.set(
        {
          "totp.failedLoginAttempts": FieldValue.increment(1),
          "totp.lastFailedLogin": FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
      return { valid: false, message: "Invalid TOTP code" };
    }

    // Success: Set custom claims
    await auth.setCustomUserClaims(uid, {
      mfa_verified: true,
      mfa_verified_at: Date.now(),
    });

    await firestore.runTransaction(async (tx) => {
      const userRef = firestore.collection("Users").doc(uid);
      tx.set(
        userRef,
        {
          "totp.failedLoginAttempts": 0,
          "totp.lastVerified": FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
      tx.update(totpRef, { lastVerified: FieldValue.serverTimestamp() });
    });
    return { valid: true, message: "TOTP verification successful" };
  } catch (error) {
    console.error("Error in verifyTotpLoginHandler:", error);
    throw error;
  }
};

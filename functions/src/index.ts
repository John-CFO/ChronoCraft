//////////////////////////////////// index.ts ////////////////////////////////////

import * as functions from "firebase-functions";
import admin from "firebase-admin";
import { rateLimit } from "./rateLimitUtility";

//////////////////////////////////////////////////////////////////////////////////

admin.initializeApp();

// Utility-Functions
async function deleteSubcollections(
  db: FirebaseFirestore.Firestore,
  path: string[],
  subs: string[]
) {
  for (const sub of subs) {
    const subRef = db.collection(path.join("/")).doc(sub);
    await subRef.delete();
  }
}

function verifyToken(secret: string, code: string): boolean {
  return secret === code;
}

function logEvent(event: string, level: string, data?: any) {
  console.log(level, event, data ?? "");
}

//////////////////////////////////////////////////////////////////////////////////

// Auth Function
export const authValidator = functions.https.onCall(
  async (request: functions.https.CallableRequest<any>) => {
    const { action, payload } = request.data ?? {};
    const uid = request.auth?.uid;

    if (!action)
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Missing action"
      );

    // Login / register without auth
    if (action === "login" || action === "register") {
      logEvent(`auth ${action}`, "info", { uid });
      return { success: true };
    }

    // Verify TOTP with Rate-Limiting
    if (action === "verifyTotp") {
      if (!uid)
        throw new functions.https.HttpsError(
          "unauthenticated",
          "Not logged in"
        );

      // Rate-Limit: max 5 attempts per minute
      await rateLimit(uid, "verifyTotp", 5, 60_000);

      const userDoc = await admin
        .firestore()
        .collection("Users")
        .doc(uid)
        .get();
      if (!userDoc.exists)
        throw new functions.https.HttpsError("not-found", "User not found");

      const secret = userDoc.data()?.totpSecret;
      if (!secret)
        throw new functions.https.HttpsError(
          "failed-precondition",
          "TOTP not configured"
        );

      const valid = verifyToken(secret, payload);
      logEvent("verifyTotp", valid ? "info" : "warn", { uid, valid });

      return { valid };
    }

    throw new functions.https.HttpsError("invalid-argument", "Unknown action");
  }
);

//////////////////////////////////////////////////////////////////////////////////

// Profile Function
export const profileValidator = functions.https.onCall(
  async (request: functions.https.CallableRequest<any>) => {
    const uid = request.auth?.uid;
    const data = request.data;

    if (!uid)
      throw new functions.https.HttpsError("unauthenticated", "Not logged in");

    const userRef = admin.firestore().collection("Users").doc(uid);
    const snapshot = await userRef.get();
    if (!snapshot.exists)
      throw new functions.https.HttpsError("not-found", "User not found");

    await userRef.update(data);
    logEvent("profile updated", "info", {
      uid,
      updatedFields: Object.keys(data),
    });
    return { success: true };
  }
);

//////////////////////////////////////////////////////////////////////////////////

// Projects & Earnings Function
export const projectsAndWorkValidator = functions.https.onCall(
  async (request: functions.https.CallableRequest<any>) => {
    const uid = request.auth?.uid;
    const { action, payload } = request.data ?? {};

    if (!uid)
      throw new functions.https.HttpsError("unauthenticated", "Not logged in");
    if (!action)
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Missing action"
      );

    if (action === "updateProject") {
      const projRef = admin.firestore().collection("Projects").doc(payload.id);
      const projSnap = await projRef.get();
      const projData = projSnap.data();

      if (!projData) {
        throw new functions.https.HttpsError("not-found", "Project not found");
      }

      if (projData.userId !== uid) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "Not your project"
        );
      }

      await projRef.update(payload);
      logEvent("project updated", "info", { uid, projectId: payload.id });
      return { success: true };
    }

    if (action === "setHourlyRate") {
      const id = `${uid}_${payload.projectId}`;
      await admin
        .firestore()
        .collection("Earnings")
        .doc(id)
        .set(payload, { merge: true });
      logEvent("hourly rate set", "info", { uid, ...payload });
      return { success: true };
    }

    throw new functions.https.HttpsError("invalid-argument", "Unknown action");
  }
);

//////////////////////////////////////////////////////////////////////////////////

// Secure Delete Function
export const secureDelete = functions.https.onCall(
  async (request: functions.https.CallableRequest<any>) => {
    const uid = request.auth?.uid;
    const data = request.data;

    if (!uid)
      throw new functions.https.HttpsError("unauthenticated", "Not logged in");
    if (!data)
      throw new functions.https.HttpsError("invalid-argument", "Missing data");
    if (uid !== data.userId)
      throw new functions.https.HttpsError(
        "permission-denied",
        "Cannot delete others' data"
      );

    await deleteSubcollections(
      admin.firestore(),
      ["Users", data.userId, "Services", data.serviceId],
      data.subs
    );

    logEvent("secure delete", "info", { uid, serviceId: data.serviceId });
    return { success: true };
  }
);

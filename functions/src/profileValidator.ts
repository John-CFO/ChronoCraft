/////////////////////// profileValidator.ts /////////////////////////////////

// This file contains the profileValidator Cloud Function for Firebase

//////////////////////////////////////////////////////////////////////////////

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { ZodError } from "zod";

import { FirestoreUserUpdateSchema } from "../../validation/editProfileSchemas.sec";
import { logEvent } from "./logging/logger";
import { handleFunctionError } from "./errors/handleFunctionError";

/////////////////////////////////////////////////////////////////////////////

export const profileValidator = functions.https.onCall(
  async (request: functions.https.CallableRequest<any>) => {
    const req = request as any;
    const data = req.data;

    // auth check
    const uid = req.auth?.uid ?? req.context?.auth?.uid;
    if (!uid) {
      logEvent("profile update unauthorized", "warn", {
        rawRequest: req.rawRequest,
      });
      throw new functions.https.HttpsError("unauthenticated", "Not logged in");
    }

    try {
      // user existence check
      const snapshot = await admin
        .firestore()
        .collection("Users")
        .doc(uid)
        .get();
      if (!snapshot.exists) {
        logEvent("profile update failed - user missing", "warn", { uid });
        throw new functions.https.HttpsError("not-found", "User not found");
      }

      // zod validation
      const input = FirestoreUserUpdateSchema.parse(data);

      // firestore update
      const userRef = admin.firestore().collection("Users").doc(uid);
      await userRef.update(input);

      logEvent("profile updated", "info", {
        uid,
        updatedFields: Object.keys(input),
      });

      return { success: true };
    } catch (err: unknown) {
      // zod validation error
      if (err instanceof ZodError) {
        const msgs = err.issues.map((i) => i.message).join(", ");
        logEvent("profile update validation error", "error", {
          uid,
          errors: msgs,
        });

        throw new functions.https.HttpsError("invalid-argument", msgs);
      }

      // HTTPS error
      if (err instanceof functions.https.HttpsError) {
        logEvent("profile update HttpsError", "warn", {
          uid,
          error: err.message,
        });
        throw err;
      }

      // unhandled/internal error
      const message = handleFunctionError(err, "profileValidator");
      logEvent("profile update unhandled error", "error", {
        uid,
        error: (err as Error)?.message,
      });

      throw new functions.https.HttpsError(
        (err as any)?.code || "internal",
        message
      );
    }
  }
);

// pure logic export for unit tests
export type ProfileDeps = {
  getUserDoc?: (uid: string) => Promise<{ exists: boolean; data: () => any }>;
  updateUser?: (
    uid: string,
    input: any
  ) => Promise<FirebaseFirestore.WriteResult>;
  logEvent?: typeof logEvent;
};

const defaultProfileDeps: ProfileDeps = {
  getUserDoc: async (uid) =>
    await admin.firestore().collection("Users").doc(uid).get(),
  updateUser: async (uid, input) =>
    await admin.firestore().collection("Users").doc(uid).update(input),
  logEvent,
};

export async function profileValidatorLogic(
  data: any,
  uid: string | undefined,
  deps: ProfileDeps = {}
) {
  const {
    getUserDoc = defaultProfileDeps.getUserDoc!,
    updateUser = defaultProfileDeps.updateUser!,
    logEvent = defaultProfileDeps.logEvent!,
  } = deps;

  if (!uid) {
    logEvent("profile update unauthorized", "warn", {});
    throw new Error("unauthenticated");
  }

  const snapshot = await getUserDoc(uid);
  if (!snapshot.exists) {
    logEvent("profile update failed - user missing", "warn", { uid });
    throw new Error("not-found");
  }

  const input = FirestoreUserUpdateSchema.parse(data);
  await updateUser(uid, input);
  logEvent("profile updated", "info", {
    uid,
    updatedFields: Object.keys(input),
  });
  return { success: true };
}

/////////////////////////// secureDelete.ts //////////////////////////////////

// This file contains the secureDelete Cloud Function for Firebase

//////////////////////////////////////////////////////////////////////////////

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { z, ZodError } from "zod";

import { deleteSubcollections } from "../../validation/utils/firestoreDeleteHelpers";
import { logEvent } from "./logging/logger";
import { handleFunctionError } from "./errors/handleFunctionError";

/////////////////////////////////////////////////////////////////////////////

// Schema for secure Delete-Request
const SecureDeleteInputSchema = z.object({
  userId: z.string(),
  serviceId: z.string(),
  subs: z.array(z.string()),
});

export const secureDelete = functions.https.onCall(
  async (request: functions.https.CallableRequest<any>) => {
    const req = request as any;
    const data = req.data as
      | { userId: string; serviceId: string; subs: string[] }
      | undefined;

    const uid = req.auth?.uid ?? req.context?.auth?.uid;

    // auth check
    if (!uid) {
      logEvent("secureDelete unauthenticated access", "warn", {
        rawRequest: req.rawRequest,
      });
      throw new functions.https.HttpsError("unauthenticated", "Not logged in");
    }

    if (!data) {
      logEvent("secureDelete missing data", "warn", { uid });
      throw new functions.https.HttpsError("invalid-argument", "Missing data");
    }

    // user check
    if (uid !== data.userId) {
      logEvent("secureDelete permission denied", "warn", {
        uid,
        targetUser: data.userId,
      });
      throw new functions.https.HttpsError(
        "permission-denied",
        "Cannot delete others' data"
      );
    }

    try {
      // validation
      const input = SecureDeleteInputSchema.parse(data);

      await deleteSubcollections(
        admin.firestore() as any,
        ["Users", input.userId, "Services", input.serviceId],
        input.subs
      );

      logEvent("secureDelete success", "info", {
        uid,
        serviceId: input.serviceId,
      });
      return { success: true };
    } catch (err: unknown) {
      if (err instanceof ZodError) {
        const msgs = err.issues.map((i) => i.message).join(", ");
        logEvent("secureDelete validation error", "error", {
          uid,
          errors: msgs,
        });
        throw new functions.https.HttpsError("invalid-argument", msgs);
      }

      if (err instanceof functions.https.HttpsError) {
        logEvent("secureDelete HttpsError", "warn", {
          uid,
          error: err.message,
        });
        throw err;
      }

      const e = err as Error;
      logEvent("secureDelete unhandled error", "error", {
        uid,
        error: e.message,
      });
      throw new functions.https.HttpsError(
        (err as any)?.code || "internal",
        handleFunctionError(e)
      );
    }
  }
);

// ---- pure logic export for unit tests ----
export type SecureDeleteDeps = {
  deleteSubcollections?: (
    db: any,
    path: string[],
    subs: string[]
  ) => Promise<void>;
  logEvent?: typeof logEvent;
};

const defaultSecureDeps: SecureDeleteDeps = {
  deleteSubcollections: async (db: any, path: string[], subs: string[]) =>
    await deleteSubcollections(db, path, subs),
  logEvent,
};

export async function secureDeleteLogic(
  data: { userId: string; serviceId: string; subs: string[] } | undefined,
  uid: string | undefined,
  deps: SecureDeleteDeps = {}
) {
  const {
    deleteSubcollections = defaultSecureDeps.deleteSubcollections!,
    logEvent = defaultSecureDeps.logEvent!,
  } = deps;

  if (!uid) {
    logEvent("secureDelete unauthenticated access", "warn", {});
    throw new Error("unauthenticated");
  }
  if (!data) {
    logEvent("secureDelete missing data", "warn", { uid });
    throw new Error("missing-data");
  }
  if (uid !== data.userId) {
    logEvent("secureDelete permission denied", "warn", {
      uid,
      targetUser: data.userId,
    });
    throw new Error("permission-denied");
  }

  const input = SecureDeleteInputSchema.parse(data);
  await deleteSubcollections(
    null as any,
    ["Users", input.userId, "Services", input.serviceId],
    input.subs
  );
  logEvent("secureDelete success", "info", { uid, serviceId: input.serviceId });
  return { success: true };
}

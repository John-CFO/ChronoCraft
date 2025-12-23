////////////////////////////// index.ts //////////////////////////////////

// This file contains the Cloud Functions for Firebase

///////////////////////////////////////////////////////////////////////////

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { z } from "zod";

import {
  LoginInputSchema,
  RegisterInputSchema,
  TotpCodeSchema,
} from "../../validation/authSchemas.sec";
import { FirestoreUserUpdateSchema } from "../../validation/editProfileSchemas.sec";
import { ProjectUpdateSchema } from "../../validation/firestoreSchemas.sec";
import { HourlyRateSchema } from "../../validation/earningsSchemas.sec";
import { deleteSubcollections } from "../../validation/utils/firestoreDeleteHelpers";
import { verifyToken } from "../../validation/utils/totp";
import { logEvent } from "./logging/logger";
import { handleFunctionError } from "./errors/handleFunctionError";

/////////////////////////////////////////////////////////////////////////////

// initialize Firebase app if not already initialized, so it can access Firestore with admin privileges
if (!admin.apps.length) {
  admin.initializeApp();
}

// type the user payload
type AuthRequestPayload = {
  action: "login" | "register" | "verifyTotp";
  payload: unknown;
  secret?: string;
  code?: string;
};

/////////////////////////////////////////////////////////////////////////////

// authValidator
export const authValidator = functions.https.onCall(async (request) => {
  const req = request as any;
  const { action, payload } = req.data as AuthRequestPayload;
  const authContext = req.context?.auth;

  try {
    if (action === "verifyTotp" && !authContext?.uid) {
      throw new functions.https.HttpsError("unauthenticated", "Not logged in");
    }

    switch (action) {
      case "login":
        LoginInputSchema.parse(payload);
        logEvent("auth login", "info", { uid: authContext?.uid });
        return { success: true };

      case "register":
        RegisterInputSchema.parse(payload);
        logEvent("auth register", "info", { uid: authContext?.uid });
        return { success: true };

      case "verifyTotp": {
        const inputCode: string = TotpCodeSchema.parse(payload);
        const userRef = admin
          .firestore()
          .collection("Users")
          .doc(authContext!.uid);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
          throw new functions.https.HttpsError("not-found", "User not found");
        }

        const secret: string | undefined = userDoc.data()?.totpSecret;
        if (!secret) {
          throw new functions.https.HttpsError(
            "failed-precondition",
            "TOTP not setup"
          );
        }

        const valid = verifyToken(secret, inputCode);
        logEvent("verifyTotp", "info", { uid: authContext!.uid, valid });
        return { valid };
      }

      default:
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Unknown action"
        );
    }
  } catch (err: unknown) {
    logEvent("authValidator error", "error", {
      error: err,
      uid: authContext?.uid,
    });
    const message = handleFunctionError(err);
    throw new functions.https.HttpsError(
      (err as any)?.code ?? "internal",
      message
    );
  }
});

// profileValidator
export const profileValidator = functions.https.onCall(
  async (request: functions.https.CallableRequest<unknown>) => {
    const req = request as any;
    const context = req.context;

    try {
      if (!context.auth?.uid) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          "Not logged in"
        );
      }

      const input = FirestoreUserUpdateSchema.parse(req.data);
      const userRef = admin
        .firestore()
        .collection("Users")
        .doc(context.auth.uid);
      await userRef.update(input);

      logEvent("profile update", "info", {
        uid: context.auth.uid,
        changes: input,
      });
      return { success: true };
    } catch (err: unknown) {
      logEvent("profileValidator error", "error", {
        error: err,
        uid: context.auth?.uid,
      });
      const message = handleFunctionError(err);
      throw new functions.https.HttpsError(
        (err as any)?.code ?? "internal",
        message
      );
    }
  }
);

// projectsAndWorkValidator
type ProjectsRequestPayload = {
  action: "updateProject" | "setHourlyRate";
  payload: unknown;
};

export const projectsAndWorkValidator = functions.https.onCall(
  async (request: functions.https.CallableRequest<ProjectsRequestPayload>) => {
    const req = request as any;
    const context = req.context;

    try {
      if (!context.auth?.uid) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          "Not logged in"
        );
      }

      const { action, payload } = req.data;

      // updateProject
      if (action === "updateProject") {
        const input = ProjectUpdateSchema.parse(payload);
        const projRef = admin.firestore().collection("Projects").doc(input.id);
        const projSnap = await projRef.get();

        const projData = projSnap.data();
        if (!projData) {
          throw new functions.https.HttpsError(
            "not-found",
            "Project not found"
          );
        }

        if (projData.userId !== context.auth.uid) {
          throw new functions.https.HttpsError(
            "permission-denied",
            "Not your project"
          );
        }

        await projRef.update(input);

        logEvent("project update", "info", {
          uid: context.auth.uid,
          projectId: input.id,
        });
        return { success: true };
      }

      // setHourlyRate
      if (action === "setHourlyRate") {
        const parsed = HourlyRateSchema.parse(payload);

        const safeInput = {
          ...parsed,
          userId: context.auth.uid, // Ownership enforced
        };

        const rateRef = admin
          .firestore()
          .collection("Earnings")
          .doc(`${safeInput.userId}_${safeInput.projectId}`);

        await rateRef.set(safeInput, { merge: true });

        logEvent("hourly rate set", "info", {
          uid: context.auth.uid,
          userId: safeInput.userId,
          projectId: safeInput.projectId,
          hourlyRate: safeInput.hourlyRate,
        });
        return { success: true };
      }

      // Unknown action
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Unknown action"
      );
    } catch (err: unknown) {
      logEvent("projectsAndWorkValidator error", "error", {
        error: err,
        uid: context.auth?.uid,
      });
      const message = handleFunctionError(err);
      throw new functions.https.HttpsError(
        (err as any)?.code ?? "internal",
        message
      );
    }
  }
);

// secureDelete
const SecureDeleteInputSchema = z.object({
  userId: z.string(),
  serviceId: z.string(),
  subs: z.array(z.string()),
});

export const secureDelete = functions.https.onCall(
  async (request: functions.https.CallableRequest<unknown>) => {
    const req = request as any;
    const context = req.context;

    try {
      if (!context.auth?.uid) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          "Not logged in"
        );
      }

      const data = req.data as {
        userId: string;
        serviceId: string;
        subs: string[];
      };

      if (context.auth.uid !== data.userId) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "Cannot delete others' data"
        );
      }

      const input = SecureDeleteInputSchema.parse(data);
      await deleteSubcollections(
        admin.firestore() as any,
        ["Users", input.userId, "Services", input.serviceId],
        input.subs
      );

      logEvent("secure delete", "info", {
        uid: context.auth.uid,
        serviceId: input.serviceId,
      });
      return { success: true };
    } catch (err: unknown) {
      logEvent("secureDelete error", "error", {
        error: err,
        uid: context.auth?.uid,
      });
      const message = handleFunctionError(err);
      throw new functions.https.HttpsError(
        (err as any)?.code ?? "internal",
        message
      );
    }
  }
);

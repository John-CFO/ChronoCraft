//////////////////// projectsAndWorkValidator.ts //////////////////////////////

// This file contains the projectsAndWorkValidator Cloud Function for Firebase

//////////////////////////////////////////////////////////////////////////////

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { ZodError } from "zod";

import { ProjectUpdateSchema } from "../../validation/firestoreSchemas.sec";
import { HourlyRateSchema } from "../../validation/earningsSchemas.sec";
import { logEvent } from "./logging/logger";
import { handleFunctionError } from "./errors/handleFunctionError";

/////////////////////////////////////////////////////////////////////////////

// interface the function accepts
interface ProjectsRequestData {
  action: "updateProject" | "setHourlyRate";
  payload: any;
}

/////////////////////////////////////////////////////////////////////////////

export const projectsAndWorkValidator = functions.https.onCall(
  async (request: functions.https.CallableRequest<any>) => {
    const req = request as any;
    const data = req.data as ProjectsRequestData | undefined;
    const uid = req.auth?.uid ?? req.context?.auth?.uid;

    // auth check
    if (!uid) {
      logEvent("projectsAndWork unauthorized access", "warn", {
        rawRequest: req.rawRequest,
      });
      throw new functions.https.HttpsError("unauthenticated", "Not logged in");
    }

    if (!data?.action) {
      logEvent("projectsAndWork missing action", "warn", { uid });
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Missing action"
      );
    }

    try {
      if (data.action === "updateProject") {
        const input = ProjectUpdateSchema.parse(data.payload);

        // Ownership / existence check
        const projectDoc = await admin
          .firestore()
          .collection("Projects")
          .doc(input.id)
          .get();
        if (!projectDoc.exists) {
          logEvent("updateProject failed - project not found", "warn", {
            uid,
            projectId: input.id,
          });
          throw new functions.https.HttpsError(
            "not-found",
            "Project not found"
          );
        }

        await admin
          .firestore()
          .collection("Projects")
          .doc(input.id)
          .update(input);
        logEvent("project updated", "info", { uid, projectId: input.id });
        return { success: true };
      }

      if (data.action === "setHourlyRate") {
        const input = HourlyRateSchema.parse(data.payload);

        const rateRef = admin
          .firestore()
          .collection("Earnings")
          .doc(`${input.userId}_${input.projectId}`);
        await rateRef.set(input, { merge: true });

        logEvent("hourly rate set", "info", {
          uid,
          userId: input.userId,
          projectId: input.projectId,
          hourlyRate: input.hourlyRate,
        });
        return { success: true };
      }

      logEvent("projectsAndWork unknown action", "warn", {
        uid,
        action: data.action,
      });
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Unknown action"
      );
    } catch (err: unknown) {
      if (err instanceof ZodError) {
        const msgs = err.issues.map((i) => i.message).join(", ");
        logEvent("projectsAndWork validation error", "error", {
          uid,
          errors: msgs,
        });
        throw new functions.https.HttpsError("invalid-argument", msgs);
      }

      if (err instanceof functions.https.HttpsError) {
        logEvent("projectsAndWork HttpsError", "warn", {
          uid,
          error: err.message,
        });
        throw err;
      }

      const message = handleFunctionError(err, "projectsAndWorkValidator");
      logEvent("projectsAndWork unhandled error", "error", {
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
export type ProjectsDeps = {
  getProjectDoc?: (id: string) => Promise<{ exists: boolean; data: () => any }>;
  updateProject?: (
    id: string,
    input: any
  ) => Promise<FirebaseFirestore.WriteResult>;
  setRate?: (id: string, input: any) => Promise<FirebaseFirestore.WriteResult>;
  logEvent?: typeof logEvent;
};

const defaultProjectsDeps: ProjectsDeps = {
  getProjectDoc: async (id) =>
    await admin.firestore().collection("Projects").doc(id).get(),
  updateProject: async (id, input) =>
    await admin.firestore().collection("Projects").doc(id).update(input),
  setRate: async (id, input) =>
    await admin
      .firestore()
      .collection("Earnings")
      .doc(id)
      .set(input, { merge: true }),
  logEvent,
};

export async function projectsAndWorkLogic(
  data: ProjectsRequestData | undefined,
  uid: string | undefined,
  deps: ProjectsDeps = {}
) {
  const {
    getProjectDoc = defaultProjectsDeps.getProjectDoc!,
    updateProject = defaultProjectsDeps.updateProject!,
    setRate = defaultProjectsDeps.setRate!,
    logEvent = defaultProjectsDeps.logEvent!,
  } = deps;

  if (!uid) {
    logEvent("projectsAndWork unauthorized access", "warn", {});
    throw new Error("unauthenticated");
  }
  if (!data?.action) {
    logEvent("projectsAndWork missing action", "warn", { uid });
    throw new Error("missing-action");
  }

  if (data.action === "updateProject") {
    const input = ProjectUpdateSchema.parse(data.payload);
    const projectDoc = await getProjectDoc(input.id);
    if (!projectDoc.exists) {
      logEvent("updateProject failed - project not found", "warn", {
        uid,
        projectId: input.id,
      });
      throw new Error("not-found");
    }
    const projData = projectDoc.data();
    if (projData.userId !== uid) {
      throw new Error("permission-denied");
    }
    await updateProject(input.id, input);
    logEvent("project updated", "info", { uid, projectId: input.id });
    return { success: true };
  }

  if (data.action === "setHourlyRate") {
    const input = HourlyRateSchema.parse(data.payload);
    const id = `${input.userId}_${input.projectId}`;
    await setRate(id, input);
    logEvent("hourly rate set", "info", {
      uid,
      userId: input.userId,
      projectId: input.projectId,
      hourlyRate: input.hourlyRate,
    });
    return { success: true };
  }

  logEvent("projectsAndWork unknown action", "warn", {
    uid,
    action: data?.action,
  });
  throw new Error("unknown-action");
}

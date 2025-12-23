///////////////////////// firebaseFunctions.ts ///////////////////////////

// This file initializes the Cloud Functions for Firebase

///////////////////////////////////////////////////////////////////////////

import { getFunctions, httpsCallable } from "firebase/functions";
import { FirebaseError } from "firebase/app";
import { z } from "zod";

import {
  LoginInputSchema,
  RegisterInputSchema,
  TotpCodeSchema,
} from "./validation/authSchemas.sec";
import { FirestoreUserUpdateSchema } from "./validation/editProfileSchemas.sec";
import { ProjectUpdateSchema } from "./validation/firestoreSchemas.sec";
import { HourlyRateSchema } from "./validation/earningsSchemas.sec";

///////////////////////////////////////////////////////////////////////////

const functions = getFunctions();

// authValidator
export const callAuthValidator = async (
  action: "login" | "register" | "verifyTotp",
  payload: unknown
) => {
  try {
    // Client-side Zod Validation optional, extra safety
    if (action === "login") LoginInputSchema.parse(payload);
    if (action === "register") RegisterInputSchema.parse(payload);
    if (action === "verifyTotp") TotpCodeSchema.parse(payload);

    const func = httpsCallable(functions, "authValidator");
    const result = await func({ action, payload });
    return result.data;
  } catch (err: any) {
    if (err instanceof z.ZodError) throw err;
    if ((err as FirebaseError).code) throw err;
    throw new Error(err.message || "Unknown error calling authValidator");
  }
};

// profileValidator
export const callProfileValidator = async (payload: unknown) => {
  try {
    FirestoreUserUpdateSchema.parse(payload); // client-side validation
    const func = httpsCallable(functions, "profileValidator");
    const result = await func(payload);
    return result.data;
  } catch (err: any) {
    if (err instanceof z.ZodError) throw err;
    throw new Error(err.message || "Unknown error calling profileValidator");
  }
};

// projectsAndWorkValidator
export const callProjectsAndWorkValidator = async (
  action: "updateProject" | "setHourlyRate",
  payload: unknown
) => {
  try {
    if (action === "updateProject") ProjectUpdateSchema.parse(payload);
    if (action === "setHourlyRate") HourlyRateSchema.parse(payload);

    const func = httpsCallable(functions, "projectsAndWorkValidator");
    const result = await func({ action, payload });
    return result.data;
  } catch (err: any) {
    if (err instanceof z.ZodError) throw err;
    throw new Error(
      err.message || "Unknown error calling projectsAndWorkValidator"
    );
  }
};

// secureDelete
const SecureDeleteInputSchema = z.object({
  userId: z.string(),
  serviceId: z.string(),
  subs: z.array(z.string()),
});

export const callSecureDelete = async (payload: unknown) => {
  try {
    const input = SecureDeleteInputSchema.parse(payload);
    const func = httpsCallable(functions, "secureDelete");
    const result = await func(input);
    return result.data;
  } catch (err: any) {
    if (err instanceof z.ZodError) throw err;
    throw new Error(err.message || "Unknown error calling secureDelete");
  }
};

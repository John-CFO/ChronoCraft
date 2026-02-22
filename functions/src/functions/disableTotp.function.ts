//////////////////////////// disableTotp.function.ts ////////////////////////////

// This file contains the implementation of the disableTotpHandler function,
// which is used to disable TOTP authentication for a user.

//////////////////////////////////////////////////////////////////////////////////

import * as admin from "firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

//////////////////////////////////////////////////////////////////////////////////

export const disableTotpHandler = async (req: any) => {
  const uid = req.auth?.uid;
  if (!uid) throw new Error("Unauthenticated");

  const db = admin.firestore();
  const userRef = db.collection("Users").doc(uid);
  const mfaRef = db.collection("mfa_totp").doc(uid);

  const batch = db.batch();

  // delete MFA-fields in Users document
  batch.update(userRef, {
    totp: FieldValue.delete(),
    totpEnrollment: FieldValue.delete(),
  });

  // delete MFA document in mfa_totp collection
  batch.delete(mfaRef);

  await batch.commit();

  return { success: true, message: "TOTP disabled successfully" };
};

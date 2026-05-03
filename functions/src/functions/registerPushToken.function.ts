//////////////////////// registerPushToken.function.ts //////////////////////////

// This file contains the handler function for the registerPushToken function

/////////////////////////////////////////////////////////////////////////////////////

import { CallableRequest, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

/////////////////////////////////////////////////////////////////////////////////////

// initialize firestore
const db = getFirestore();

export const registerPushToken = async (
  request: CallableRequest<{ token: string }>,
) => {
  const uid = request.auth?.uid;
  const token = request.data?.token;

  if (!uid) {
    throw new HttpsError("unauthenticated", "Not logged in");
  }

  if (typeof token !== "string" || token.length === 0) {
    throw new HttpsError("invalid-argument", "Invalid token");
  }

  const userRef = db.collection("Users").doc(uid);

  const snap = await userRef.get();
  const previousToken = snap.exists ? snap.data()?.pushToken : null;

  const isFirstRegistration = !previousToken;

  await userRef.set(
    {
      pushToken: token,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  if (isFirstRegistration) {
    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: token,
        title: "Welcome to ChronoCraft! ⏱️",
        body: "We're glad you’ve joined. Let’s track time like a pro.",
      }),
    });
  }

  return { success: true };
};

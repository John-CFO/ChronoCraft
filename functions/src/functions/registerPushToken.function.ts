//////////////////////// registerPushToken.function.ts //////////////////////////

// This file contains the handler function for the registerPushToken function

/////////////////////////////////////////////////////////////////////////////////////

import { CallableRequest, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

import { getTranslation } from "../services/localization/i18n";

/////////////////////////////////////////////////////////////////////////////////////

// initialize firestore
const db = getFirestore();

export const sendWelcomeNotification = async (
  token: string,
  language?: string,
) => {
  const t = await getTranslation(language);

  const response = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      to: token,
      title: t("push.welcomeTitle"),
      body: t("push.welcomeBody"),
    }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new HttpsError(
      "internal",
      `Expo Push API error: ${JSON.stringify(result)}`,
    );
  }
};

export const registerPushToken = async (
  request: CallableRequest<{ token: string; language: string }>,
) => {
  const t = await getTranslation(request.data?.language);
  const uid = request.auth?.uid;
  const token = request.data?.token;

  if (!uid) {
    throw new HttpsError("unauthenticated", t("errors.notLoggedIn"));
  }

  if (typeof token !== "string" || token.length === 0) {
    throw new HttpsError("invalid-argument", t("validation.invalidToken"));
  }

  const userRef = db.collection("Users").doc(uid);
  const snap = await userRef.get();
  const previousToken = snap.exists ? snap.data()?.pushToken : null;

  await userRef.set(
    {
      pushToken: token,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  return { success: true, previousToken };
};

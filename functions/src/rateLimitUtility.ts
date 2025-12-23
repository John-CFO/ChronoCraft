import * as functions from "firebase-functions";
import { Timestamp } from "firebase-admin/firestore";
import admin from "firebase-admin";

export async function rateLimit(
  uid: string,
  action: string,
  max: number,
  windowMs: number
) {
  const db = admin.firestore();
  const ref = db.collection("RateLimits").doc(`${uid}_${action}`);
  const now = Date.now();

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);

    if (!snap.exists) {
      tx.set(ref, {
        count: 1,
        resetAt: Timestamp.fromMillis(now + windowMs),
      });
      return;
    }

    const data = snap.data()!;
    const resetAt = data.resetAt.toMillis();

    if (now >= resetAt) {
      tx.set(ref, {
        count: 1,
        resetAt: Timestamp.fromMillis(now + windowMs),
      });
      return;
    }

    if (data.count >= max) {
      throw new functions.https.HttpsError(
        "resource-exhausted",
        "Too many attempts"
      );
    }

    tx.update(ref, { count: data.count + 1 });
  });
}

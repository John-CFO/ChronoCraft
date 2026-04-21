import { FIREBASE_AUTH } from "../firebaseConfig";

export async function ensureAuthReady() {
  const user = FIREBASE_AUTH.currentUser;
  if (!user) throw new Error("AUTH_NOT_READY");

  await user.getIdToken(true);
  return user;
}

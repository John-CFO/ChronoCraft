//////////////////////////////////authHelper.ts////////////////////////////////////

/**
 * - Validates the user's Firestore doc before deciding to call setUser(u)
 * - If Firestore doc is invalid -> avoid auto-login (setUser(null))
 * - If totpEnabled === true -> DO NOT setUser (login flow must handle TOTP)
 * - On Firestore errors: logs and falls back to setUser(u) to avoid locking the user out.
 */

///////////////////////////////////////////////////////////////////////////////////

import { doc, getDoc } from "firebase/firestore";
import { User } from "firebase/auth";

import { FIREBASE_FIRESTORE } from "../firebaseConfig";
import { FirestoreUserSchema } from "./firestoreSchemas";

///////////////////////////////////////////////////////////////////////////////////

export const handleAuthStateChange = async (
  u: User | null,
  setUser: (u: User | null) => void
) => {
  // No user -> explicit logout
  if (!u) {
    setUser(null);
    return;
  }

  try {
    // get user doc from firestore to check if TOTP is enabled
    const uref = doc(FIREBASE_FIRESTORE, "Users", u.uid);
    const snap = await getDoc(uref);

    if (!snap.exists()) {
      // No user doc: OK to set auth user (no TOTP info)
      setUser(u);
      return;
    }

    const raw = snap.data() as unknown;
    const parsed = FirestoreUserSchema.safeParse(raw);

    if (!parsed.success) {
      // AppSec: don't trust invalid firestore data — block auto-login
      console.warn("[Auth] invalid user doc:", parsed.error);
      setUser(null);
      return;
    }

    // If TOTP is enabled block auto-login: don't set the user (Login screen handles TOTP flow)
    if (parsed.data.totpEnabled) {
      // NOT seUser(u);
      return;
    }

    // set the Firebase auth user into app state
    setUser(u);
  } catch (err) {
    // log and fallback to set user (avoid leaving app in limbo)
    console.error("[Auth] handleAuthStateChange error:", err);
    setUser(u);
  }
};

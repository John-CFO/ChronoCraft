///////////////////////// authValidator (E2E) //////////////////////////
//
// Real E2E test via Firebase Emulators
//
////////////////////////////////////////////////////////////////////////

import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInWithCustomToken,
  connectAuthEmulator,
} from "firebase/auth";
import {
  getFunctions,
  httpsCallable,
  connectFunctionsEmulator,
} from "firebase/functions";
import {
  getFirestore,
  connectFirestoreEmulator,
  doc,
  setDoc,
} from "firebase/firestore";

////////////////////////////////////////////////////////////////////////

// use Emulator-Project-ID
const app = initializeApp({
  projectId: "chrono-craft-worktime-manager",
});

const auth = getAuth(app);
const functions = getFunctions(app);
const db = getFirestore(app);

// use localhost
connectAuthEmulator(auth, "http://localhost:5001");
connectFunctionsEmulator(functions, "localhost", 4001);
connectFirestoreEmulator(db, "localhost", 8001);

type AuthResponse = {
  success?: boolean;
  valid?: boolean;
};

////////////////////////////////////////////////////////////////////////

describe("authValidator (E2E)", () => {
  const uid = "testUser";
  const secretCode = "123456";

  beforeAll(async () => {
    // minimal user for TOTP
    await setDoc(doc(db, "Users", uid), {
      totpSecret: secretCode,
    });

    // Fake-Login im Auth Emulator
    await signInWithCustomToken(
      auth,
      // Emulator accepts each token with uid
      Buffer.from(JSON.stringify({ uid })).toString("base64")
    );
  });

  it("allows login without auth", async () => {
    const call = httpsCallable<
      { action: string; payload?: string },
      AuthResponse
    >(functions, "authValidator");

    const res = await call({ action: "login" });
    expect(res.data.success).toBe(true);
  });

  it("rejects verifyTotp without auth", async () => {
    const call = httpsCallable(functions, "authValidator");

    // logout first
    await auth.signOut();

    await expect(
      call({ action: "verifyTotp", payload: secretCode })
    ).rejects.toMatchObject({
      code: "functions/unauthenticated",
    });
  });

  it("enforces rate-limiting on verifyTotp", async () => {
    const call = httpsCallable<
      { action: string; payload?: string },
      AuthResponse
    >(functions, "authValidator");

    // login again
    await signInWithCustomToken(
      auth,
      Buffer.from(JSON.stringify({ uid })).toString("base64")
    );

    const maxAttempts = 5;

    for (let i = 0; i < maxAttempts; i++) {
      const res = await call({
        action: "verifyTotp",
        payload: secretCode,
      });

      expect(res.data.valid).toBe(true);
    }

    await expect(
      call({ action: "verifyTotp", payload: secretCode })
    ).rejects.toMatchObject({
      code: "functions/resource-exhausted",
    });
  });
});

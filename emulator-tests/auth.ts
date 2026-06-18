// emulator-tests/auth.ts

import { auth } from "./setup";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";

export const TEST_USER = {
  email: "testuser@local.test",
  password: "Test1234!",
};

export async function ensureTestUser() {
  try {
    await signInWithEmailAndPassword(auth, TEST_USER.email, TEST_USER.password);
  } catch {
    await createUserWithEmailAndPassword(
      auth,
      TEST_USER.email,
      TEST_USER.password,
    );

    await signInWithEmailAndPassword(auth, TEST_USER.email, TEST_USER.password);
  }

  await new Promise((r) => setTimeout(r, 300));
}

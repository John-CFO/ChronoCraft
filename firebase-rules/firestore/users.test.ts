//////////////////////////////////// users.test.ts //////////////////////////////////////

// This file contains the firestore unit tests

/////////////////////////////////////////////////////////////////////////////////////////

import {
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  collection,
} from "firebase/firestore";
import { afterAll, beforeAll, beforeEach, test } from "vitest";
import { assertFails, assertSucceeds } from "@firebase/rules-unit-testing";

import { setupTestEnv } from "../testEnv";

//////////////////////////////////////////////////////////////////////////////////////////

// setup the test environment
let env: Awaited<ReturnType<typeof setupTestEnv>>;

// get a user or anonymous context
const user = (uid: string) => env.authenticatedContext(uid);
const anon = () => env.unauthenticatedContext();

beforeAll(async () => {
  env = await setupTestEnv();
});

afterAll(async () => {
  if (env) await env.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
});

test("owner can access own deep subcollection", async () => {
  const db = user("userA").firestore();
  await assertSucceeds(
    setDoc(doc(db, "Users/userA/Services/s1/Projects/p1/Notes/n1"), {
      text: "x",
    }),
  );
});

test("owner can create own user document", async () => {
  const db = user("userA").firestore();
  await assertSucceeds(setDoc(doc(db, "Users/userA"), { name: "A" }));
});

test("owner can read own user document", async () => {
  const db = user("userA").firestore();
  await assertSucceeds(getDoc(doc(db, "Users/userA")));
});

test("deny read of another user's document", async () => {
  const db = user("userA").firestore();
  await assertFails(getDoc(doc(db, "Users/userB")));
});

test("deny unauthenticated write", async () => {
  const db = anon().firestore();
  await assertFails(setDoc(doc(db, "Users/userA"), { name: "A" }));
});

test("deny collection listing", async () => {
  const db = user("userA").firestore();
  await assertFails(getDocs(collection(db, "Users")));
});

test("deny update of another user's document", async () => {
  const db = user("userA").firestore();
  await assertFails(
    setDoc(doc(db, "Users/userB"), { name: "hacked" }, { merge: true }),
  );
});

test("deny delete of own user document", async () => {
  const db = user("userA").firestore();
  await assertFails(deleteDoc(doc(db, "Users/userA")));
});

test.each([
  "Users/userB/Services/s1",
  "Users/userB/Services/s1/Projects/p1",
  "Users/userB/Services/s1/Projects/p1/Notes/n1",
  "Users/userB/Services/s1/WorkHours/w1",
  "Users/userB/Services/s1/Vacations/v1",
])("deny cross-user get on %s", async (path) => {
  const db = user("userA").firestore();
  await assertFails(getDoc(doc(db, path)));
});

test("deny access to security collection even when authenticated", async () => {
  const db = user("userA").firestore();
  await assertFails(getDoc(doc(db, "security/anything")));
});

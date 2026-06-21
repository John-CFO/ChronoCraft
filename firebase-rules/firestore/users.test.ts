//////////////////////////////////// users.test.ts //////////////////////////////////////

// This file contains the firestore unit tests

/////////////////////////////////////////////////////////////////////////////////////////

import { collection, doc, getDoc, getDocs, setDoc } from "firebase/firestore";
import { afterEach, beforeEach, expect, test } from "vitest";

import { setupTestEnv } from "../testEnv";

//////////////////////////////////////////////////////////////////////////////////////////

// setup the test environment
let env: Awaited<ReturnType<typeof setupTestEnv>>;

// get a user or anonymous context
const user = (uid: string) => env.authenticatedContext(uid);
const anon = () => env.unauthenticatedContext();

beforeEach(async () => {
  env = await setupTestEnv();
});

afterEach(async () => {
  if (env) await env.cleanup();
});

test("owner can create own user document", async () => {
  const db = user("userA").firestore();

  await expect(
    setDoc(doc(db, "Users/userA"), { name: "A" }),
  ).resolves.toBeUndefined();
});

test("owner can read own user document", async () => {
  const db = user("userA").firestore();

  await expect(getDoc(doc(db, "Users/userA"))).resolves.toBeDefined();
});

test("deny read of another user's document", async () => {
  const db = user("userA").firestore();

  await expect(getDoc(doc(db, "Users/userB"))).rejects.toBeTruthy();
});

test("deny unauthenticated write", async () => {
  const db = anon().firestore();

  await expect(
    setDoc(doc(db, "Users/userA"), { name: "A" }),
  ).rejects.toBeTruthy();
});

test("deny collection listing", async () => {
  const db = user("userA").firestore();

  await expect(getDocs(collection(db, "Users"))).rejects.toBeTruthy();
});

test("deny deep cross-user access", async () => {
  const db = user("userA").firestore();

  await expect(
    getDoc(doc(db, "Users/userB/Services/service1")),
  ).rejects.toBeTruthy();
});

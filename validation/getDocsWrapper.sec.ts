//////////////////////////////getDocsWrapper.sec.ts////////////////////////////

// This file is using a custom function to validate user data from firestore

///////////////////////////////////////////////////////////////////////////

import {
  CollectionReference,
  getDocs,
  DocumentReference,
  getDoc,
  QuerySnapshot,
  DocumentData,
  DocumentSnapshot,
} from "firebase/firestore";
import { z } from "zod";

///////////////////////////////////////////////////////////////////////////

// This function normalizes a Firestore doc-like object so we can safely call schema on it.
// Accepts both real firestore docs (doc.data() is function) and test-mocks
// where data may be an object.

// function normalizeDocRaw(doc: any) {
//   const rawData = typeof doc.data === "function" ? doc.data() : doc.data;
//   return { id: doc.id, ...rawData };
// }

function normalizeDocRaw(doc: any) {
  const rawData = typeof doc.data === "function" ? doc.data() : doc.data;

  const out: any = { id: doc.id, ...rawData };

  // startDate normalisieren, falls Firestore Timestamp oder Date
  if (out.startDate instanceof Date) {
    out.startDate = out.startDate.toISOString().slice(0, 10); // YYYY-MM-DD
  }
  if (out.startDate?._seconds) {
    out.startDate = new Date(out.startDate._seconds * 1000)
      .toISOString()
      .slice(0, 10);
  }

  // createdAt: Firestore Timestamp → JS Date
  if (out.createdAt?._seconds) {
    out.createdAt = new Date(out.createdAt._seconds * 1000);
  }

  return out;
}

// Validate a collection of documents (firbase snapshots)
// Accepts either a CollectionReference (will call getDocs) OR a snapshot-like object
// (QuerySnapshot<DocumentData> or { docs: any[] } used in tests).
// Returns a Promise<T[]> with only the successfully validated documents.

export async function getValidatedDocs<T>(
  collectionOrSnapshot:
    | CollectionReference
    | QuerySnapshot<DocumentData>
    | { docs: any[] },
  schema: z.ZodSchema<T>
): Promise<T[]> {
  // determine whether we received a snapshot-like object or a collectionRef
  let snapshot: QuerySnapshot<DocumentData> | { docs: any[] };

  if (collectionOrSnapshot && (collectionOrSnapshot as any).docs) {
    // snapshot-like passed directly (tests or onSnapshot callback)
    snapshot = collectionOrSnapshot as { docs: any[] };
  } else {
    // assume CollectionReference
    snapshot = await getDocs(collectionOrSnapshot as CollectionReference);
  }

  const validated: T[] = [];

  for (const doc of (snapshot as any).docs) {
    try {
      const raw = normalizeDocRaw(doc);
      const result = schema.safeParse(raw);
      if (result.success) {
        validated.push(result.data);
      } else {
        console.error("Invalid Firestore document:", doc.id, result.error);
      }
    } catch (err) {
      // swallowed intentionally: safeParse handles errors.
    }
  }

  return validated;
}

// Validate a single document reference (getDoc)
export async function getValidatedDoc<T>(
  docRef: DocumentReference,
  schema: z.ZodSchema<T>
): Promise<T | null> {
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return null;

  const raw = normalizeDocRaw(docSnap);
  const result = schema.safeParse(raw);
  if (!result.success) {
    console.error("Invalid Firestore document:", docSnap.id, result.error);
    return null;
  }

  return result.data;
}

// Synchronous helper validator for use inside onSnapshot callbacks.
// Accepts a QuerySnapshot<DocumentData> or snapshot-like object ({ docs: any[] }).

export function getValidatedDocsFromSnapshot<T>(
  snapshot: QuerySnapshot<DocumentData> | { docs: any[] },
  schema: z.ZodSchema<T>
): T[] {
  const validated: T[] = [];

  for (const doc of (snapshot as any).docs) {
    try {
      const raw = normalizeDocRaw(doc);
      const result = schema.safeParse(raw);
      if (result.success) validated.push(result.data);
      else
        console.error(
          "Invalid Firestore document (snapshot):",
          doc.id,
          result.error
        );
    } catch (err) {
      // swallowed intentionally: safeParse handles errors.
    }
  }

  return validated;
}

// Validate a single DocumentSnapshot (used inside onSnapshot(docRef, ...))
export function getValidatedDocFromSnapshot<T>(
  docSnap: DocumentSnapshot<DocumentData>,
  schema: z.ZodSchema<T>
): T | null {
  try {
    if (!docSnap.exists()) {
      console.error("DocumentSnapshot does not exist:", docSnap.id);
      return null;
    }

    const raw = { id: docSnap.id, ...docSnap.data() };
    const result = schema.safeParse(raw);

    if (!result.success) {
      console.error(
        "Invalid Firestore document (snapshot):",
        docSnap.id,
        result.error
      );
      return null;
    }

    return result.data;
  } catch (err) {
    // swallowed intentionally: safeParse handles errors.
    return null;
  }
}

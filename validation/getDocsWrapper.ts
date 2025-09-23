//////////////////////////////getDocsWrapper.ts////////////////////////////

// This file is using a custom function to validate user data from firestore

///////////////////////////////////////////////////////////////////////////

import {
  CollectionReference,
  getDocs,
  DocumentReference,
  getDoc,
} from "firebase/firestore";
import { z } from "zod";

///////////////////////////////////////////////////////////////////////////

// validate all documents in a collection
export async function getValidatedDocs<T>(
  collectionRef: CollectionReference,
  schema: z.ZodSchema<T>
): Promise<T[]> {
  const snapshot = await getDocs(collectionRef);
  const validated: T[] = [];

  snapshot.docs.forEach((doc) => {
    const result = schema.safeParse({ id: doc.id, ...doc.data() });
    if (result.success) {
      validated.push(result.data);
    } else {
      console.error("Invalid Firestore document:", doc.id, result.error);
    }
  });

  return validated;
}

// validate a single document
export async function getValidatedDoc<T>(
  docRef: DocumentReference,
  schema: z.ZodSchema<T>
): Promise<T | null> {
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return null;

  const result = schema.safeParse({ id: docSnap.id, ...docSnap.data() });
  if (!result.success) {
    console.error("Invalid Firestore document:", docSnap.id, result.error);
    return null;
  }

  return result.data;
}

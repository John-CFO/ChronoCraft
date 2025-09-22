//////////////////////////////getDocsWrapper.ts////////////////////////////

// This file is using a custom function to validate user data from firestore

///////////////////////////////////////////////////////////////////////////

import { CollectionReference, getDocs } from "firebase/firestore";
import { z } from "zod";

///////////////////////////////////////////////////////////////////////////

async function getValidatedDocs<T>(
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

export default getValidatedDocs;

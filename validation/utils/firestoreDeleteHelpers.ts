//////////////////////////firestoreDeleteHelpers.ts///////////////////////////////////////

// This file provides helper functions to delete data from Firestore.

//////////////////////////////////////////////////////////////////////////////////////////

import {
  Firestore,
  collection,
  getDocs,
  query,
  limit,
  writeBatch,
  DocumentData,
  CollectionReference,
} from "firebase/firestore";

import { isValidFirestoreDocId } from "../../validation/firestoreSchemas.sec";

/////////////////////////////////////////////////////////////////////////////////////////

// Allowed subcollection names that may be deleted by the client.
// Centralizes allowed targets to prevent accidental deletion of unexpected paths.

export const ALLOWED_SUBCOLLECTIONS = [
  "Projects",
  "Vacations",
  "WorkHours",
] as const;

// Delete up to `batchSize` documents from collection defined by pathSegments.
// All path segments MUST be validated (isValidFirestoreDocId).

// Returns number of deleted documents.
// Throws on invalid input or underlying firestore errors.

export async function deleteCollectionBatched(
  firestore: Firestore,
  pathSegments: string[],
  batchSize = 100
): Promise<number> {
  if (!Array.isArray(pathSegments) || pathSegments.length === 0) {
    throw new Error("Empty Firestore path not allowed");
  }

  // basic validation of each path segment
  for (const seg of pathSegments) {
    if (!isValidFirestoreDocId(seg)) {
      throw new Error("Invalid path segment");
    }
  }

  let totalDeleted = 0;

  // loop until collection is depleted (paging by batchSize)
  while (true) {
    // collection expects a tuple for variadic args -> assert non-empty tuple
    const colRef = collection(
      firestore,
      ...(pathSegments as [string, ...string[]])
    ) as CollectionReference<DocumentData>;

    const q = query(colRef, limit(batchSize));
    const snapshot = await getDocs(q);

    if (snapshot.empty) break;

    const batch = writeBatch(firestore);
    snapshot.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();

    totalDeleted += snapshot.size;

    if (snapshot.size < batchSize) break;
  }

  return totalDeleted;
}

// Delete a list of allowed subcollections under a parent path represented as segments.
// Example parentPathSegments: ['Users', user.uid, 'Services', serviceId']

// Special-case: when subcollection === "Projects", it will iterate projects and
// delete nested "Notes" subcollections for each project (with the same safety guards).

// Throws on invalid parent segments or underlying firestore errors.

export async function deleteSubcollections(
  firestore: Firestore,
  parentPathSegments: string[],
  subs: string[]
): Promise<void> {
  if (!Array.isArray(parentPathSegments) || parentPathSegments.length === 0) {
    throw new Error("Empty parent path not allowed");
  }

  for (const seg of parentPathSegments) {
    if (!isValidFirestoreDocId(seg)) {
      throw new Error("Invalid parent path segment");
    }
  }

  for (const sub of subs) {
    // only allow whitelisted subcollections
    if (!ALLOWED_SUBCOLLECTIONS.includes(sub as any)) {
      continue;
    }

    const pathSegments = [...parentPathSegments, sub];

    // delete items in the subcollection in batches until empty
    let deleted: number;
    do {
      deleted = await deleteCollectionBatched(firestore, pathSegments);
    } while (deleted > 0);

    // Projects => additionally delete nested Notes for each project doc
    if (sub === "Projects") {
      const projCol = collection(
        firestore,
        ...(pathSegments as [string, ...string[]])
      );
      const projSnap = await getDocs(projCol);
      for (const p of projSnap.docs) {
        if (!isValidFirestoreDocId(p.id)) continue;
        const notesPathSegments = [...pathSegments, p.id, "Notes"];
        let nd: number;
        do {
          nd = await deleteCollectionBatched(firestore, notesPathSegments);
        } while (nd > 0);
      }
    }
  }
}

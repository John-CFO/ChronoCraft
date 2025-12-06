///////////////////////////////////// FirestoreService.tsx /////////////////////////////////////

// Firestore project update helper.
// - Validates projectId and payload with Zod schemas
// - Returns boolean success flag instead of logging
// - Avoids throwing on expected validation failures (caller can react)

///////////////////////////////////////////////////////////////////////////////////////////////

import { doc, updateDoc } from "firebase/firestore";

import { FIREBASE_AUTH, FIREBASE_FIRESTORE } from "../firebaseConfig";
import { useService } from "../components/contexts/ServiceContext";
import {
  isValidFirestoreDocId,
  ProjectUpdateSchema,
} from "../validation/firestoreSchemas.sec";

///////////////////////////////////////////////////////////////////////////////////////////////

// Update a project's document for the current authenticated user.
// Returns true on success, false on failure (auth, validation or Firestore error).

export const updateProjectData = async (projectId: string, data: any) => {
  const { serviceId } = useService();
  if (!serviceId) return;
  // condition to check if user is authenticated
  const user = FIREBASE_AUTH?.currentUser;
  if (!user?.uid) {
    return false;
  }

  // projectId validation
  if (!projectId || !isValidFirestoreDocId(projectId)) {
    return false;
  }

  // payload validation (whitelist/update-safe)
  const parsed = ProjectUpdateSchema.safeParse(data);
  if (!parsed.success) {
    return false;
  }
  const updatePayload = parsed.data;

  // try to update the project data
  try {
    const projectDocRef = doc(
      FIREBASE_FIRESTORE,
      "Users",
      user.uid,
      "Services",
      serviceId,
      "Projects",
      projectId
    );
    await updateDoc(projectDocRef, updatePayload);
    return true;
  } catch {
    // return false so caller can handle it.
    return false;
  }
};

// Re-exports for tests and other modules that want to reference the canonical schema / validator.
// - ProjectUpdateSchema: zod schema describing allowed update fields (strict).
// - isValidProjectId: alias for the internal doc-id validator used here.

export { ProjectUpdateSchema };
export const isValidProjectId = isValidFirestoreDocId;

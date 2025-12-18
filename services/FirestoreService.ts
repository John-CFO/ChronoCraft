///////////////////////////////////// FirestoreService.ts /////////////////////////////////////

// Firestore project update helper.
// - Validates projectId and payload with Zod schemas
// - Returns boolean success flag instead of logging
// - Avoids throwing on expected validation failures (caller can react)

///////////////////////////////////////////////////////////////////////////////////////////////

import { doc, updateDoc } from "firebase/firestore";
import {
  isValidFirestoreDocId,
  ProjectUpdateSchema,
} from "../validation/firestoreSchemas.sec";

///////////////////////////////////////////////////////////////////////////////////////////////

// Hook-frei: firestore, auth, serviceId werden explizit übergeben
export const updateProjectData = async (
  firestore: any,
  auth: any,
  serviceId: string | null,
  projectId: string,
  data: any
) => {
  if (!serviceId) return false;

  const user = auth?.currentUser;
  if (!user?.uid) return false;

  if (!projectId || !isValidFirestoreDocId(projectId)) return false;

  const parsed = ProjectUpdateSchema.safeParse(data);
  if (!parsed.success) return false;

  try {
    const projectDocRef = doc(
      firestore,
      "Users",
      user.uid,
      "Services",
      serviceId,
      "Projects",
      projectId
    );
    await updateDoc(projectDocRef, parsed.data);
    return true;
  } catch {
    return false;
  }
};

// Re-exports
export { ProjectUpdateSchema };
export const isValidProjectId = isValidFirestoreDocId;

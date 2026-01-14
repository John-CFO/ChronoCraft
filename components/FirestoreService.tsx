///////////////////////////////////// FirestoreService.tsx /////////////////////////////////////

// Firestore project update helper.
// - Minimal client-side validation only (projectId non-empty string)
// - Returns boolean success flag instead of throwing
// - Backend enforces full validation

///////////////////////////////////////////////////////////////////////////////////////////////

import { doc, updateDoc } from "firebase/firestore";

import { FIREBASE_AUTH, FIREBASE_FIRESTORE } from "../firebaseConfig";
import { useService } from "../components/contexts/ServiceContext";

///////////////////////////////////////////////////////////////////////////////////////////////

// Update a project's document for the current authenticated user.
// Returns true on success, false on failure (auth or Firestore error).
export const updateProjectData = async (projectId: string, data: any) => {
  const { serviceId } = useService();
  if (!serviceId) return false;

  const user = FIREBASE_AUTH?.currentUser;
  if (!user?.uid) return false;

  // Minimal client-side check for projectId
  if (!projectId || typeof projectId !== "string" || projectId.length === 0) {
    return false;
  }

  // No client-side payload validation; backend must enforce strict checks
  const updatePayload = data;

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
    return false;
  }
};

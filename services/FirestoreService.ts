///////////////////////////////////// FirestoreService.ts /////////////////////////////////////

// Firestore project update helper.
// - Returns boolean success flag instead of logging
// - Avoids throwing on expected failures (caller can react)

///////////////////////////////////////////////////////////////////////////////////////////////

import { doc, updateDoc } from "firebase/firestore";

///////////////////////////////////////////////////////////////////////////////////////////////

// Hook-free: firestore, auth, serviceId will be passed in explicitly
export const updateProjectData = async (
  firestore: any,
  auth: any,
  serviceId: string | null,
  projectId: string,
  data: any,
) => {
  if (!serviceId) return false;

  const user = auth?.currentUser;
  if (!user?.uid) return false;

  if (!projectId) return false;

  try {
    const projectDocRef = doc(
      firestore,
      "Users",
      user.uid,
      "Services",
      serviceId,
      "Projects",
      projectId,
    );

    await updateDoc(projectDocRef, data);
    return true;
  } catch {
    return false;
  }
};

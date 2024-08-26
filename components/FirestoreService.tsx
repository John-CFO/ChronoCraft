///////////////////////////////////// FirestoreService.tsx /////////////////////////////////////

// This service is uses to save the project data to Firestore.

import { doc, updateDoc } from "firebase/firestore";

import { FIREBASE_FIRESTORE } from "../firebaseConfig";

///////////////////////////////////////////////////////////////////////////////////////////////

export const updateProjectData = async (projectId: string, data: any) => {
  if (!projectId) {
    // console.error("updateProjectData - projectId ist nicht definiert.");
    return;
  }
  try {
    /* console.log(
      "updateProjectData - Updating project with projectId:",
      projectId
    ); */
    const projectDocRef = doc(
      FIREBASE_FIRESTORE,
      "Services",
      "AczkjyWoOxdPAIRVxjy3",
      "Projects",
      projectId
    );
    await updateDoc(projectDocRef, data);
    // console.log("Firestore successfully updated:", data);
  } catch (error) {
    console.error("Error updating Firestore:", error);
  }
};

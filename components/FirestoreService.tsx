///////////////////////////////////// FirestoreService.tsx /////////////////////////////////////

// This service is uses to save the project data to Firestore.

///////////////////////////////////////////////////////////////////////////////////////////////

import { doc, updateDoc } from "firebase/firestore";

import { FIREBASE_AUTH, FIREBASE_FIRESTORE } from "../firebaseConfig";

///////////////////////////////////////////////////////////////////////////////////////////////

export const updateProjectData = async (projectId: string, data: any) => {
  // condition to check if user is authenticated
  const user = FIREBASE_AUTH.currentUser;
  if (!user) {
    console.error("User is not authenticated.");
    return false;
  }
  // if no projectId is provided return
  if (!projectId) {
    // console.error("updateProjectData - projectId ist nicht definiert.");
    return;
  }
  // try to update the project data
  try {
    /* console.log(
      "updateProjectData - Updating project with projectId:",
      projectId
    ); */
    const projectDocRef = doc(
      FIREBASE_FIRESTORE,
      "Users",
      user.uid,
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

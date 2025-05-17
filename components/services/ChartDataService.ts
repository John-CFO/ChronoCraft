///////////////////////////Service to fetch data from Firestore to PieChart in DetailsScreen//////////////////////////

import { doc, getDoc } from "firebase/firestore";
import { FIREBASE_FIRESTORE } from "../../firebaseConfig";

export const fetchProjectData = async (projectId: string, user: any) => {
  const projectDocRef = doc(
    FIREBASE_FIRESTORE,
    "Users",
    user.uid,
    "Services",
    "AczkjyWoOxdPAIRVxjy3",
    "Projects",
    projectId
  );
  const docSnap = await getDoc(projectDocRef);

  if (docSnap.exists()) {
    return docSnap.data();
  } else {
    console.log("Kein solches Dokument gefunden!");
    return null;
  }
};

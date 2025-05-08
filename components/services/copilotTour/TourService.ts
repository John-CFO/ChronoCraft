/////////////////////////TourService.ts/////////////////////////////

// This service is used to reset the tour flags

////////////////////////////////////////////////////////////////////

import { doc, updateDoc } from "firebase/firestore";

import { FIREBASE_FIRESTORE } from "../../../firebaseConfig";

////////////////////////////////////////////////////////////////////

export const resetTourFlags = async (userId: string) => {
  const userRef = doc(FIREBASE_FIRESTORE, "Users", userId);
  await updateDoc(userRef, {
    hasSeenHomeTour: false,
    hasSeenDetailsTour: false,
    hasSeenWorkHoursTour: false,
    hasSeenVacationTour: false,
  });
};

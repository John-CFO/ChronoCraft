///////////////////////////////////////////////////////////////////////////////

// This component is used to prevent the user from leaving the app while a project is running

///////////////////////////////////////////////////////////////////////////////

import { useEffect, useRef } from "react";
import { BackHandler } from "react-native";
import { doc, onSnapshot } from "firebase/firestore";
import { getAuth } from "firebase/auth";

import { FIREBASE_FIRESTORE } from "../firebaseConfig";
import { useAlertStore } from "./services/customAlert/alertStore";

///////////////////////////////////////////////////////////////////////////////

export function usePreventBackWhileTracking(projectId: string) {
  // useRef to store the current value of isTracking
  const isTrackingRef = useRef(false);

  useEffect(() => {
    const user = getAuth().currentUser;
    if (!user || !projectId) return;

    const docRef = doc(
      FIREBASE_FIRESTORE,
      "Users",
      user.uid,
      "Services",
      "AczkjyWoOxdPAIRVxjy3",
      "Projects",
      projectId
    );

    // Firestore Real-Time Listener
    const unsubscribe = onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          const trackingStatus = data?.isTracking || false;
          isTrackingRef.current = trackingStatus;
        }
      },
      // show an alert if an error occurs
      (error) => {
        useAlertStore
          .getState()
          .showAlert(
            "Error",
            "Failed to fetch project data. Please try again."
          );
      }
    );

    // BackHandler Listener
    const onBackPress = () => {
      if (isTrackingRef.current) {
        useAlertStore
          .getState()
          .showAlert(
            "Project is still running.",
            "You can't leave the app. Please stop the project first."
          );
        return true; // block back navigation
      }
      return false; // allow back navigation
    };

    BackHandler.addEventListener("hardwareBackPress", onBackPress);

    return () => {
      unsubscribe();
      BackHandler.removeEventListener("hardwareBackPress", onBackPress);
    };
  }, [projectId]);
}

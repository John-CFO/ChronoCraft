///////////////////////////////////////////////////////////////////////////////

// This component is used to prevent the user from leaving the app while a project is running

///////////////////////////////////////////////////////////////////////////////

import { useEffect, useRef } from "react";
import { BackHandler } from "react-native";
import { doc, onSnapshot } from "firebase/firestore";
import { getAuth } from "firebase/auth";

import { FIREBASE_FIRESTORE } from "../firebaseConfig";
import { useService } from "../components/contexts/ServiceContext";
import { getValidatedDocFromSnapshot } from "../validation/getDocsWrapper.sec";
import { FirestoreProjectSchema } from "../validation/firestoreSchemas.sec";
import { useAlertStore } from "./services/customAlert/alertStore";

///////////////////////////////////////////////////////////////////////////////

export function usePreventBackWhileTracking(projectId: string) {
  // useRef to store the current value of isTracking
  const isTrackingRef = useRef(false);
  // declare useService hook
  const { serviceId } = useService();

  useEffect(() => {
    if (!serviceId) return;
    const user = getAuth().currentUser;
    if (!user || !projectId) return;

    const docRef = doc(
      FIREBASE_FIRESTORE,
      "Users",
      user.uid,
      "Services",
      serviceId,
      "Projects",
      projectId
    );

    // Firestore Real-Time Listener
    const unsubscribe = onSnapshot(
      docRef,
      (docSnap) => {
        // validate the project data with zod
        const data = getValidatedDocFromSnapshot(
          docSnap,
          FirestoreProjectSchema
        );
        if (!data) return;

        isTrackingRef.current = data.isTracking ?? false;
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
  }, [projectId, serviceId]);
}

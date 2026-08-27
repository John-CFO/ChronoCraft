///////////////////////////////////////////////////////////////////////////////

// This component is used to prevent the user from leaving the app while a project is running

///////////////////////////////////////////////////////////////////////////////

import { useEffect, useRef } from "react";
import { BackHandler } from "react-native";
import { doc, onSnapshot } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { useTranslation } from "react-i18next";

import { FIREBASE_FIRESTORE } from "../firebaseConfig";
import { useService } from "../components/contexts/ServiceContext";
import { useAlertStore } from "./services/customAlert/alertStore";
import { logError } from "../lib/loggerClient";

///////////////////////////////////////////////////////////////////////////////

export function usePreventBackWhileTracking(projectId: string) {
  // useTranslation hook to access translations
  const { t } = useTranslation();

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
      projectId,
    );

    // Firestore Real-Time Listener
    const unsubscribe = onSnapshot(
      docRef,
      (docSnap) => {
        if (!docSnap.exists()) return;

        const data = docSnap.data();
        if (!data) return;

        // minimal check for isTracking
        isTrackingRef.current =
          typeof data.isTracking === "boolean" ? data.isTracking : false;
      },
      (error) => {
        logError("usePreventBackWhileTracking:onSnapshot", error);
        useAlertStore
          .getState()
          .showAlert(
            t("preventBack.error"),
            t("preventBack.fetchProjectError"),
          );
      },
    );

    // BackHandler Listener
    const onBackPress = () => {
      if (isTrackingRef.current) {
        useAlertStore
          .getState()
          .showAlert(
            t("preventBack.projectRunning"),
            t("preventBack.cannotLeave"),
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

////////////////////////////////////// TourButton Component//////////////////////////////

// This comonent creates the copilot tour button and handles the tour status

/////////////////////////////////////////////////////////////////////////////////////////

import React, { useEffect, useRef } from "react";
import {
  TouchableOpacity,
  Text,
  View,
  ScrollView,
  Dimensions,
  Animated,
} from "react-native";
import { useCopilot } from "react-native-copilot";
import { doc, updateDoc } from "firebase/firestore";
import { LinearGradient } from "expo-linear-gradient";
import { AccessibilityInfo } from "react-native";
import { useTranslation } from "react-i18next";

import { FIREBASE_FIRESTORE } from "../../../firebaseConfig";
import { useAlertStore } from "../customAlert/alertStore";
import { logError } from "../../../lib/loggerClient";

//////////////////////////////////////////////////////////////////////////////////////////

interface TourButtonProps {
  storageKey: string;
  userId: string;
  delay?: number;
  disabled?: boolean;
  scrollViewRef?: React.RefObject<ScrollView>;
  needsRefCheck?: boolean;
  scrollViewReady?: boolean;
  showTourCard: boolean;
  setShowTourCard: (visible: boolean) => void;
}

///////////////////////////////////////////////////////////////////////////////////////////

const TourButton: React.FC<TourButtonProps> = ({
  storageKey,
  userId,
  delay = 200,
  scrollViewRef,
  needsRefCheck = false,
  scrollViewReady,
  showTourCard,
  setShowTourCard,
}) => {
  // useTranslation hook to access translations
  const { t } = useTranslation();

  // initialize start the tour with the useCopilot hook
  const { start } = useCopilot();

  // hook to inform the user that the tour is active
  useEffect(() => {
    if (showTourCard) {
      AccessibilityInfo.announceForAccessibility(t("tour.introductionActive"));
    }
  }, [showTourCard]);

  // define the width of the screen
  const screenWidth = Dimensions.get("window").width;
  const screenHeight = Dimensions.get("window").height;
  const translateY = useRef(new Animated.Value(screenHeight)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  // Animate on showTourCard change
  useEffect(() => {
    if (showTourCard) {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: screenHeight,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [showTourCard, translateY, opacity]);

  // function to check if the ScrollView is ready
  const isScrollViewReady =
    scrollViewRef && scrollViewRef.current && scrollViewReady !== undefined
      ? scrollViewReady
      : true;

  // get a firestore reference for the tour status
  const updateFireStoreTourStatus = async (
    userId: string,
    status: boolean,
    tourKey: string,
  ) => {
    try {
      const userRef = doc(FIREBASE_FIRESTORE, "Users", userId);
      await updateDoc(userRef, { [tourKey]: status });
      // console.log(
      //   `Firestore update successful for ${tourKey}:`,
      //   userId,
      //   status
      // );
    } catch (error) {
      logError("TourButton/updateFirestoreTourStatus", error);
    }
  };
  // reference for the timeout
  const tourTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // hook to clean up the timeout
  useEffect(() => {
    return () => {
      if (tourTimeoutRef.current) {
        clearTimeout(tourTimeoutRef.current);
      }
    };
  }, []);

  // function to sleep with cancel
  const sleepWithCancel = (ms: number): Promise<void> => {
    return new Promise((resolve) => {
      const timeoutId = setTimeout(resolve, ms);
      tourTimeoutRef.current = timeoutId;
    });
  };

  // function to start the tour
  const handleStartTour = async () => {
    try {
      // use seleepWithCalcel to start the tour
      await sleepWithCancel(delay);

      if (
        needsRefCheck &&
        (!scrollViewRef || !scrollViewRef.current || !isScrollViewReady)
      ) {
        logError("TourButton/scrollViewNotReady", {
          scrollViewRefExists: !!scrollViewRef,
          isScrollViewReady,
        });
        throw new Error("ScrollView is not ready");
      }
      await start(undefined, scrollViewRef?.current ?? undefined);
      // update the tour status to true in Firestore to show that the tour has been seen
      await updateFireStoreTourStatus(userId, true, storageKey);
      setShowTourCard(false);
    } catch (error) {
      logError("TourButton/startTour", error);
      if (error instanceof Error) {
        useAlertStore.getState().showAlert(
          error.message.includes("ScrollView")
            ? t("tour.errors.loading.title")
            : t("tour.errors.general.title"),
          error.message.includes("ScrollView")
            ? t("tour.errors.loading.message")
            : t("tour.errors.general.message"),
          error.message.includes("ScrollView")
            ? [
                {
                  text: t("tour.retry"),
                  onPress: () => {
                    // delete previous timeout
                    if (tourTimeoutRef.current) {
                      clearTimeout(tourTimeoutRef.current);
                    }
                    handleStartTour();
                  },
                },
                { text: t("tour.cancel"), style: "cancel" },
              ]
            : undefined,
        );
      }
    }
  };

  // function to skip the tour and set the tour status to true
  const handleSkipTour = async () => {
    try {
      // set the status to true in Firestore to show that the tour has been seen
      await updateFireStoreTourStatus(userId, true, storageKey);
      setShowTourCard(false);
      useAlertStore
        .getState()
        .showAlert(t("tour.skipAlertTitle"), t("tour.skipAlertMessage"));
    } catch (error) {
      logError("TourButton/skipTour", error);
    }
  };

  if (!showTourCard) return null;

  return (
    <Animated.View
      accessible={true}
      accessibilityViewIsModal={true}
      accessibilityLabel={t("tour.introductionModal")}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: "center",
        alignItems: "center",
        transform: [{ translateY }],
        opacity,
        zIndex: 2,
      }}
    >
      <Animated.View
        style={{
          width: screenWidth * 0.9,
          maxWidth: 600,
          backgroundColor: "#191919",
          padding: 20,
          borderRadius: 15,
          borderWidth: 2,
          borderColor: "aqua",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 2,
        }}
      >
        <Text
          accessible={true}
          accessibilityRole="header"
          accessibilityLabel={t("tour.introductionTitle")}
          style={{
            color: "white",
            fontSize: 28,
            fontFamily: "MPLUSLatin_Bold",
            marginBottom: 20,
            textAlign: "center",
          }}
        >
          {t("tour.introductionTitle")}
        </Text>

        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            width: 280,
            gap: 15,
          }}
        >
          {/* PLAY Button */}
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={t("tour.start")}
            accessibilityHint={t("tour.startHint")}
            onPress={handleStartTour}
            style={{
              flex: 1,
              height: 50,
              borderRadius: 12,
              overflow: "hidden",
              borderWidth: 2,
              borderColor: "aqua",
            }}
          >
            <LinearGradient
              colors={["#00f7f7", "#005757"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  color: "white",
                  fontSize: 20,
                  fontFamily: "MPLUSLatin_Bold",
                }}
              >
                {t("tour.play")}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* SKIP Button */}
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={t("tour.skip.label")}
            accessibilityHint={t("tour.skip.hint")}
            onPress={handleSkipTour}
            style={{
              flex: 1,
              height: 50,
              borderRadius: 12,
              overflow: "hidden",
              borderWidth: 2,
              borderColor: "white",
            }}
          >
            <LinearGradient
              colors={["#FFFFFF", "#AAAAAA"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  color: "black",
                  fontSize: 20,
                  fontFamily: "MPLUSLatin_Bold",
                }}
              >
                {t("tour.skip")}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Animated.View>
  );
};

export default TourButton;

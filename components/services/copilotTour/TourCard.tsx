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

import { FIREBASE_FIRESTORE } from "../../../firebaseConfig";
import { useAlertStore } from "../customAlert/alertStore";

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
  // initialize start the tour with the useCopilot hook
  const { start } = useCopilot();

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
    tourKey: string
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
      console.log("Error updating Firestore status:", error);
    }
  };

  // function to start the tour
  const handleStartTour = async () => {
    try {
      await new Promise<void>((resolve) => setTimeout(resolve, delay));

      if (
        needsRefCheck &&
        (!scrollViewRef || !scrollViewRef.current || !isScrollViewReady)
      ) {
        console.error("[Tour] ScrollView is not ready:", {
          scrollViewRef,
          isScrollViewReady,
        });
        throw new Error("ScrollView is not ready");
      }
      await start(undefined, scrollViewRef?.current ?? undefined);
      // update the tour status to true in Firestore to show that the tour has been seen
      await updateFireStoreTourStatus(userId, true, storageKey);
      setShowTourCard(false);
    } catch (error) {
      console.error("[Tour] Tour Start Error:", error);
      if (error instanceof Error) {
        useAlertStore.getState().showAlert(
          error.message.includes("ScrollView") ? "Loading Error" : "Tour Error",
          error.message.includes("ScrollView")
            ? "Please wait until the content is fully loaded"
            : "An unexpected error occurred. Please try restarting the app.",
          error.message.includes("ScrollView")
            ? [
                {
                  text: "Retry",
                  onPress: () => setTimeout(handleStartTour, 200),
                },
                { text: "Cancel", style: "cancel" },
              ]
            : undefined
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
        .showAlert("Skip Tour", "You can start the tour later in the menu.");
    } catch (error) {
      console.log("Error skipping tour:", error);
    }
  };

  if (!showTourCard) return null;

  return (
    <Animated.View
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
          style={{
            color: "white",
            fontSize: 28,
            fontFamily: "MPLUSLatin_Bold",
            marginBottom: 20,
            textAlign: "center",
          }}
        >
          Start {"\n"} Introducing Tour
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
            onPress={handleStartTour}
            style={{
              borderRadius: 12,
              overflow: "hidden",
              borderWidth: 2,
              borderColor: "aqua",
              flex: 1,
              height: 50,
            }}
          >
            <LinearGradient
              colors={["#00f7f7", "#005757"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                paddingVertical: 6,
                justifyContent: "center",
                alignItems: "center",
                height: 50,
                width: "100%",
              }}
            >
              <Text
                style={{
                  color: "white",
                  fontSize: 20,
                  fontFamily: "MPLUSLatin_Bold",
                }}
              >
                PLAY
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* SKIP Button */}
          <TouchableOpacity
            onPress={handleSkipTour}
            style={{
              borderRadius: 12,
              overflow: "hidden",
              borderWidth: 3,
              borderColor: "white",
              flex: 1,
            }}
          >
            <LinearGradient
              colors={["#FFFFFF", "#AAAAAA"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                alignItems: "center",
                justifyContent: "center",
                height: 45,
                width: "100%",
              }}
            >
              <Text
                style={{
                  color: "black",
                  fontSize: 20,
                  fontFamily: "MPLUSLatin_Bold",
                }}
              >
                SKIP
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Animated.View>
  );
};

export default TourButton;

////////////////////////////////////// TourButton Component//////////////////////////////

// This comonent creates the copilot tour button and handles the tour status

/////////////////////////////////////////////////////////////////////////////////////////
import React, { useState, useEffect } from "react";
import { TouchableOpacity, Text, View, ScrollView, Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCopilot } from "react-native-copilot";
import { doc, updateDoc } from "firebase/firestore";
import { FIREBASE_FIRESTORE } from "../../../firebaseConfig";

//////////////////////////////////////////////////////////////////////////////////////////

interface TourButtonProps {
  storageKey: string;
  userId: string;
  delay?: number;
  disabled?: boolean;
  scrollViewRef?: React.RefObject<ScrollView>;
  needsRefCheck?: boolean;
  scrollViewReady?: boolean;
}

///////////////////////////////////////////////////////////////////////////////////////////

const TourButton: React.FC<TourButtonProps> = ({
  storageKey,
  userId,
  delay = 200,
  scrollViewRef,
  needsRefCheck = false,
  scrollViewReady,
}) => {
  // initialize start the tour with the useCopilot hook
  const { start } = useCopilot();
  // state to show the tour button
  const [showButton, setShowButton] = useState<boolean>(false);

  // function to check if the ScrollView is ready
  const isScrollViewReady =
    scrollViewRef && scrollViewRef.current && scrollViewReady !== undefined
      ? scrollViewReady
      : true;

  // hook to check if the user has already seen the tour in every screen
  useEffect(() => {
    const checkTourStatus = async () => {
      try {
        // check AsyncStorage if the user has already seen the tour
        const hasSeenTour = await AsyncStorage.getItem(storageKey);
        if (hasSeenTour !== "true") {
          setShowButton(true);
        }
      } catch (error) {
        console.log("Error checking tour status:", error);
      }
    };
    checkTourStatus();
  }, [storageKey]);
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
      // console.log("[Tour] Starting tour with delay:", delay);
      await new Promise<void>((resolve) => setTimeout(resolve, delay));
      // console.log("[Tour] Delay finished.");
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
      // console.log("[Tour] ScrollView is ready.");
      try {
        // console.log("[Tour] Calling start() now...");
        await start(undefined, scrollViewRef?.current ?? undefined);
        // console.log("[Tour] start() call succeeded.");
      } catch (error) {
        console.error("[Tour] Error in start() call:", error);
        throw error; // Fehler weiterwerfen, damit der äußere Catch-Block greift
      }
      // console.log("[Tour] Tour started.");
      await AsyncStorage.setItem(storageKey, "true");
      // console.log("[Tour] AsyncStorage updated successfully.");

      await updateFireStoreTourStatus(userId, true, storageKey);
      // console.log("[Tour] Firestore updated successfully.");
      setShowButton(false);
      // console.log("[Tour] Tour finished and button hidden.");
    } catch (error) {
      console.error("[Tour] Tour Start Error:", error);
      if (error instanceof Error) {
        Alert.alert(
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
      await AsyncStorage.setItem(storageKey, "true");
      await updateFireStoreTourStatus(userId, true, storageKey);
      setShowButton(false);
      Alert.alert("Skipped tour", "You can start the tour later in the menu");
    } catch (error) {
      console.log("Error skipping tour:", error);
    }
  };

  if (!showButton) return null;

  return (
    <View
      style={{
        position: "absolute",
        bottom: 30,
        left: 0,
        right: 0,
        zIndex: 999,
        elevation: 999, // shadow for Android
        flexDirection: "row",
        justifyContent: "space-around",
        alignItems: "center",
        backgroundColor: "transparent", // important for IOS
      }}
    >
      <TouchableOpacity
        onPress={handleStartTour}
        style={{
          backgroundColor: "#00FFFF",
          paddingVertical: 10,
          paddingHorizontal: 20,
          borderRadius: 8,
        }}
      >
        <Text style={{ fontSize: 16, color: "black" }}>Start Tour</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={handleSkipTour}
        style={{
          backgroundColor: "#AAAAAA",
          paddingVertical: 10,
          paddingHorizontal: 20,
          borderRadius: 8,
        }}
      >
        <Text style={{ fontSize: 16, color: "black" }}>Skip Tour</Text>
      </TouchableOpacity>
    </View>
  );
};

export default TourButton;

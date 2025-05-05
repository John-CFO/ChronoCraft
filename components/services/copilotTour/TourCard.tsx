////////////////////////////////////// TourButton Component//////////////////////////////

// This comonent creates the copilot tour button and handles the tour status

/////////////////////////////////////////////////////////////////////////////////////////

import React, { useEffect } from "react";
import {
  TouchableOpacity,
  Text,
  View,
  ScrollView,
  Alert,
  Dimensions,
} from "react-native";
import { getDoc } from "firebase/firestore";
import { useCopilot } from "react-native-copilot";
import { doc, updateDoc } from "firebase/firestore";
import { LinearGradient } from "expo-linear-gradient";

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

  // function to check if the ScrollView is ready
  const isScrollViewReady =
    scrollViewRef && scrollViewRef.current && scrollViewReady !== undefined
      ? scrollViewReady
      : true;

  // hook to check if the user has already seen the tour in every screen
  useEffect(() => {
    const checkFirestoreTourStatus = async () => {
      if (!showTourCard) return null;
      try {
        const userRef = doc(FIREBASE_FIRESTORE, "Users", userId);
        const docSnap = await getDoc(userRef);

        const hasSeenTour = docSnap.exists() && docSnap.data()?.[storageKey];

        if (!hasSeenTour) {
          setShowTourCard(true);
        } else {
          setShowTourCard(false);
        }
      } catch (error) {
        console.log("Fehler beim Laden des Tour-Status aus Firestore:", error);
      }
    };

    checkFirestoreTourStatus();
  }, [storageKey, userId]);

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
      // set teh status to true in Firestore to show that the tour has been seen
      await updateFireStoreTourStatus(userId, true, storageKey);
      setShowTourCard(false);
      Alert.alert("Skip Tour", "You can start the tour later in the menu.");
    } catch (error) {
      console.log("Error skipping tour:", error);
    }
  };

  return (
    <>
      {showTourCard && (
        <View
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
                borderWidth: 3,
                borderColor: "white",
                flex: 1,
              }}
            >
              <LinearGradient
                colors={["#00FFFF", "#FFFFFF"]}
                style={{
                  alignItems: "center",
                  justifyContent: "center",
                  height: 45,
                  width: "100%",
                }}
              >
                <Text
                  style={{
                    color: "grey",
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
        </View>
      )}
    </>
  );
};

export default TourButton;

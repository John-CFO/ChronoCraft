///////////////////////////////////////VacationScreen//////////////////////////////////////////////

// This component shows the calendar, the vacation form and the vacation list.
// The user can create new vacations, edit existing vacations and delete vacations.

///////////////////////////////////////////////////////////////////////////////////////////////////

import { View, Text, ScrollView } from "react-native";
import React, { useEffect, useState, useRef, useCallback } from "react";
import { useRoute } from "@react-navigation/native";
import { getAuth, Auth } from "firebase/auth";
import LottieView from "lottie-react-native";
import { useIsFocused, useFocusEffect } from "@react-navigation/native";
import { CopilotProvider } from "react-native-copilot";
import { SafeAreaView } from "react-native-safe-area-context";
import { doc, getDoc } from "firebase/firestore";

import CustomCalendar from "../components/CustomCalendar";
import VacationForm from "../components/VacationForm";
import VacationList from "../components/VacationList";
import { FIREBASE_APP, FIREBASE_FIRESTORE } from "../firebaseConfig";
import TourCard from "../components/services/copilotTour/TourCard";
import { useCopilotOffset } from "../components/services/copilotTour/CopilotOffset";
import CustomTooltip from "../components/services/copilotTour/CustomToolTip";
import { useAccessibilityStore } from "../components/services/accessibility/accessibilityStore";

//////////////////////////////////////////////////////////////////////////////////////////////////

type VacationScreenRouteProps = {
  key: string;
  name: string;
  params: {
    projectId: string;
  };
};

///////////////////////////////////////////////////////////////////////////////////////////////////

const VacationScreen: React.FC<VacationScreenRouteProps> = () => {
  // initialize the copilot offset
  const offset = useCopilotOffset();

  // initialize the accessibility store
  const accessMode = useAccessibilityStore(
    (state) => state.accessibilityEnabled
  );

  // initialize Firebase Auth
  const auth: Auth = getAuth(FIREBASE_APP);

  // initialize routing
  const route = useRoute<VacationScreenRouteProps>();

  // ref for the Scrollview to navigate to the copilot tour
  const scrollViewRef = useRef<ScrollView>(null);
  const [scrollViewReady, setScrollViewReady] = useState(false);

  // states to control the loading screen
  const [minTimePassed, setMinTimePassed] = useState(false);
  const [loading, setLoading] = useState(true);

  // state to control the copilot tour
  const [showTour, setShowTour] = useState(false);

  // state to manage has the user already seen the tour
  const [showTourCard, setShowTourCard] = useState<boolean | null>(null); // null = loading

  // hook to check Firestore if the user has already seen the tour
  useFocusEffect(
    useCallback(() => {
      const fetchTourStatus = async () => {
        const userId = auth.currentUser?.uid;
        if (!userId) return;

        const docRef = doc(FIREBASE_FIRESTORE, "Users", userId);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
          setShowTourCard(false);
          return;
        }

        const data = docSnap.data();
        setShowTourCard(data?.hasSeenVacationTour === false);
      };

      fetchTourStatus();
    }, [])
  );

  // simulate loading state
  useEffect(() => {
    const timer = setTimeout(() => {
      setMinTimePassed(true);
    }, 3000); // 3 seconds to simulate loading
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (minTimePassed) {
      setLoading(false);
    }
  }, [minTimePassed]);

  // delay the setting of showTourCard
  useEffect(() => {
    if (!loading && minTimePassed && showTour) {
      const timer = setTimeout(() => {
        setShowTourCard(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [loading, minTimePassed, showTour]);

  // function to disable the copilot order and step number
  const EmptyStepNumber = () => {
    return null;
  };

  // states for the marked dates in the calendar
  const [markedDates, setMarkedDates] = useState<{ [key: string]: any }>({});
  const [currentMonth, setCurrentMonth] = useState(
    // newDate() = add an object with format string (split(T) to get only the date) [0] = to get only the date from the array
    new Date().toISOString().split("T")[0]
  );
  const isFocused = useIsFocused();

  useEffect(() => {
    if (isFocused) {
      setCurrentMonth(new Date().toISOString().split("T")[0]);
    }
  }, [isFocused]);

  return (
    <SafeAreaView style={{ flex: 1 }}>
      {/* // local VacationScreen Provider (important if you need to adress a child
      component to the copilot tour) */}
      <CopilotProvider
        overlay="svg"
        verticalOffset={offset}
        tooltipComponent={CustomTooltip}
        stepNumberComponent={EmptyStepNumber}
        backdropColor="rgba(5, 5, 5, 0.59)"
        arrowColor="aqua"
        tooltipStyle={{
          backgroundColor: "#191919",
          borderRadius: 12,
          padding: 16,
          borderWidth: 2,
          borderColor: "aqua",
        }}
      >
        <View style={{ flex: 1, position: "relative", zIndex: 0 }}>
          {/* Copilot Card with dark overlay */}
          {showTourCard == true && (
            <View
              style={{
                position: "absolute",
                width: "100%",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                justifyContent: "center",
                alignItems: "center",
                backgroundColor: "rgba(0, 0, 0, 0.6)",
                zIndex: 10,
              }}
            >
              <TourCard
                storageKey={`hasSeenVacationTour`}
                userId={auth.currentUser?.uid ?? ""}
                scrollViewRef={scrollViewRef}
                scrollViewReady={scrollViewReady}
                needsRefCheck={true}
                showTourCard={showTourCard}
                setShowTourCard={setShowTourCard}
              />
            </View>
          )}
          <ScrollView
            // scrollview ref and onlayout to navigate to the copilot tour
            ref={scrollViewRef}
            onLayout={() => setScrollViewReady(true)}
            contentContainerStyle={{ backgroundColor: "black" }}
          >
            {/* Header */}
            <View
              style={{
                zIndex: 2,
                paddingTop: 10,
                alignItems: "center",
                backgroundColor: "black",
              }}
            >
              <Text
                accessible={true}
                accessibilityRole="header"
                accessibilityLabel="Vacation Management"
                style={{
                  fontSize: accessMode ? 30 : 25,
                  fontFamily: "MPLUSLatin_Bold",
                  color: "white",
                }}
              >
                - Vacation Management -
              </Text>
              {/* Lottie animated picture */}
              <View style={{ width: 420, height: 280, alignItems: "center" }}>
                <LottieView
                  autoPlay
                  loop
                  style={{ height: 350, width: 350 }}
                  source={require("../assets/Lottie_files/beach-hero.json")}
                />
              </View>
              <View
                style={{
                  width: 420,
                  height: 40,
                  marginBottom: 15,
                  alignItems: "center",
                }}
              >
                <Text
                  accessible={true}
                  accessibilityLabel="Unplug from work, recharge your soul"
                  style={{
                    zIndex: 2,
                    fontSize: accessMode ? 20 : 18,
                    fontFamily: accessMode
                      ? "MPLUSLatin_Bold"
                      : "MPLUSLatin_ExtraLight",
                    color: "white",
                  }}
                >
                  "Unplug from work, recharge your soul"
                </Text>
              </View>
            </View>
            {/* Calender */}
            <View
              style={{
                width: "100%",
                justifyContent: "center",
                alignItems: "center",
                backgroundColor: "black",
              }}
            >
              <CustomCalendar
                currentMonth={currentMonth}
                markedDates={markedDates}
              />
            </View>
            {/* VacationForm */}
            <View
              accessible={true}
              accessibilityLabel="Vacation request form"
              style={{ alignItems: "center", backgroundColor: "black" }}
            >
              <VacationForm />
            </View>
            {/* VacationList */}
            <View
              accessible={true}
              accessibilityLabel="List of your planned vacations"
              style={{
                flex: 1,
                height: "10%",
                width: "100%",
                backgroundColor: "black",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <VacationList />
            </View>
          </ScrollView>
        </View>
      </CopilotProvider>
    </SafeAreaView>
  );
};

export default VacationScreen;

/////////////////////////////////Workhours Screen////////////////////////////////////

// This file shows the workhours screen with the workhours input card, the workhours chart card and the workhours tracker card

/////////////////////////////////////////////////////////////////////////////////////

import React, { useEffect, useState, useRef, useCallback } from "react";
import { View, Text, SafeAreaView, ScrollView } from "react-native";
import { useRoute, useFocusEffect } from "@react-navigation/native";
import { getAuth, Auth } from "firebase/auth";
import { doc } from "firebase/firestore";
import { CopilotProvider } from "react-native-copilot";
import { getDoc } from "firebase/firestore";

import { FIREBASE_APP, FIREBASE_FIRESTORE } from "../firebaseConfig";
import WorkHoursState from "../components/WorkHoursState";
import WorkHoursInput from "../components/WorkHoursInput";
import WorkTimeTracker from "../components/WorkTimeTracker";
import WorkHoursChart from "../components/WorkHoursChart";
import ErrorBoundary from "../components/ErrorBoundary";
import TourCard from "../components/services/copilotTour/TourCard";
import { useCopilotOffset } from "../components/services/copilotTour/CopilotOffset";
import CustomTooltip from "../components/services/copilotTour/CustomToolTip";

/////////////////////////////////////////////////////////////////////////////////////

type WorkHoursScreenRouteProps = {
  key: string;
  name: string;
  params: {
    projectId: string;
  };
};

//////////////////////////////////////////////////////////////////////////////////////

const WorkHoursScreen: React.FC<WorkHoursScreenRouteProps> = () => {
  // initialize the copilot offset
  const offset = useCopilotOffset();

  // initialize WorkHoursState
  const {} = WorkHoursState();

  // initialize Firebase Auth
  const auth: Auth = getAuth(FIREBASE_APP);

  // initialize routing
  const route = useRoute<WorkHoursScreenRouteProps>();

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
        setShowTourCard(data?.hasSeenWorkHoursTour === false);
      };

      fetchTourStatus();
    }, [])
  );

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

  return (
    <SafeAreaView
      style={{
        flex: 1,
      }}
    >
      <CopilotProvider
        verticalOffset={offset}
        tooltipComponent={CustomTooltip}
        stepNumberComponent={EmptyStepNumber}
        overlay="svg"
        arrowColor="aqua"
        backdropColor="rgba(0,0,0,0.6)"
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
                storageKey={`hasSeenWorkHoursTour`}
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
            style={{
              flex: 1,
              height: "100%",
              width: "100%",
            }}
          >
            <View
              style={{
                flex: 1,
                minHeight: "100%",
                justifyContent: "center",
                alignItems: "center",
                backgroundColor: "black",
                padding: 16,
                width: "100%",
                height: "100%",
              }}
            >
              <Text
                accessibilityRole="header"
                accessible
                accessibilityLabel="Workhours Management"
                style={{
                  fontSize: 25,
                  fontFamily: "MPLUSLatin_Bold",
                  color: "white",
                  marginBottom: 50,
                }}
              >
                - Workhours Management -
              </Text>
              {/* WorkHours Input */}
              <WorkHoursInput />
              <View
                style={{ marginTop: 20, width: "100%", alignItems: "center" }}
              >
                {/* Worktime Tracker */}
                <ErrorBoundary>
                  <WorkTimeTracker />
                </ErrorBoundary>
              </View>
              {/* Workhours Chart */}
              <WorkHoursChart />
            </View>
          </ScrollView>
        </View>
      </CopilotProvider>
    </SafeAreaView>
  );
};

export default WorkHoursScreen;

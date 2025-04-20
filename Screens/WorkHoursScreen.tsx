/////////////////////////////////Workhours Screen////////////////////////////////////

// This file shows the workhours screen with the workhours input card, the workhours chart card and the workhours tracker card

/////////////////////////////////////////////////////////////////////////////////////

import React, { useEffect, useState, useRef } from "react";
import { View, Text, SafeAreaView, ScrollView } from "react-native";
import { useRoute } from "@react-navigation/native";
import { getAuth, Auth } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { CopilotProvider } from "react-native-copilot";

import { FIREBASE_APP } from "../firebaseConfig";
import WorkHoursState from "../components/WorkHoursState";
import WorkHoursInput from "../components/WorkHoursInput";
import WorkTimeTracker from "../components/WorkTimeTracker";
import WorkHoursChart from "../components/WorkHoursChart";
import ErrorBoundary from "../components/ErrorBoundary";
import TourButton from "../components/services/copilotTour/TourButton";

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
  // initialize WorkHoursState
  const {} = WorkHoursState();

  // initialize Firebase Auth
  const auth: Auth = getAuth(FIREBASE_APP);
  // initialize routing
  const route = useRoute<WorkHoursScreenRouteProps>();
  // get projectId from routing
  const { projectId } = route.params || {};

  // ref for the Scrollview to navigate to the copilot tour
  const scrollViewRef = useRef<ScrollView>(null);
  const [scrollViewReady, setScrollViewReady] = useState(false);

  // state to show the copilot tour
  const [showTour, setShowTour] = useState<boolean>(false);

  // hook to check AsyncStorage if the user has already seen the tour
  useEffect(() => {
    AsyncStorage.getItem("hasSeenWorkHoursTour").then((hasSeenTour) => {
      if (!hasSeenTour) {
        setShowTour(true);
      }
    });
  }, [projectId]);

  return (
    <CopilotProvider
      overlay="svg"
      verticalOffset={40}
      backdropColor="rgba(5, 5, 5, 0.59)"
      arrowColor="#ffffff"
      labels={{
        previous: "Previous",
        next: "Next",
        skip: "Skip",
        finish: "Finish",
      }}
      tooltipStyle={{
        backgroundColor: "#ffffff",
        borderRadius: 8,
        padding: 0,
      }}
    >
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
        <SafeAreaView
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
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
              style={{ marginTop: 50, width: "100%", alignItems: "center" }}
            >
              {/* Worktime Tracker */}
              <ErrorBoundary>
                <WorkTimeTracker />
              </ErrorBoundary>
            </View>
            {/* Workhours Chart */}
            <WorkHoursChart />
          </View>
        </SafeAreaView>
      </ScrollView>
      {/* Tour button for the copilot tour */}
      <TourButton
        storageKey={`hasSeenWorkHoursTour`}
        userId={auth.currentUser?.uid ?? ""}
        scrollViewRef={scrollViewRef}
        scrollViewReady={scrollViewReady}
        needsRefCheck={true}
      />
    </CopilotProvider>
  );
};

export default WorkHoursScreen;

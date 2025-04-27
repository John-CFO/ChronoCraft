///////////////////////////////////// DetailsScreen Component////////////////////////////////////////////

// This component shows the project details in the DetailsScreen.
// It includes the project details card, time tracker card, earnings calculator card success chart and the project notes.

/////////////////////////////////////////////////////////////////////////////////////////////////////////

import { View, ScrollView } from "react-native";
import React, { useEffect, useState, useRef } from "react";
import { getAuth, Auth } from "firebase/auth";
import { StackNavigationProp } from "@react-navigation/stack";
import { useRoute, RouteProp } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { CopilotProvider } from "react-native-copilot";
import { SafeAreaView } from "react-native-safe-area-context";

import { FIREBASE_APP } from "../firebaseConfig";
import DetailsProjectCard from "../components/DetailsProjectCard";
import TimeTrackerCard from "../components/TimeTrackerCard";
import EarningsCalculatorCard from "../components/EarningsCalculatorCard";
import NoteList from "../components/NoteList";
import { useStore } from "../components/TimeTrackingState";
import { EarningsCalculatorCardProp } from "../components/EarningsCalculatorCard";
import RoutingLoader from "../components/RoutingLoader";
import ErrorBoundary from "../components/ErrorBoundary";
import TourCard from "../components/services/copilotTour/TourCard";
import { useCopilotOffset } from "../components/services/copilotTour/CopilotOffset";
import CustomTooltip from "../components/services/copilotTour/CustomToolTip";

//////////////////////////////////////////////////////////////////////////////////////////////////////

type DetailsScreenProps = {
  navigation: StackNavigationProp<RootStackParamList, "Details">;
  route: RouteProp<RootStackParamList, "Details"> | EarningsCalculatorCardProp;
};

type DetailsScreenRouteProp = RouteProp<RootStackParamList, "Details">;

type RootStackParamList = {
  Home: undefined;
  Details: {
    projectId: string;
    projectName: string;
    userId?: string;
    serviceId?: string;
  };
};

////////////////////////////////////////////////////////////////////////////////////////////////////////

const DetailsScreen: React.FC<DetailsScreenProps> = () => {
  const route = useRoute<DetailsScreenRouteProp>();

  // initialize the copilot offset
  const offset = useCopilotOffset();

  // initialize firebase auth
  const auth: Auth = getAuth(FIREBASE_APP);

  // route the projectId to the earnings calculator
  const { projectId } = route.params || {};

  const { setProjectId } = useStore();

  // save projectID in the state
  useEffect(() => {
    setProjectId(projectId);
  }, [projectId, setProjectId]);

  // function to ensure a minimum time that the routing loader is shown
  const [minTimePassed, setMinTimePassed] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => {
      setMinTimePassed(true);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  // ref for the Scrollview to navigate to the copilot tour
  const scrollViewRef = useRef<ScrollView>(null);
  const [scrollReady, setScrollReady] = useState(false);

  // state to manage the AsyncStorage copilot tour status
  const [showTour, setShowTour] = useState<boolean>(false);

  // state to handle if the copilot card is visible
  const [showTourCard, setShowTourCard] = useState(true);

  // hook to check AsyncStorage if the user has already seen the tour
  useEffect(() => {
    const hasSeenTour = AsyncStorage.getItem("hasSeenDetailsTour");
    if (!hasSeenTour) {
      setShowTour(true);
    }
  }, [projectId]);

  if (!minTimePassed) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "black",
        }}
      >
        <RoutingLoader />
      </View>
    );
  }

  // function to disable the copilot order and step number
  const EmptyStepNumber = () => {
    return null;
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      {/* // local DetailsScreen Provider (important if you need to adress a child
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
          {showTourCard && (
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
                storageKey={`hasSeenDetailsTour`}
                userId={auth.currentUser?.uid ?? ""}
                scrollViewRef={scrollViewRef}
                scrollViewReady={scrollReady}
                needsRefCheck={true}
                showTourCard={showTourCard}
                setShowTourCard={setShowTourCard}
              />
            </View>
          )}

          <ScrollView
            // scrollview ref and onlayout to navigate to the copilot tour
            ref={scrollViewRef}
            onLayout={() => setScrollReady(true)}
            style={{ backgroundColor: "black" }}
          >
            <View style={{ flex: 1, paddingHorizontal: 20, paddingBottom: 20 }}>
              {/* Project-Card */}
              <ErrorBoundary>
                <DetailsProjectCard showTour={showTour} />
              </ErrorBoundary>
              {/* Time-Tracker */}
              <ErrorBoundary>
                <TimeTrackerCard projectId={projectId} />
              </ErrorBoundary>
              {/* Earnings Calculator Card */}
              <ErrorBoundary>
                <EarningsCalculatorCard
                  route={route as EarningsCalculatorCardProp}
                  projectId={projectId}
                />
              </ErrorBoundary>
              {/* Notes Card */}

              <NoteList projectId={projectId} />
            </View>
          </ScrollView>
        </View>
      </CopilotProvider>
    </SafeAreaView>
  );
};

export default DetailsScreen;

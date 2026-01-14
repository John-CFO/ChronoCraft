///////////////////////////////////// DetailsScreen Component////////////////////////////////////////////

// This component shows the project details in the DetailsScreen.
// It includes the project details card, time tracker card, earnings calculator card success chart and the project notes.

/////////////////////////////////////////////////////////////////////////////////////////////////////////

import { View, ScrollView } from "react-native";
import React, { useEffect, useState, useRef, useCallback } from "react";
import { getAuth, Auth } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useRoute, RouteProp, useFocusEffect } from "@react-navigation/native";
import { CopilotProvider } from "react-native-copilot";
import { SafeAreaView } from "react-native-safe-area-context";

import { FIREBASE_APP, FIREBASE_FIRESTORE } from "../firebaseConfig";
import DetailsProjectCard from "../components/DetailsProjectCard";
import TimeTrackerCard from "../components/TimeTrackerCard";
import EarningsCalculatorCard from "../components/EarningsCalculatorCard";
import NoteList from "../components/NoteList";
import { useStore } from "../components/TimeTrackingState";
import RoutingLoader from "../components/RoutingLoader";
import ErrorBoundary from "../components/ErrorBoundary";
import TourCard from "../components/services/copilotTour/TourCard";
import { useCopilotOffset } from "../components/services/copilotTour/CopilotOffset";
import CustomTooltip from "../components/services/copilotTour/CustomToolTip";
import ProgressCard from "../components/ProgressCard";
import { usePreventBackWhileTracking } from "../components/PreventBackBTN";

//////////////////////////////////////////////////////////////////////////////////////////////////////

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

const DetailsScreen: React.FC = () => {
  // declare the route params
  const route = useRoute<DetailsScreenRouteProp>();

  // declare the copilot offset
  const offset = useCopilotOffset();

  // declare Firebase Auth
  const auth: Auth = getAuth(FIREBASE_APP);

  // use routing to get projectId
  const { projectId } = route.params || {};

  // get the current project id from the store
  const { setProjectId, isTracking } = useStore();

  // state for max work hours
  const [maxHoursFromDB, setMaxHoursFromDB] = useState<number | null>(null);

  // states to control the loading screen
  const [minTimePassed, setMinTimePassed] = useState(false);
  const [loading, setLoading] = useState(true);

  // state to control the copilot tour
  const [showTour, setShowTour] = useState(false);

  // state to control the copilot card
  const [showTourCard, setShowTourCard] = useState<boolean | null>(null);

  // state to handle if the copilot card is visible
  const [isTourCardVisible, setIsTourCardVisible] = useState(false);

  // states to control the scrollview
  const [scrollReady, setScrollReady] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  // use the preventBackWhileTracking hook from PreventBackBTN.tsx
  usePreventBackWhileTracking(projectId);

  // ensure state initialization consistency
  useEffect(() => {
    setProjectId(projectId); // set projectId on mount
  }, [projectId, setProjectId]);

  // hook to set minTimePassed after 3 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setMinTimePassed(true);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  // hook to check Firestore if the user has already seen the tour
  useFocusEffect(
    useCallback(() => {
      const fetchTourStatus = async () => {
        const uid = auth.currentUser?.uid;
        if (!uid) {
          setShowTourCard(false);
          return;
        }
        try {
          const docRef = doc(FIREBASE_FIRESTORE, "Users", uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            setShowTourCard(data.hasSeenDetailsTour === false);
          } else {
            // document does not exist
            setShowTourCard(false);
          }
        } catch (err) {
          console.error("Error fetching tour status:", err);
          setShowTourCard(false); // if there is an error
        }
      };
      fetchTourStatus();
    }, [auth.currentUser?.uid])
  );

  // hook to control the copilot tour card + animation timing to get visibility
  useEffect(() => {
    if (showTourCard === false) {
      setIsTourCardVisible(false);
      return;
    }
    if (!minTimePassed || loading || showTourCard !== true) return;
    const timer = setTimeout(() => {
      setIsTourCardVisible(true);
    }, 500);
    return () => clearTimeout(timer);
  }, [minTimePassed, loading, showTourCard]);

  // hook to control the loading screen
  useEffect(() => {
    if (minTimePassed) {
      setLoading(false);
    }
  }, [minTimePassed]);

  // function to disable the copilot order and step number
  const EmptyStepNumber = () => {
    return null;
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      {/* Loading Screen */}
      {(loading || !minTimePassed) && (
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 20,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "black",
          }}
        >
          <RoutingLoader />
        </View>
      )}
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
          {/* Copilot Tour Card */}
          {isTourCardVisible == true && (
            <View
              style={{
                position: "absolute",
                width: "100%",
                height: "100%",
                justifyContent: "center",
                alignItems: "center",
                backgroundColor: "rgba(0, 0, 0, 0.6)",
                zIndex: 10,
              }}
            >
              <TourCard
                storageKey="hasSeenDetailsTour"
                userId={auth.currentUser?.uid ?? ""}
                scrollViewRef={scrollViewRef}
                scrollViewReady={scrollReady}
                needsRefCheck={true}
                showTourCard={showTourCard ?? false}
                setShowTourCard={setShowTourCard}
              />
            </View>
          )}

          <ScrollView
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
                <EarningsCalculatorCard projectId={projectId} />
              </ErrorBoundary>
              <ErrorBoundary>
                {/* Progress Card */}
                <ProgressCard
                  projectId={projectId}
                  serviceId="AczkjyWoOxdPAIRVxjy3"
                  maxHoursFromDB={maxHoursFromDB}
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

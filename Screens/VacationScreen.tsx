///////////////////////////////////////VacationScreen//////////////////////////////////////////////

// This component shows the calendar, the vacation form and the vacation list.
// The user can create new vacations, edit existing vacations and delete vacations.

///////////////////////////////////////////////////////////////////////////////////////////////////

import { View, Text, ScrollView } from "react-native";
import React, { useEffect, useState, useRef } from "react";
import { useRoute } from "@react-navigation/native";
import { getAuth, Auth } from "firebase/auth";
import LottieView from "lottie-react-native";
import { useIsFocused } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { CopilotProvider } from "react-native-copilot";

import CustomCalendar from "../components/CustomCalendar";
import VacationForm from "../components/VacationForm";
import VacationList from "../components/VacationList";
import { FIREBASE_APP } from "../firebaseConfig";
import TourButton from "../components/TourButton";

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
  // initialize Firebase Auth
  const auth: Auth = getAuth(FIREBASE_APP);
  // initialize routing
  const route = useRoute<VacationScreenRouteProps>();
  // get projectId from routing
  const { projectId } = route.params || {};

  // ref for the Scrollview to navigate to the copilot tour
  const scrollViewRef = useRef<ScrollView>(null);
  const [scrollViewReady, setScrollViewReady] = useState(false);

  // state to show the copilot tour
  const [showTour, setShowTour] = useState<boolean>(false);

  // hook to check AsyncStorage if the user has already seen the tour
  useEffect(() => {
    AsyncStorage.getItem("hasSeenVacationTour").then((hasSeenTour) => {
      if (!hasSeenTour) {
        setShowTour(true);
      }
    });
  }, [projectId]);

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
    // local VacationScreen Provider (important if you need to adress a child component to the copilot tour)
    <CopilotProvider
      overlay="svg"
      verticalOffset={40}
      backdropColor="rgba(5, 5, 5, 0.59)"
      arrowColor="#ffffff"
      tooltipStyle={{
        backgroundColor: "#ffffff",
        padding: 10,
        borderRadius: 8,
        marginTop: -10,
      }}
    >
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
            style={{
              fontSize: 25,
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
              style={{
                zIndex: 2,
                fontSize: 18,
                fontFamily: "MPLUSLatin_ExtraLight",
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
        <View style={{ alignItems: "center", backgroundColor: "black" }}>
          <VacationForm />
        </View>
        {/* VacationList */}
        <View
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
      {/* Tour button for the copilot tour */}
      <TourButton
        storageKey={`hasSeenVacationTour`}
        userId={auth.currentUser?.uid ?? ""}
        scrollViewRef={scrollViewRef}
        scrollViewReady={scrollViewReady}
        needsRefCheck={true}
      />
    </CopilotProvider>
  );
};

export default VacationScreen;

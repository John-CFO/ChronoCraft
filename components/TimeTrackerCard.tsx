//////////////////////////////////////////// Time Tracker Card Component //////////////////////////////////

// this component is used to show the time tracker card in the details screen
// the user can start, pause and stop the timer and show the start time + date and the last session´s end time + date
// it is also possible to reset the timer the Ui information will be cleared and the timer will be set to 0
// the user can also set his hourly rate to calculate the total earnings. the total earnings and the hourly rate are shown in the details screen
// it used ProjectContext.tsx to get the project id to save the background task and let the Tracker work in the background

import {
  View,
  Text,
  TouchableOpacity,
  AppState,
  AppStateStatus,
} from "react-native";
import React, { useEffect, useState, useRef } from "react";
import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import { doc, setDoc, updateDoc, getDoc } from "firebase/firestore";
import { useRoute, RouteProp, useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert } from "react-native";
import { number } from "yup";

import { FIREBASE_FIRESTORE } from "../firebaseConfig";
import { useStore } from "./TimeTrackingState";
import { updateProjectData } from "../components/FirestoreService";

////////////////////////////////////////////////////////////////////////////////////////////////////////
type RootStackParamList = {
  Details: { projectId: string };
};

type TimeTrackerRouteProp = RouteProp<RootStackParamList, "Details">;

////////////////////////////////////////////////////////////////////////////////////////////////////////

const TimeTrackerCard = () => {
  const route = useRoute<TimeTrackerRouteProp>();
  const { projectId } = route.params;

  // global state
  const {
    startTimer,
    // pauseTimer,
    stopTimer,
    updateTimer,
    setTotalEarnings,
    getProjectState,
    resetAll,
  } = useStore();

  // local state
  const projectState = getProjectState(projectId) || {
    timer: 0,
    isTracking: false,
    lastStartTime: null,
    originalStartTime: null,
    pauseTime: null,
    endTime: null,
    hourlyRate: 0,
    totalEarnings: 0,
  };

  // initialize local timer with project state
  const [localTimer, setLocalTimer] = useState(projectState.timer);

  // useEffect to update the timer and calculate the total earnings in the TimeTrackerCard
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (projectState.isTracking) {
      interval = setInterval(() => {
        setLocalTimer((prevTimer) => {
          const newTimer = prevTimer + 1;
          updateTimer(projectId, newTimer);
          const earnings = (
            (newTimer / 3600) *
            projectState.hourlyRate
          ).toFixed(2); // .toFixed(2) limited the number of decimal places in max. 2
          setTotalEarnings(projectId, parseFloat(earnings));
          return newTimer;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [projectState.isTracking, projectState.hourlyRate]);

  // functions to start, pause, stop and reset the timer
  const handleStart = async () => {
    startTimer(projectId);
    await updateProjectData(projectId, {
      startTime: new Date(),
      isTracking: true,
    });
  };

  const handlePause = async () => {
    stopTimer(projectId);
    await updateProjectData(projectId, {
      isTracking: false,
      pauseTime: new Date(),
    });
    console.log("Timer pausiert.");
  };

  const handleStop = async () => {
    stopTimer(projectId);
    const earnings = parseFloat(
      ((localTimer / 3600) * projectState.hourlyRate).toFixed(2)
    );
    setTotalEarnings(projectId, earnings);

    await updateProjectData(projectId, {
      elapsedTime: localTimer,
      endTime: new Date(),
      totalEarnings: earnings,
      isTracking: false,
    });
  };

  const handleReset = async () => {
    await resetAll(projectId);

    setLocalTimer(0);
  };

  // function to format and round the time in the TimeTrackerCard
  function formatTime(timeInSeconds: number): string {
    if (timeInSeconds === undefined || isNaN(timeInSeconds)) {
      return "00:00:00"; // Fallback-Value
    }
    const roundedTime = Math.round(timeInSeconds);

    const hours = Math.floor(roundedTime / 3600);
    const minutes = Math.floor((roundedTime % 3600) / 60);
    const seconds = roundedTime % 60;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return (
    <View>
      {/* Time Tracker Card */}
      <View
        style={{
          height: 600,
          marginBottom: 20,
          backgroundColor: "#191919",
          borderWidth: 1,
          borderColor: "aqua",
          borderRadius: 8,
          padding: 20,
          alignItems: "center",
        }}
      >
        <Text
          style={{
            fontFamily: "MPLUSLatin_Bold",
            fontSize: 25,
            color: "white",
            marginBottom: 20,
            textAlign: "center",
          }}
        >
          Time Tracker
        </Text>

        <View
          style={{
            width: "80%",
            height: 100,
            backgroundColor: "#191919",
            borderColor: "aqua",
          }}
        >
          {/* Timer */}
          <Text
            style={{
              fontWeight: "bold",
              fontSize: 55,
              color: "white",
              marginBottom: 5,
              textAlign: "center",
            }}
          >
            {formatTime(localTimer)}
          </Text>
        </View>

        {/* Start, Pause, Stop Buttons */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-evenly",
            alignItems: "center",
            marginBottom: 10,
            marginTop: 30,
            width: "100%",
            backgroundColor: "#191919",
          }}
        >
          <TouchableOpacity onPress={handlePause}>
            <FontAwesome6 name="pause" size={65} color="lightgrey" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleStart}>
            <FontAwesome5 name="play" size={85} color="lightgrey" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleStop}>
            <FontAwesome5 name="stop" size={52} color="lightgrey" />
          </TouchableOpacity>
        </View>

        <View
          style={{
            paddingTop: 30,
            width: "100%",
            height: 100,
            backgroundColor: "#191919",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          {/* Reset Button */}
          <TouchableOpacity
            onPress={handleReset}
            style={{
              width: 120,
              borderRadius: 12,
              overflow: "hidden",
              borderWidth: 3,
              borderColor: "white",
              marginBottom: 30,
            }}
          >
            <LinearGradient
              colors={["#00FFFF", "#FFFFFF"]}
              style={{
                alignItems: "center",
                justifyContent: "center",
                height: 45,
                width: 120,
              }}
            >
              <Text
                style={{
                  fontFamily: "MPLUSLatin_Bold",
                  fontSize: 22,
                  color: "grey",
                  marginBottom: 5,
                  paddingRight: 10,
                }}
              >
                Reset
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
        {/* info container */}
        <View
          style={{
            width: "100%",
            height: 165,
            marginBottom: 20,
            padding: 5,
            paddingLeft: 15,
            borderRadius: 10,
            backgroundColor: "#191919",
            alignItems: "flex-start",
            justifyContent: "flex-start",
            //shadow options for android
            shadowColor: "#ffffff",
            elevation: 5,
            //shadow options for ios
            shadowOffset: { width: 2, height: 2 },
            shadowOpacity: 0.3,
            shadowRadius: 3,
          }}
        >
          {/*last session info*/}
          <Text
            style={{
              fontFamily: "MPLUSLatin_Bold",
              fontSize: 16,
              color: "white",
              marginBottom: 5,
            }}
          >
            <Text style={{ color: "grey" }}>Last Session:</Text>
            {" \n"}
            {projectState.endTime
              ? new Date(projectState.endTime).toLocaleString()
              : "N/A"}
          </Text>
          {/*last tracking info*/}
          <Text
            style={{
              fontFamily: "MPLUSLatin_Bold",
              fontSize: 16,
              color: "white",
              marginBottom: 5,
            }}
          >
            <Text style={{ color: "grey" }}>Last Tracking Started:</Text> {"\n"}
            {projectState.lastStartTime
              ? new Date(projectState.lastStartTime).toLocaleString()
              : "N/A"}
          </Text>
          {/*original tracking info*/}
          <Text
            style={{
              fontFamily: "MPLUSLatin_Bold",
              fontSize: 16,
              color: "white",
              marginBottom: 5,
            }}
          >
            <Text style={{ color: "grey" }}>Original Tracking Started:</Text>
            {"\n"}
            {projectState.originalStartTime
              ? new Date(projectState.originalStartTime).toLocaleString()
              : "N/A"}
          </Text>
        </View>
      </View>
    </View>
  );
};

export default TimeTrackerCard;

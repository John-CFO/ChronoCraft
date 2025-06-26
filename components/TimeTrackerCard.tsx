//////////////////////////////////////////// Time Tracker Card Component //////////////////////////////////

// this component is used to show the time tracker card in the details screen
// the user can start, pause and stop the timer and show the start time + date and the last session´s end time + date
// it is also possible to reset the timer the Ui information will be cleared and the timer will be set to 0
// the user can also set his hourly rate to calculate the total earnings. the total earnings and the hourly rate are shown in the details screen
// it used ProjectContext.tsx to get the project id to save the background task and let the Tracker work in the background

///////////////////////////////////////////////////////////////////////////////////////////////////////////

import {
  View,
  Text,
  TouchableOpacity,
  AppState,
  AppStateStatus,
  Dimensions,
} from "react-native";
import React, { useState, useEffect, useRef } from "react";
import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import * as Animatable from "react-native-animatable";
import { doc, getDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { useRoute, RouteProp } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { CopilotStep, walkthroughable } from "react-native-copilot";

import { FIREBASE_FIRESTORE } from "../firebaseConfig";
import { useStore, ProjectState } from "./TimeTrackingState";
import { updateProjectData } from "../components/FirestoreService";
import { useAlertStore } from "../components/services/customAlert/alertStore";

////////////////////////////////////////////////////////////////////////////////////////////////////////////
type RootStackParamList = {
  Details: { projectId: string };
};

type TimeTrackerRouteProp = RouteProp<RootStackParamList, "Details">;

interface TimeTrackingCardsProps {
  projectId: string;
}
////////////////////////////////////////////////////////////////////////////////////////////////////////////

// modified walkthroughable for copilot tour
const CopilotWalkthroughView = walkthroughable(View);

const TimeTrackerCard: React.FC<TimeTrackingCardsProps> = () => {
  // initialize the routing
  const route = useRoute<TimeTrackerRouteProp>();
  const { projectId } = route.params;

  // screensize for dynamic size calculation
  const screenWidth = Dimensions.get("window").width;

  // use the global state to fetch data from firestore
  const { lastStartTime, endTime, originalStartTime } = useStore((state) => ({
    lastStartTime: state.projects[projectId]?.lastStartTime,
    endTime: state.projects[projectId]?.endTime,
    timer: state.projects[projectId]?.timer,
    totalEarnings: state.projects[projectId]?.totalEarnings,
    originalStartTime: state.projects[projectId]?.originalStartTime,
  }));

  // project state(getProjectState is used to get the project UI state if app is started)
  const projectState = useStore.getState().getProjectState(projectId) || {
    timer: 0,
    isTracking: false,
    lastStartTime: null,
    originalStartTime: null,
    pauseTime: null,
    endTime: null,
    hourlyRate: 0,
    totalEarnings: 0,
    startTime: null,
  };

  // state from useStore to update the UI(Earnings and Progress)
  const isTracking = useStore((state) => state.projects[projectId]?.isTracking);
  const hourlyRate = useStore((state) => state.projects[projectId]?.hourlyRate);
  const appState = useStore((state) => state.appState);

  // global state
  const {
    currentProjectId,
    startTimer,
    stopTimer,
    updateTimer,
    setTotalEarnings,
    resetAll,
    setAppState,
    setIsInitialized,
    setProjectData,
  } = useStore();

  // refs for timer logic
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const accumulatedTimeRef = useRef<number>(projectState?.timer || 0);
  const globalUpdateIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // state only for the UI
  const [displayTime, setDisplayTime] = useState<number>(
    projectState?.timer || 0
  );

  // hook to fetch project data from firestore when navigate from home screen to details screen
  useEffect(() => {
    const fetchProjectData = async () => {
      const user = getAuth().currentUser;
      if (!user) {
        console.error("User is not authenticated.");
        return false;
      }
      if (currentProjectId) {
        try {
          const docRef = doc(
            FIREBASE_FIRESTORE,
            "Users",
            user.uid,
            "Services",
            "AczkjyWoOxdPAIRVxjy3",
            "Projects",
            currentProjectId
          );
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            const projectData = docSnap.data();
            const formattedData = {
              ...projectData,
              originalStartTime: projectData.originalStartTime
                ? projectData.originalStartTime.toDate()
                : null,
              endTime: projectData.endTime
                ? projectData.endTime.toDate()
                : null,
              lastStartTime: projectData.lastStartTime
                ? projectData.lastStartTime.toDate()
                : null,
            };

            // Update refs and state with Firestore data
            const timerValue = projectData.timer || 0;
            accumulatedTimeRef.current = timerValue;
            setDisplayTime(timerValue);

            setProjectData(currentProjectId, formattedData as ProjectState);
          } else {
            console.error("No such document!");
          }
        } catch (error) {
          console.error("Error fetching Firestore data:", error);
        }
      }
    };

    fetchProjectData();
  }, [currentProjectId, setProjectData]);

  // state function to update the timer in the TimeTrackerCard if app is in foreground
  const [delayedElapsedTime, setDelayedElapsedTime] = useState<number | null>(
    null
  );

  // function to handle app state changes if app is in background or foreground
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      if (
        appState.match(/(inactive|background)/) &&
        nextAppState === "active" &&
        projectState.isTracking
      ) {
        const lastTime = await AsyncStorage.getItem(
          `lastActiveTime_${projectId}`
        );
        if (lastTime) {
          const lastTimeMs = new Date(lastTime).getTime();
          const now = Date.now();
          if (!isNaN(lastTimeMs) && lastTimeMs < now) {
            const elapsedTime = (now - lastTimeMs) / 1000;
            setDelayedElapsedTime(elapsedTime);
          }
          await AsyncStorage.removeItem(`lastActiveTime_${projectId}`);
        }
        setIsInitialized(true);
      }
      if (
        nextAppState.match(/inactive|background/) &&
        projectState.isTracking
      ) {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
          animationRef.current = null;
        }

        // clear global update interval
        if (globalUpdateIntervalRef.current) {
          clearInterval(globalUpdateIntervalRef.current);
          globalUpdateIntervalRef.current = null;
        }

        const timestamp = new Date().toISOString();
        await AsyncStorage.setItem(`lastActiveTime_${projectId}`, timestamp);
        setIsInitialized(false);
      }
      setAppState(nextAppState);
    };
    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange
    );

    return () => subscription.remove();
  }, [
    appState,
    projectId,
    projectState.isTracking,
    setIsInitialized,
    setAppState,
  ]);

  // hook to delay the update of the timer until the elapsed time is calculated
  useEffect(() => {
    if (delayedElapsedTime !== null) {
      const newTimer = accumulatedTimeRef.current + delayedElapsedTime;
      accumulatedTimeRef.current = newTimer;
      setDisplayTime(newTimer);
      updateTimer(projectId, Math.floor(newTimer));
      setTotalEarnings(
        projectId,
        (Math.floor(newTimer) / 3600) * projectState.hourlyRate
      );
      setDelayedElapsedTime(null);
    }
  }, [delayedElapsedTime]);

  // setup global state update interval
  useEffect(() => {
    // if App is foreground and tracking is active → start interval
    if (isTracking && appState === "active") {
      globalUpdateIntervalRef.current = setInterval(() => {
        const seconds = Math.floor(accumulatedTimeRef.current);
        updateTimer(projectId, seconds);
        setTotalEarnings(projectId, (seconds / 3600) * (hourlyRate ?? 0));
      }, 10000);
    } else {
      // otherwise clear interval
      if (globalUpdateIntervalRef.current) {
        clearInterval(globalUpdateIntervalRef.current);
        globalUpdateIntervalRef.current = null;
      }
    }

    return () => {
      if (globalUpdateIntervalRef.current) {
        clearInterval(globalUpdateIntervalRef.current);
        globalUpdateIntervalRef.current = null;
      }
    };
  }, [isTracking, hourlyRate, appState]);

  // UI Timer with requestAnimationFrame
  useEffect(() => {
    let lastTimestamp: number | null = null;

    const update = (timestamp: number) => {
      if (!startTimeRef.current) {
        lastTimestamp = timestamp;
        animationRef.current = requestAnimationFrame(update);
        return;
      }

      if (lastTimestamp === null) {
        lastTimestamp = timestamp;
      }

      const elapsed = (timestamp - lastTimestamp) / 1000; // in seconds
      lastTimestamp = timestamp;

      accumulatedTimeRef.current += elapsed;
      setDisplayTime(accumulatedTimeRef.current);

      animationRef.current = requestAnimationFrame(update);
    };

    if (projectState.isTracking && appState === "active") {
      startTimeRef.current = Date.now();
      lastTimestamp = null;
      animationRef.current = requestAnimationFrame(update);
    } else {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [projectState.isTracking, appState]);

  // function to start the timer
  const handleStart = async () => {
    if (!projectState.isTracking) {
      accumulatedTimeRef.current = displayTime;
      startTimer(projectId);
      await updateProjectData(projectId, {
        startTime: new Date(),
        isTracking: true,
      });
    }
  };

  // function to pause the timer
  const handlePause = async () => {
    if (projectState.isTracking) {
      stopTimer(projectId);
      const currentSeconds = Math.floor(accumulatedTimeRef.current);
      updateTimer(projectId, currentSeconds);
      setTotalEarnings(
        projectId,
        (currentSeconds / 3600) * projectState.hourlyRate
      );

      await updateProjectData(projectId, {
        isTracking: false,
        pauseTime: new Date(),
      });
    }
  };

  // function to stop the timer
  const handleStop = async () => {
    if (projectState.isTracking) {
      handlePause();
    }
  };

  // function to reset the timer
  const [resetting, setResetting] = useState(false);
  const handleReset = async () => {
  useAlertStore
    .getState()
    .showAlert(
      "Attention!",
      "Do you really want to reset the project? If you reset the project, all data will be deleted.",
      [
        {
          text: "Cancel",
          onPress: () => console.log("Project reset canceled"),
          style: "cancel",
        },
        {
          text: "Reset",
          style: "destructive",
          onPress: async () => {
            await resetAll(projectId);
            accumulatedTimeRef.current = 0;
            setDisplayTime(0);
          },
        },
      ]
    );
};

  // function to format and round the time in the TimeTrackerCard
  function formatTime(timeInSeconds: number): string {
    const roundedTime = Math.round(timeInSeconds);
    const hours = Math.floor(roundedTime / 3600);
    const minutes = Math.floor((roundedTime % 3600) / 60);
    const seconds = roundedTime % 60;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
      2,
      "0"
    )}:${String(seconds).padStart(2, "0")}`;
  }

  return (
    <View>
      {/* DetailsScreen copilot tour step 4 */}
      <CopilotStep
        name="Time-Tracker"
        order={4}
        text="The Time Tracker Card lets you track your working time on this project and shows the session state."
      >
        {/* Time Tracker Card */}
        <CopilotWalkthroughView
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
            Time-Tracker
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
              {formatTime(displayTime)}
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
              width: screenWidth * 0.7, // use 70% of the screen width
              maxWidth: 320,
              backgroundColor: "#191919",
            }}
          >
            <TouchableOpacity onPress={handlePause}>
              <FontAwesome6 name="pause" size={65} color="lightgrey" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleStart}>
              <Animatable.View animation="pulse" iterationCount="infinite">
                <FontAwesome5 name="play" size={85} color="lightgrey" />
              </Animatable.View>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleStop}>
              <FontAwesome5 name="stop" size={52} color="lightgrey" />
            </TouchableOpacity>
          </View>

          <View
            style={{
              paddingTop: 30,
              width: "100%",
              backgroundColor: "#191919",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            {/* Reset Button */}
            <TouchableOpacity
              onPress={handleReset}
              style={{
                width: screenWidth * 0.7, // use 70% of the screen width
                maxWidth: 400,
                borderRadius: 12,
                overflow: "hidden",
                borderWidth: 2,
                borderColor: resetting ? "lightgray" : "aqua",
                marginBottom: 30,
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
                }}
              >
                <Text
                  style={{
                    fontFamily: "MPLUSLatin_Bold",
                    fontSize: 22,
                    color: resetting ? "lightgray" : "white",
                    marginBottom: 5,
                    paddingRight: 10,
                  }}
                >
                  {resetting ? "Resetting..." : "Reset"}
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
              elevation: 2,
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
              {"\n"}
              {/*to prevent konflicts with Date types and timestamps it´s important to use not both*/}
              {endTime instanceof Date ? endTime.toLocaleString() : "N/A"}
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
              <Text style={{ color: "grey" }}>Last Tracking Started:</Text>
              {"\n"}
              {lastStartTime instanceof Date
                ? lastStartTime.toLocaleString()
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
              {originalStartTime
                ? originalStartTime instanceof Date
                  ? originalStartTime.toLocaleString()
                  : "N/A"
                : "N/A"}
            </Text>
          </View>
        </CopilotWalkthroughView>
      </CopilotStep>
    </View>
  );
};

export default TimeTrackerCard;

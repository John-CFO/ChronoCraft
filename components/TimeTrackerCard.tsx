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

  // global state
  const {
    appState,
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

  // initialize local timer with project state
  const [localTimer, setLocalTimer] = useState(projectState?.timer || 0);

  // hook to update localTimer when projectState.timer changes
  useEffect(() => {
    //  console.log("projectState.timer:", projectState?.timer);
    if (
      projectState?.timer !== undefined &&
      projectState?.timer !== localTimer
    ) {
      setLocalTimer(projectState.timer);
    }
  }, [projectState?.timer]);

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
            // change the type of originalStartTime, endTime, and lastStartTime to Date if it´s necessary
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

            // Set local state with Firestore data
            /*console.log("Fetched projectData:", projectData);
            console.log("Original Start Time:", originalStartTime);
            console.log(
              "Type of Original Start Time:",
              typeof originalStartTime
            ); */
            // update localTimer with projectData.timer
            setLocalTimer(projectData.timer);

            // update Zustand store with project data
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
          const now = new Date().getTime();
          if (!isNaN(lastTimeMs) && lastTimeMs < now) {
            const elapsedTime = (now - lastTimeMs) / 1000;
            // safe the elapsed time to the state
            setDelayedElapsedTime(elapsedTime);
          }
          // reset after a certain amount of time
          await AsyncStorage.removeItem(`lastActiveTime_${projectId}`);
        }
        setIsInitialized(true);
      }
      if (
        nextAppState.match(/inactive|background/) &&
        projectState.isTracking
      ) {
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
      const newTimer = localTimer + delayedElapsedTime;
      setLocalTimer(newTimer);
      updateTimer(projectId, newTimer);
      setTotalEarnings(projectId, (newTimer / 3600) * projectState.hourlyRate);
      setDelayedElapsedTime(null);
    }
  }, [delayedElapsedTime]);

  // hook to calculate and update the timer
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | number;
    if (projectState.isTracking) {
      interval = setInterval(() => {
        setLocalTimer((prevTimer) => prevTimer + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [projectState.isTracking]);

  // hook to update the timer,calculate the earnings and set them in the global state
  // useRef flag to guard against updates after a reset and prevent infinite loops
  const isResetting = useRef(false);
  // hook to sync localTimer with global state and recalculate earnings
  useEffect(() => {
    // guard to skip updates during reset to avoid infinite loop
    if (isResetting.current) {
      isResetting.current = false; // reset the guard after one skip
      return;
    }

    if (localTimer !== projectState.timer) {
      updateTimer(projectId, localTimer);
      const earnings = (localTimer / 3600) * projectState.hourlyRate;
      setTotalEarnings(projectId, earnings);
    }
  }, [localTimer, projectState.timer, projectState.hourlyRate]);

  // function to start  the timer
  const handleStart = async () => {
    startTimer(projectId);
    await updateProjectData(projectId, {
      startTime: new Date(),
      isTracking: true,
    });
    // console.log("Starting timer:");
  };

  // function to pause the timer
  const handlePause = async () => {
    stopTimer(projectId);

    await updateProjectData(projectId, {
      isTracking: false,
      pauseTime: new Date(),
    });
    // console.log("Timer pausiert.");
  };

  // function to stop the timer
  const handleStop = async () => {
    stopTimer(projectId);
  };

  // function to reset the timer
  const handleReset = async () => {
    // alert to inform user what he has to do first before pressing the reset button
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
              isResetting.current = true; // set guard to prevent updates in effect
              await resetAll(projectId);
              setLocalTimer(0); // reset local UI timer
            },
          },
        ]
      );
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
                width: screenWidth * 0.7, // use 70% of the screen width
                maxWidth: 400,
                borderRadius: 12,
                overflow: "hidden",
                borderWidth: 3,
                borderColor: "white",
                marginBottom: 25,
              }}
            >
              <LinearGradient
                colors={["#00FFFF", "#FFFFFF"]}
                style={{
                  alignItems: "center",
                  justifyContent: "center",
                  height: 45,
                  width: screenWidth * 0.7, // use 70% of the screen width
                  maxWidth: 400,
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

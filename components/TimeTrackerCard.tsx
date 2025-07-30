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
import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import * as Animatable from "react-native-animatable";
import { doc, getDoc, updateDoc, Timestamp } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { useRoute, RouteProp } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { CopilotStep, walkthroughable } from "react-native-copilot";

import { FIREBASE_FIRESTORE } from "../firebaseConfig";
import { useStore, ProjectState } from "./TimeTrackingState";
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

// function to format the time in hours, minutes and seconds
function formatTime(seconds: number, showMs = false): string {
  const totalSeconds = seconds;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  if (showMs) {
    const ms = Math.floor((secs % 1) * 100);
    return (
      [
        String(hours).padStart(2, "0"),
        String(minutes).padStart(2, "0"),
        String(Math.floor(secs)).padStart(2, "0"),
      ].join(":") + `.${String(ms).padStart(2, "0")}`
    );
  }

  return [
    String(hours).padStart(2, "0"),
    String(minutes).padStart(2, "0"),
    String(Math.round(secs)).padStart(2, "0"),
  ].join(":");
}

const TimeTrackerCard: React.FC<TimeTrackingCardsProps> = () => {
  // initialize the routing
  const route = useRoute<TimeTrackerRouteProp>();
  const { projectId } = route.params;

  // screensize for dynamic size calculation
  const screenWidth = Dimensions.get("window").width;

  // Debugging functions
  // log function to log messages
  // const log = (message: string, data?: any) => {
  //   console.log(`[TimeTrackerCard:${projectId}] ${message}`, data || "");
  // };

  //warn function to log warnings
  // const warn = (message: string, data?: any) => {
  //   console.warn(`[TimeTrackerCard:${projectId}] WARN: ${message}`, data || "");
  // };

  // error function to log errors
  const error = (message: string, data?: any) => {
    console.error(
      `[TimeTrackerCard:${projectId}] ERROR: ${message}`,
      data || ""
    );
  };

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
  const appState = useStore((state) => state.appState);
  const hourlyRate = useStore(
    (state) => state.projects[projectId]?.hourlyRate || 0
  );

  // global state
  const {
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
  const accumulatedTimeRef = useRef<number>(projectState?.timer || 0);

  // Ref for restoring the timer if app is started after a hardkill
  const isRestoringRef = useRef(true);

  // state only for the UI
  const [displayTime, setDisplayTime] = useState<number>(
    projectState?.timer || 0
  );

  // formattedTime function using useMemo to get a bether performance with preventing unnecessary re-renders
  const formattedTime = useMemo(() => formatTime(displayTime), [displayTime]);

  // hook for isTracking Ref
  const isTrackingRef = useRef(isTracking);
  useEffect(() => {
    isTrackingRef.current = isTracking;
  }, [isTracking]);

  // state to check if timer is restored
  const [isTimerRestored, setIsTimerRestored] = useState(false);

  // hook to fetch project data from firestore when navigate from home screen to details screen
  const fetchProjectData = useCallback(async () => {
    // log("Fetching project data started");
    const user = getAuth().currentUser;
    if (!user) {
      console.error("User is not authenticated.");
      return;
    }
    try {
      const docRef = doc(
        FIREBASE_FIRESTORE,
        "Users",
        user.uid,
        "Services",
        "AczkjyWoOxdPAIRVxjy3",
        "Projects",
        projectId
      );
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const projectData = docSnap.data();
        const formattedData = {
          ...projectData,
          originalStartTime: projectData.originalStartTime
            ? projectData.originalStartTime.toDate()
            : null,
          endTime: projectData.endTime ? projectData.endTime.toDate() : null,
          lastStartTime: projectData.lastStartTime
            ? projectData.lastStartTime.toDate()
            : null,
        };
        // log("Project data fetched successfully", formattedData);
        setProjectData(projectId, formattedData as ProjectState);
      } else {
        // console.error("No such document!");
        // warn("Project document does not exist");
      }
    } catch (error) {
      console.error("Error fetching Firestore data:", error);
    }
  }, [projectId, setProjectData]);

  // hook to update the hourly rate using the ref
  const hourlyRateRef = useRef(hourlyRate);
  useEffect(() => {
    hourlyRateRef.current = hourlyRate;
  }, [hourlyRate]);

  // ref to compare the last whole second when updating the timer
  const lastWholeSecondRef = useRef(Math.floor(accumulatedTimeRef.current));

  // function to start the animation
  const startAnimation = useCallback(() => {
    if (animationRef.current) return;

    // log("Starting timer animation");

    let lastTimestamp: number | null = null;
    // let lastEarningsUpdate = 0; // timestamp of the last earnings update

    const update = (timestamp: number) => {
      if (!isTrackingRef.current) {
        // log("Stopping animation - tracking stopped");
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
          animationRef.current = null;
        }
        return;
      }

      if (!lastTimestamp) lastTimestamp = timestamp;
      const elapsed = (timestamp - lastTimestamp) / 1000;
      lastTimestamp = timestamp;

      const newTime = accumulatedTimeRef.current + elapsed;
      accumulatedTimeRef.current = newTime;

      const currentWholeSecond = Math.floor(newTime);
      if (currentWholeSecond !== lastWholeSecondRef.current) {
        setDisplayTime(newTime);
        updateTimer(projectId, currentWholeSecond);
        lastWholeSecondRef.current = currentWholeSecond;
      }
      animationRef.current = requestAnimationFrame(update);
    };

    animationRef.current = requestAnimationFrame(update);
  }, [projectId, updateTimer]);

  // hook to update the total earnings
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTracking) {
      const earnings =
        (Math.floor(accumulatedTimeRef.current) / 3600) * hourlyRate;
      setTotalEarnings(projectId, earnings);

      // start the earnings update interval
      interval = setInterval(() => {
        const earnings =
          (Math.floor(accumulatedTimeRef.current) / 3600) * hourlyRate;
        setTotalEarnings(projectId, earnings);
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [isTracking, hourlyRate, projectId, setTotalEarnings]);

  // function to handle app state changes if app is in background or foreground
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      // log("App state changed", { current: appState, next: nextAppState });

      // app comes to foreground
      if (
        appState.match(/(inactive|background)/) &&
        nextAppState === "active"
      ) {
        // log("App coming to foreground");

        const key = `lastActiveTime_${projectId}`;
        const lastTime = await AsyncStorage.getItem(key);

        if (lastTime) {
          const lastTimeMs = new Date(lastTime).getTime();
          const now = Date.now();

          if (!isNaN(lastTimeMs) && lastTimeMs < now) {
            const elapsedTime = (now - lastTimeMs) / 1000;
            const newTime = accumulatedTimeRef.current + elapsedTime;

            // update timer
            accumulatedTimeRef.current = newTime;
            setDisplayTime(newTime);
            updateTimer(projectId, Math.floor(newTime));

            // update earnings
            const earnings = (Math.floor(newTime) / 3600) * hourlyRate;
            setTotalEarnings(projectId, earnings);
          }

          await AsyncStorage.removeItem(key);
        }
        if (isTrackingRef.current) {
          startAnimation();
        }

        setIsInitialized(true);
      }

      // app is going to background
      if (nextAppState.match(/inactive|background/)) {
        // log("App going to background");

        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
          animationRef.current = null;
        }

        const timestamp = new Date().toISOString();
        const lastKey = `lastActiveTime_${projectId}`;
        const persistKey = `persistedTimer_${projectId}`;
        const isTrackingKey = `isTracking_${projectId}`;

        await AsyncStorage.setItem(lastKey, timestamp);
        await AsyncStorage.setItem(
          persistKey,
          accumulatedTimeRef.current.toString()
        );
        await AsyncStorage.setItem(
          isTrackingKey,
          isTrackingRef.current.toString()
        );

        setIsInitialized(false);
      }

      setAppState(nextAppState);
    };

    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange
    );
    return () => subscription.remove();
  }, [appState, projectId, setIsInitialized, setAppState, startAnimation]);

  // hook for the persitence interval
  useEffect(() => {
    // log("Timer update effect", {
    //   isTimerRestored,
    //   isTracking: projectState.isTracking,
    //   appState,
    // });

    if (!isTimerRestored) return;
    if (appState !== "active") return;

    // start animation when tracking is started
    if (projectState.isTracking) {
      startAnimation();
    } else {
      // stop animation when tracking is stopped
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [projectState.isTracking, appState, isTimerRestored, startAnimation]);

  // hook to restore the timer from AsyncStorage
  const restorePersistedTimer = useCallback(async () => {
    // log("Restoring persisted timer started");
    try {
      const key = `persistedTimer_${projectId}`;
      const isTrackingKey = `isTracking_${projectId}`;

      const persisted = await AsyncStorage.getItem(key);
      const wasTracking = await AsyncStorage.getItem(isTrackingKey);

      // log("Restore values", { persisted, wasTracking });

      if (persisted !== null) {
        const persistedTime = parseInt(persisted, 10);
        // log("Restoring timer value", persistedTime);

        // update timer state
        accumulatedTimeRef.current = persistedTime;
        setDisplayTime(persistedTime);
        updateTimer(projectId, Math.floor(persistedTime));

        // calculate earnings
        const earnings = (Math.floor(persistedTime) / 3600) * hourlyRate;
        setTotalEarnings(projectId, earnings);

        if (wasTracking === "true") {
          if (appState === "active") {
            // log("Restoring tracking state - starting timer");
            if (!isTrackingRef.current) {
              // log("Restoring tracking state - starting timer");
              startTimer(projectId);
              isTrackingRef.current = true;
              startAnimation();
            } else {
              // log("Tracking already active - no need to restart");
            }
          } else {
            // log(
            //   "Tracking was active but app is not foreground - not starting timer"
            // );
          }
        }
      } else {
        // log("No persisted timer found");
      }
    } catch (error) {
      console.error("[RESTORE] error in restorePersistedTimer:", error);
    } finally {
      isRestoringRef.current = false;
      setIsTimerRestored(true);
      // log("Restore completed");

      await new Promise((resolve) => setTimeout(resolve, 100));
      await AsyncStorage.removeItem(`persistedTimer_${projectId}`);
      await AsyncStorage.removeItem(`isTracking_${projectId}`);
    }
  }, [projectId, hourlyRate, appState, startAnimation]);

  // hook to initialize the component
  useEffect(() => {
    // log("Initialization effect started");
    const initialize = async () => {
      // log("Initializing component...");
      await fetchProjectData();
      await restorePersistedTimer();
      // log("Initialization completed");
    };

    initialize();
  }, [fetchProjectData, restorePersistedTimer]);

  // Screen-change persistence
  useEffect(() => {
    // log("Screen persistence effect setup");

    return () => {
      // log("Screen unmounting - saving state");

      const saveState = async () => {
        try {
          // log("Saving state before unmount", {
          //   time: accumulatedTimeRef.current,
          //   isTracking: isTrackingRef.current,
          // });

          await AsyncStorage.setItem(
            `persistedTimer_${projectId}`,
            accumulatedTimeRef.current.toString()
          );

          await AsyncStorage.setItem(
            `isTracking_${projectId}`,
            isTrackingRef.current.toString()
          );

          // log("State saved successfully");

          if (isTrackingRef.current) {
            // log("Updating Firestore for active timer");
            await updateProjectData({
              isTracking: false,
              pauseTime: new Date(),
            });
          }
        } catch (err) {
          error("Error saving state", err);
        }
      };

      saveState();

      if (animationRef.current) {
        // log("Canceling animation frame");
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [projectId]);

  // hook to update the project data
  const updateProjectData = useCallback(
    async (data: Partial<ProjectState>) => {
      const user = getAuth().currentUser;
      if (!user) {
        console.error("User is not authenticated.");
        return;
      }

      try {
        const projectRef = doc(
          FIREBASE_FIRESTORE,
          "Users",
          user.uid,
          "Services",
          "AczkjyWoOxdPAIRVxjy3",
          "Projects",
          projectId
        );

        // convert Date-Objects to Firestore Timestamp
        const convertedData: Record<string, any> = {};
        Object.entries(data).forEach(([key, value]) => {
          if (value instanceof Date) {
            convertedData[key] = Timestamp.fromDate(value);
          } else {
            convertedData[key] = value;
          }
        });

        await updateDoc(projectRef, convertedData);
        // log("Project data updated in Firestore", convertedData);
      } catch (error) {
        console.error("Error updating project data:", error);
      }
    },
    [projectId]
  );

  // function to start the timer
  const handleStart = async () => {
    if (!isTrackingRef.current) {
      startTimer(projectId);
      isTrackingRef.current = true;
      startAnimation();

      await updateProjectData({
        startTime: new Date(),
        isTracking: true,
      } as Partial<ProjectState>);
    }
  };

  // function to pause the timer
  const handlePause = async () => {
    if (isTrackingRef.current) {
      // Animation stoppen
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }

      stopTimer(projectId);
      isTrackingRef.current = false;

      await updateProjectData({
        isTracking: false,
        pauseTime: new Date(),
      } as Partial<ProjectState>);
    }
  };

  // function to stop the timer
  const handleStop = async () => {
    if (isTrackingRef.current) {
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
              await AsyncStorage.removeItem(`persistedTimer_${projectId}`);
              await AsyncStorage.removeItem(`isTracking_${projectId}`);
              await AsyncStorage.removeItem(`timerState_${projectId}`);
            },
          },
        ]
      );
  };

  // Cleanup when component unmounts
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

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
              {formattedTime}
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
              width: screenWidth * 0.7,
              maxWidth: 320,
              backgroundColor: "#191919",
            }}
          >
            <TouchableOpacity onPress={handlePause}>
              <FontAwesome6 name="pause" size={65} color="lightgrey" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleStart} disabled={isTracking}>
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
                width: screenWidth * 0.7,
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
              shadowColor: "#ffffff",
              elevation: 2,
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
              {endTime instanceof Date ? endTime.toLocaleString() : "- - - "}
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
                : "- - - "}
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
                  : "- - - "
                : "- - - "}
            </Text>
          </View>
        </CopilotWalkthroughView>
      </CopilotStep>
    </View>
  );
};
export default TimeTrackerCard;

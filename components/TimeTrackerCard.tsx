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
import { computeEarnings } from "./utils/earnings";
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
  try {
    if (!isFinite(seconds)) return "00:00:00";
    const totalSeconds = Math.floor(seconds);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const secs = Math.floor(totalSeconds % 60);

    if (showMs) {
      const ms = Math.floor((seconds % 1) * 100);
      return (
        [
          String(hours).padStart(2, "0"),
          String(minutes).padStart(2, "0"),
          String(secs).padStart(2, "0"),
        ].join(":") + `.${String(ms).padStart(2, "0")}`
      );
    }

    return [
      String(hours).padStart(2, "0"),
      String(minutes).padStart(2, "0"),
      String(secs).padStart(2, "0"),
    ].join(":");
  } catch (err) {
    console.error("formatTime failed:", err);
    return "00:00:00";
  }
}

const TimeTrackerCard: React.FC<TimeTrackingCardsProps> = () => {
  // initialize the routing
  const route = useRoute<TimeTrackerRouteProp>();
  const { projectId } = route.params;

  // screensize for dynamic size calculation
  const screenWidth = Dimensions.get("window").width;

  useEffect(() => {
    let prev = useStore.getState().projects[projectId];
    const unsub = useStore.subscribe((state) => {
      const p = state.projects[projectId];
      if (p !== prev) {
        // console.log(`[DBG_PROJ:${projectId}] project object changed`, {
        //   prev,
        //   next: p,
        //   stack: new Error().stack?.split("\n").slice(2, 6),
        // });
        prev = p;
      }
    });
    return unsub;
  }, [projectId]);

  // use the global state to fetch data from firestore
  const lastStartTime = useStore((s) => s.projects[projectId]?.lastStartTime);
  const endTime = useStore((s) => s.projects[projectId]?.endTime);
  const originalStartTime = useStore(
    (s) => s.projects[projectId]?.originalStartTime
  );

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
  const { stopTimer, updateTimer, resetAll, setAppState, setProjectData } =
    useStore();

  // refs for timer logic
  const animationRef = useRef<number | null>(null);
  const accumulatedTimeRef = useRef<number>(projectState?.timer || 0);

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
    hourlyRateRef.current = hourlyRate;
  }, [isTracking, hourlyRate]);

  // hook to fetch project data from firestore when navigate from home screen to details screen
  const fetchProjectData = useCallback(async () => {
    // console.log("Fetching project data started");
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
          isTracking: projectData.isTracking ?? false,
          originalStartTime: projectData.originalStartTime
            ? projectData.originalStartTime.toDate()
            : null,
          endTime: projectData.endTime ? projectData.endTime.toDate() : null,
          lastStartTime: projectData.lastStartTime
            ? projectData.lastStartTime.toDate()
            : null,
        };
        // console.log("Project data fetched successfully", formattedData);
        setProjectData(projectId, formattedData as ProjectState);
      } else {
        // console.error("No such document!");
        // console.warn("Project document does not exist");
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
  const timerFromStore = useStore((s) => s.projects[projectId]?.timer ?? 0);

  // hook to update the timer
  useEffect(() => {
    accumulatedTimeRef.current = timerFromStore;
    lastWholeSecondRef.current = Math.floor(timerFromStore);
    setDisplayTime(timerFromStore);
  }, [timerFromStore]);

  // function to start the animation
  const startAnimation = useCallback(() => {
    if (animationRef.current) return;

    let lastTimestamp: number | null = null;

    const update = (timestamp: number) => {
      if (!isTrackingRef.current) {
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

      // constantly update the timer and earnings - use atomic store-action
      updateTimeAndEarnings(newTime);

      animationRef.current = requestAnimationFrame(update);
    };

    animationRef.current = requestAnimationFrame(update);
  }, [projectId]);

  // function to constantly caclulate the timer and earnings
  const updateTimeAndEarnings = (newTime: number) => {
    const wholeSecond = Math.floor(newTime);

    if (wholeSecond !== lastWholeSecondRef.current) {
      const earnings = computeEarnings(wholeSecond, hourlyRateRef.current);
      useStore.getState().setTimerAndEarnings(projectId, wholeSecond, earnings);
      lastWholeSecondRef.current = wholeSecond;
    }

    setDisplayTime(newTime);
  };

  // function to handle app state changes if app is in background or foreground
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      try {
        // app comes to foreground
        if (
          appState.match(/(inactive|background)/) &&
          nextAppState === "active"
        ) {
          const bgKey = `bgTime_${projectId}`;
          const storedBgTime = await AsyncStorage.getItem(bgKey);

          if (storedBgTime && isTrackingRef.current) {
            const bgEnterTime = new Date(storedBgTime).getTime();
            const elapsedSeconds = (Date.now() - bgEnterTime) / 1000;
            const newAccum = accumulatedTimeRef.current + elapsedSeconds;
            const wholeNew = Math.floor(newAccum);
            const earnings = computeEarnings(wholeNew, hourlyRateRef.current);

            useStore
              .getState()
              .setTimerAndEarnings(projectId, wholeNew, earnings);

            accumulatedTimeRef.current = newAccum;
            lastWholeSecondRef.current = wholeNew;
            setDisplayTime(newAccum);

            await AsyncStorage.removeItem(bgKey);

            if (isTrackingRef.current && !animationRef.current) {
              startAnimation();
            }
          }
        }

        // app goes to background
        if (nextAppState.match(/inactive|background/)) {
          if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
            animationRef.current = null;
          }

          if (isTrackingRef.current) {
            await AsyncStorage.setItem(
              `bgTime_${projectId}`,
              new Date().toISOString()
            );
          }
        }
      } catch (err) {
        console.error(
          `[TimeTrackerCard:${projectId}] handleAppStateChange failed:`,
          err
        );
      } finally {
        setAppState(nextAppState);
      }
    };

    const subscription: any = AppState.addEventListener(
      "change",
      handleAppStateChange
    );

    return () => {
      if (!subscription) return;
      if (typeof subscription === "function") {
        subscription();
        return;
      }
      if (typeof subscription.remove === "function") {
        subscription.remove();
        return;
      }
      try {
        (subscription as any)();
      } catch (_) {}
    };
  }, [appState, projectId, setAppState, startAnimation]);

  // hook to restore the timer from AsyncStorage
  useEffect(() => {
    const initializeComponent = async () => {
      try {
        // load data from firestore
        await fetchProjectData();

        // persist data to AsyncStorage
        const [savedTime, isTrackingSaved] = await Promise.all([
          AsyncStorage.getItem(`persistedTimer_${projectId}`),
          AsyncStorage.getItem(`isTracking_${projectId}`),
        ]);

        if (savedTime) {
          const parsedTime = parseFloat(savedTime);
          accumulatedTimeRef.current = parsedTime;
          setDisplayTime(parsedTime);
          updateTimer(projectId, Math.floor(parsedTime));
        }

        if (isTrackingSaved === "true" && appState === "active") {
          startAnimation();
        }
      } catch (error) {
        console.error("Initialization error:", error);
      }
    };

    initializeComponent();

    // Cleanup: save state and cancel animation
    return () => {
      const saveState = async () => {
        await Promise.all([
          AsyncStorage.setItem(
            `persistedTimer_${projectId}`,
            accumulatedTimeRef.current.toString()
          ),
          AsyncStorage.setItem(
            `isTracking_${projectId}`,
            isTrackingRef.current.toString()
          ),
        ]);
      };

      saveState();

      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [projectId, appState]);

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
        // console.log("Project data updated in Firestore", convertedData);
      } catch (error) {
        console.error("Error updating project data:", error);
      }
    },
    [projectId]
  );

  // function to start the timer
  const handleStart = async () => {
    const currentlyTracking =
      useStore.getState().projects[projectId]?.isTracking;
    // check if currently tracking
    if (currentlyTracking || isTrackingRef.current) {
      console.log(`[TT:${projectId}] start skipped - already tracking`);
      return;
    }

    await useStore.getState().startTimer(projectId);
    isTrackingRef.current = true;
    startAnimation();

    // persist the start time
    try {
      await updateProjectData({
        startTime: new Date(),
        isTracking: true,
      } as Partial<ProjectState>);
    } catch (err) {
      console.error(
        `[TT:${projectId}] updateProjectData failed on start:`,
        err
      );
    }
  };

  // function to pause the timer
  const handlePause = async () => {
    if (isTrackingRef.current) {
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
    const project = useStore.getState().projects[projectId];
    // confirm reset
    if (project.isTracking) {
      // alert to inform the user what he has to do before pressing the reset button
      useAlertStore
        .getState()
        .showAlert(
          "Attention!",
          "Please stop the project first before resetting it.",
          [{ text: "OK", style: "default" }]
        );
      return;
    }
    // alert to ask the user if he really wants to reset the project
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
              {formattedTime || "00:00:00"}
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

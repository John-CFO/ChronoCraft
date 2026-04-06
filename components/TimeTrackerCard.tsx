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
import * as Animatable from "react-native-animatable";
import { doc, getDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { useRoute, RouteProp } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { CopilotStep, walkthroughable } from "react-native-copilot";

import { FIREBASE_FIRESTORE } from "../firebaseConfig";
import { computeEarnings } from "./utils/earnings";
import { useStore, ProjectState } from "./TimeTrackingState";
import { useService } from "../components/contexts/ServiceContext";
import { useAlertStore } from "../components/services/customAlert/alertStore";
import { useAccessibilityStore } from "../components/services/accessibility/accessibilityStore";
import { useValidatedStore } from "../validation/useValidatedStore";

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

  if (!route?.params?.projectId) {
    console.error("[TT] Missing projectId in route.params");
    return null;
  }

  const { projectId } = route.params;
  const { serviceId } = useService();

  if (!serviceId) {
    console.error(`[TT:${projectId}] Missing serviceId`);
  }

  // screensize for dynamic size calculation
  const screenWidth = Dimensions.get("window").width;

  // initialize the accessibility store
  const accessMode = useAccessibilityStore(
    (state) => state.accessibilityEnabled,
  );

  useEffect(() => {
    let prev = useStore.getState().projects[projectId];
    const unsub = useStore.subscribe((state) => {
      const p = state.projects[projectId];
      if (p !== prev) {
        prev = p;
      }
    });
    return unsub;
  }, [projectId]);

  // use the global state to fetch data from firestore
  const lastStartTime = useStore((s) => s.projects[projectId]?.lastStartTime);
  const endTime = useStore((s) => s.projects[projectId]?.endTime);
  const originalStartTime = useStore(
    (s) => s.projects[projectId]?.originalStartTime,
  );

  // project state(getProjectState is used to get the project UI state if app is started)
  const projectState = useStore.getState().getProjectState(projectId) || {
    timer: 0,
    isTracking: false,
    lastStartTime: null,
    originalStartTime: null,
    endTime: null,
    hourlyRate: 0,
    totalEarnings: 0,
    startTime: null,
  };

  // state from useStore to update the UI(Earnings and Progress)
  const isTracking = useStore((state) => state.projects[projectId]?.isTracking);
  const appState = useStore((state) => state.appState);
  const hourlyRate = useStore(
    (state) => state.projects[projectId]?.hourlyRate || 0,
  );

  const isRunning = isTracking;

  // validated + passthrough actions (AppSec-relevant actions via validated store)
  const {
    // heavy validations (IO paths)
    setProjectData,
    // light (hot-path) and heavy timer update functions
    setTimerAndEarnings, // heavy (Zod) — for IO/restore if needed
    setTimerAndEarningsLight, // light — use this in the 1×/s hot path
    // control actions with validation
    startTimer,
    stopTimer,
    // passthrough / non-appsec
    resetAll,
    setAppState,
  } = useValidatedStore();

  // refs for timer logic
  const animationRef = useRef<number | null>(null);
  const accumulatedTimeRef = useRef<number>(projectState?.timer || 0);

  // state only for the UI
  const [displayTime, setDisplayTime] = useState<number>(
    projectState?.timer || 0,
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
    console.log("Fetching project data started");
    const user = getAuth().currentUser;

    if (!user) {
      console.error(`[TT:${projectId}] AUTH NULL -> skip fetch`);
      return;
    }
    if (!serviceId) {
      console.error(`[TT:${projectId}] serviceId missing -> skip fetch`);
      return;
    }

    try {
      console.trace(`[TT:${projectId}] fetchProjectData CALL`);
      const docRef = doc(
        FIREBASE_FIRESTORE,
        "Users",
        user.uid,
        "Services",
        serviceId,
        "Projects",
        projectId,
      );
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const projectData = docSnap.data();
        const toDate = (v: any) => {
          if (!v) return null;
          if (typeof v.toDate === "function") return v.toDate();
          return v;
        };

        const formattedData = {
          id: projectId,
          uid: user.uid,

          projectName: projectData.name ?? "",
          name: projectData.name ?? "",

          isTracking: projectData.isTracking ?? false,
          isRestoring: false,

          hourlyRate: projectData.hourlyRate ?? 0,
          timer: projectData.timer ?? 0,
          elapsedTime: projectData.elapsedTime ?? projectData.timer ?? 0,
          totalEarnings: projectData.totalEarnings ?? 0,

          maxWorkHours: projectData.maxWorkHours ?? 0,
          startTimeTimestamp: projectData.startTime ?? null,

          startTime: toDate(projectData.startTime),
          endTime: toDate(projectData.endTime),
          originalStartTime: toDate(projectData.originalStartTime),
          lastStartTime: toDate(projectData.lastStartTime),
        };
        console.trace(
          `[TT:${projectId}] setProjectData BEFORE CALL`,
          formattedData,
        );

        console.log("ZOD INPUT DEBUG", {
          projectId,
          uid: formattedData.uid,
          projectDataUid: projectData.uid,
          storeUid: getAuth().currentUser?.uid,
        });

        console.log("VALIDATION PAYLOAD", {
          projectId,
          projectData: formattedData,
          uid: formattedData.uid,
        });

        try {
          // heavy validation (Zod) — Firestore → store
          setProjectData(projectId, formattedData as ProjectState);
        } catch (err) {
          console.error(`[TT:${projectId}] fetch crash`, err);
          console.trace();
        }
      } else {
        console.error(`[TT:${projectId}] Project data not found in Firestore`);
      }
    } catch (error) {
      console.error(`[TT:${projectId}] Firestore fetch failed:`, error);
    }
  }, [projectId, serviceId, setProjectData]);

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
      console.trace(`[TT:${projectId}] setTimerAndEarnings BEFORE`, {
        projectId,
        wholeSecond,
        earnings,
        typeofProjectId: typeof projectId,
        typeofWhole: typeof wholeSecond,
        typeofEarnings: typeof earnings,
      });
      try {
        // use the LIGHT version here (very cheap checks only)
        setTimerAndEarningsLight(projectId, wholeSecond, earnings);
      } catch (err) {
        console.error(`[TT:${projectId}] HOT PATH CRASH`, {
          err,
          projectId,
          wholeSecond,
          earnings,
          typeofProjectId: typeof projectId,
          typeofWhole: typeof wholeSecond,
          typeofEarnings: typeof earnings,
        });
        console.trace();
      }
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

          // inside handleAppStateChange when coming to foreground
          if (storedBgTime && isTrackingRef.current) {
            // parse ISO stored time safely
            const bgEnter = Date.parse(storedBgTime);
            if (!Number.isFinite(bgEnter)) {
              console.warn(
                `[TT:${projectId}] invalid bgTime in AsyncStorage:`,
                storedBgTime,
              );
              // clean up obviously bad value
              try {
                await AsyncStorage.removeItem(bgKey);
              } catch (_) {}
            } else {
              const elapsedSeconds = (Date.now() - bgEnter) / 1000;
              if (!Number.isFinite(elapsedSeconds) || elapsedSeconds < 0) {
                console.warn(
                  `[TT:${projectId}] computed invalid elapsedSeconds:`,
                  elapsedSeconds,
                );
                // do not apply resume when nonsense
              } else {
                const newAccum = accumulatedTimeRef.current + elapsedSeconds;
                const wholeNew = Math.floor(newAccum);

                // optional plausibility cap (example: 10 years in seconds)
                const MAX_SECONDS = 10 * 365 * 24 * 3600;
                if (wholeNew < 0 || wholeNew > MAX_SECONDS) {
                  console.warn(
                    `[TT:${projectId}] implausible resumed timer:`,
                    wholeNew,
                  );
                  // choose to clamp or ignore — here: ignore resume and keep previous values
                } else {
                  const earnings = computeEarnings(
                    wholeNew,
                    hourlyRateRef.current,
                  );
                  try {
                    // LIGHT validation + write — cheap checks only (hot-path)
                    setTimerAndEarningsLight(projectId, wholeNew, earnings);
                  } catch (err) {
                    console.error(
                      `[TT:${projectId}] bg resume setTimerAndEarningsLight failed:`,
                      err,
                    );
                  }

                  accumulatedTimeRef.current = newAccum;
                  lastWholeSecondRef.current = wholeNew;
                  setDisplayTime(newAccum);
                }
              }
            }

            // cleanup and restart animation if needed
            try {
              await AsyncStorage.removeItem(bgKey);
            } catch (_) {}
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
              new Date().toISOString(),
            );
          }
        }
      } catch (err) {
        console.error(
          `[TimeTrackerCard:${projectId}] handleAppStateChange failed:`,
          err,
        );
      } finally {
        setAppState(nextAppState);
      }
    };

    const subscription: any = AppState.addEventListener(
      "change",
      handleAppStateChange,
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
          const parsedTime = Number.parseFloat(savedTime);

          // basic sanity checks
          if (!Number.isFinite(parsedTime) || parsedTime < 0) {
            console.warn(
              `[TT:${projectId}] invalid persistedTimer value:`,
              savedTime,
            );
            // cleanup bad persisted value and fallback to 0
            try {
              await AsyncStorage.removeItem(`persistedTimer_${projectId}`);
            } catch (_) {}
            accumulatedTimeRef.current = 0;
            setDisplayTime(0);
          } else {
            // compute whole seconds + earnings
            const whole = Math.floor(parsedTime);

            // optional plausibility cap (example: 10 years in seconds)
            const MAX_SECONDS = 10 * 365 * 24 * 3600;
            if (whole < 0 || whole > MAX_SECONDS) {
              console.warn(
                `[TT:${projectId}] implausible persisted timer:`,
                whole,
              );
              try {
                await AsyncStorage.removeItem(`persistedTimer_${projectId}`);
              } catch (_) {}
              accumulatedTimeRef.current = 0;
              setDisplayTime(0);
            } else {
              const earnings = computeEarnings(whole, hourlyRateRef.current);
              try {
                // HEAVY validation once on restore — use Zod-backed method
                setTimerAndEarnings(projectId, whole, earnings);
                // apply local refs / UI after successful validation/write
                accumulatedTimeRef.current = parsedTime;
                setDisplayTime(parsedTime);
              } catch (err) {
                console.error(
                  `[TT:${projectId}] persisted timer failed heavy validation:`,
                  err,
                );
                // clear corrupted persisted value and fallback
                try {
                  await AsyncStorage.removeItem(`persistedTimer_${projectId}`);
                } catch (_) {}
                accumulatedTimeRef.current = 0;
                setDisplayTime(0);
              }
            }
          }
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
            String(accumulatedTimeRef.current ?? 0),
          ),
          AsyncStorage.setItem(
            `isTracking_${projectId}`,
            String(isTrackingRef.current ?? false),
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

  // function to start the timer
  const handleStart = async () => {
    console.trace(`[TT:${projectId}] START pressed`);

    const currentlyTracking =
      useStore.getState().projects?.[projectId]?.isTracking;

    if (!serviceId) {
      console.error(`[TT:${projectId}] Missing serviceId in handleStart`);
      return;
    }

    if (currentlyTracking || isTrackingRef.current) {
      console.log(`[TT:${projectId}] start skipped - already tracking`);
      return;
    }

    try {
      await startTimer(projectId, serviceId);

      isTrackingRef.current = true;
      startAnimation();
    } catch (err) {
      console.error(`[TT:${projectId}] start crash`, err);
      console.trace();
    }
  };

  // function to stop the timer
  const handleStop = async () => {
    console.trace(`[TT:${projectId}] STOP pressed`);

    if (!isTrackingRef.current) return;

    if (!serviceId) {
      console.error(`[TT:${projectId}] Missing serviceId in handleStop`);
      return;
    }

    try {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }

      await stopTimer(projectId, serviceId);
      isTrackingRef.current = false;
    } catch (err) {
      console.error(`[TT:${projectId}] stop crash`, err);
      console.trace();
    }
  };

  // function to reset the timer
  const [resetting, setResetting] = useState(false);
  const handleReset = async () => {
    console.trace(`[TT:${projectId}] RESET pressed`);
    const project = useStore.getState().projects[projectId];

    if (!serviceId) {
      console.error(`[TT:${projectId}] Missing serviceId in handleReset`);
      return;
    }
    if (!project) {
      console.error(`[TT:${projectId}] Missing project in handleReset`);
      return;
    }

    // confirm reset
    if (project.isTracking) {
      // alert to inform the user what he has to do before pressing the reset button
      useAlertStore
        .getState()
        .showAlert(
          "Attention!",
          "Please stop the project first before resetting it.",
          [{ text: "OK", style: "default" }],
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
              try {
                setResetting(true);
                await resetAll(projectId, serviceId);
                accumulatedTimeRef.current = 0;
                setDisplayTime(0);
                await AsyncStorage.removeItem(`persistedTimer_${projectId}`);
                await AsyncStorage.removeItem(`isTracking_${projectId}`);
                await AsyncStorage.removeItem(`timerState_${projectId}`);
              } catch (err) {
                console.error(`[TT:${projectId}] reset crash`, err);
                console.trace();
              } finally {
                setResetting(false);
              }
            },
          },
        ],
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
            height: 650,
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
            accessible={true}
            accessibilityRole="header"
            accessibilityLabel="Time-Tracker"
            style={{
              fontFamily: "MPLUSLatin_Bold",
              fontSize: accessMode ? 28 : 25,
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
              accessible={true}
              accessibilityLabel={`Tracking Time: ${formattedTime}`}
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
              marginTop: accessMode ? 25 : 30,
              width: screenWidth * 0.7,
              maxWidth: 320,
              backgroundColor: "#191919",
            }}
          >
            {/* Start Button | Stop Button */}
            <TouchableOpacity
              onPress={isRunning ? handleStop : handleStart}
              activeOpacity={0.8}
              style={{
                width: 140,
                height: 140,
                borderRadius: 70,
                justifyContent: "center",
                alignItems: "center",

                // dynamic background
                backgroundColor: isRunning ? "#3a0d0d" : "#003333",

                // visuel feedback
                borderWidth: 2,
                borderColor: isRunning ? "#ff4d4d" : "aqua",

                // depth
                shadowColor: isRunning ? "#ff4d4d" : "#00ffff",
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.6,
                shadowRadius: 10,
                elevation: 8,
              }}
            >
              {/* Inner Circle for depth */}
              <View
                style={{
                  width: 110,
                  height: 110,
                  borderRadius: 55,
                  justifyContent: "center",
                  alignItems: "center",
                  backgroundColor: "#111",
                }}
              >
                {isRunning ? (
                  <Animatable.View
                    animation="pulse"
                    iterationCount="infinite"
                    duration={1200}
                  >
                    <FontAwesome5 name="stop" size={70} color="#ff4d4d" />
                  </Animatable.View>
                ) : (
                  <Animatable.View
                    animation="pulse"
                    iterationCount="infinite"
                    duration={1200}
                  >
                    <FontAwesome5
                      name="play"
                      size={70}
                      color="aqua"
                      style={{ transform: [{ translateX: +6 }] }}
                    />
                  </Animatable.View>
                )}
              </View>
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
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={resetting ? "Resetting" : "Reset the project"}
              accessibilityHint="Press to reset the project"
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
                  height: 45,
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
            <View
              accessible={true}
              accessibilityLabel={
                endTime instanceof Date
                  ? `Last session ended on ${endTime.toLocaleString()}`
                  : `No last session available`
              }
            >
              <Text
                style={{
                  fontFamily: "MPLUSLatin_Bold",
                  fontSize: 16,
                  color: "white",
                  marginBottom: 5,
                }}
              >
                <Text style={{ color: accessMode ? "white" : "grey" }}>
                  Last Session:
                </Text>
                {"\n"}
                {endTime instanceof Date ? endTime.toLocaleString() : "- - - "}
              </Text>
            </View>

            {/* last tracking info */}
            <View
              accessible={true}
              accessibilityLabel={
                lastStartTime instanceof Date
                  ? `Last tracking started on ${lastStartTime.toLocaleString()}`
                  : `No tracking start time available`
              }
            >
              <Text
                style={{
                  fontFamily: "MPLUSLatin_Bold",
                  fontSize: 16,
                  color: "white",
                  marginBottom: 5,
                }}
              >
                <Text style={{ color: accessMode ? "white" : "grey" }}>
                  Last Tracking Started:
                </Text>
                {"\n"}
                {lastStartTime instanceof Date
                  ? lastStartTime.toLocaleString()
                  : "- - - "}
              </Text>
            </View>

            {/* original tracking info */}
            <View
              accessible={true}
              accessibilityLabel={
                originalStartTime instanceof Date
                  ? `Original tracking started on ${originalStartTime.toLocaleString()}`
                  : `No original tracking start time available`
              }
            >
              <Text
                style={{
                  fontFamily: "MPLUSLatin_Bold",
                  fontSize: 16,
                  color: "white",
                  marginBottom: 5,
                }}
              >
                <Text style={{ color: accessMode ? "white" : "grey" }}>
                  Original Tracking Started:
                </Text>
                {"\n"}
                {originalStartTime instanceof Date
                  ? originalStartTime.toLocaleString()
                  : "- - - "}
              </Text>
            </View>
          </View>
        </CopilotWalkthroughView>
      </CopilotStep>
    </View>
  );
};
export default TimeTrackerCard;

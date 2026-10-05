/////////////////////////////WorkTimeTracker Component////////////////////////////

// This component is used to track the user's work time and update the WorkHoursState
// The user has to add the expected hours for each day to Firestore
// With this data, the WorkTimeTracker can calculate the over hours and update the WorkHoursState
// Finally, the WorkTimeTracker can update the WorkHoursState and the WorkHoursChart in every chart view

//////////////////////////////////////////////////////////////////////////////////

import {
  View,
  Text,
  AppState,
  AppStateStatus,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { collection, setDoc, getDocs, getDoc, doc } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { CopilotStep, walkthroughable } from "react-native-copilot";
import { useTranslation } from "react-i18next";

import { FIREBASE_FIRESTORE } from "../firebaseConfig";
import { useService } from "../components/contexts/ServiceContext";
import dayjs from "../dayjsConfig";
import WorkHoursState from "../components/WorkHoursState";
import { formatTime } from "../components/WorkTimeCalc";
import WorkTimeAnimation from "../components/WorkTimeAnimation";
import { useAlertStore } from "./services/customAlert/alertStore";
import { useAccessibilityStore } from "../components/services/accessibility/accessibilityStore";
import { AsyncStorageWorkTrackerSchema } from "../validation/asyncStorageSchemas";
import { logError, logWarn } from "../lib/loggerClient";

///////////////////////////////////////////////////////////////////////////////////

interface DataPoint {
  day: string;
  expectedHours: number;
  overHours: number;
  workDay: string;
  elapsedTime: number;
}

///////////////////////////////////////////////////////////////////////////////////

// modified walkthroughable for copilot tour
const CopilotTouchableView = walkthroughable(View);

const WorkTimeTracker = () => {
  // useTranslation hook to access translations
  const { t } = useTranslation();

  // state to store the user's time zone
  const [userTimeZone, setUserTimeZone] = useState<string>(dayjs.tz.guess());

  // local state for accumulated duration (in hours)
  const [accumulatedDuration, setAccumulatedDuration] = useState(0);

  // new trigger to reload the chart after stop
  // it is needed because the chart is not updated after stop the timer without reload
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // state to handle the app state
  const [appState, setAppState] = useState(AppState.currentState);

  // reference to the previous app state
  const prevAppStateRef = useRef<AppStateStatus>(AppState.currentState);

  // state to get the work day from firestore to update the state wich is needed to enable the timer start button
  const [workDay, setWorkDay] = useState("");

  // initialize the accessibility store
  const accessMode = useAccessibilityStore(
    (state) => state.accessibilityEnabled,
  );

  // screensize for dynamic size calculation
  const screenWidth = Dimensions.get("window").width;

  // global WorkHoursState
  const {
    isWorking,
    startWorkTime,
    elapsedTime,
    expectedHours,
    currentDocId,
    setIsWorking,
    setExpectedHours,
    setStartWorkTime,
    setElapsedTime,
    setData,
    setCurrentDocId,
    docExists,
    loadState,
  } = WorkHoursState();

  // initialize firebase auth and get current user
  const auth = getAuth();
  const user = auth.currentUser;

  // declare serviceId
  const { serviceId } = useService();

  // hook to load state
  useEffect(() => {
    if (!serviceId) return;
    loadState(serviceId);
  }, [serviceId]);

  // track currentDocId for the persistent mechanism by tracking the current day
  const currentDocIdRef = useRef(currentDocId);
  useEffect(() => {
    currentDocIdRef.current = currentDocId;
  }, [currentDocId]);

  // useEffect to get the expected hours for today
  useEffect(() => {
    const getExpectedHoursForToday = async () => {
      if (!serviceId) {
        logError(
          "WorkTimeTracker.getExpectedHoursForToday",
          "No serviceId found",
        );
        return;
      }

      const userId = getAuth().currentUser?.uid;
      if (!userId) {
        logError(
          "WorkTimeTracker.getExpectedHoursForToday",
          "User ID not available",
        );
        return;
      }

      try {
        // 1) Check if a session is running.
        //    First the store (in case restoreState has already completed),
        //    otherwise directly AsyncStorage (restore might still be in progress).
        const storeState = WorkHoursState.getState();
        let running = storeState.isWorking;
        let runningDocId: string | null = storeState.currentDocId ?? null;

        if (!running) {
          const saved = await AsyncStorage.getItem("workTimeTrackerState");
          if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed?.isWorking && parsed?.currentDocId) {
              running = true;
              runningDocId = parsed.currentDocId;
            }
          }
        }

        // 2) Determine target day: Session day takes precedence over "today".
        const today = dayjs().format("YYYY-MM-DD");
        const targetDay = running && runningDocId ? runningDocId : today;

        setWorkDay(targetDay);

        const docRef = doc(
          FIREBASE_FIRESTORE,
          "Users",
          userId,
          "Services",
          serviceId,
          "WorkHours",
          targetDay,
        );
        const docSnapshot = await getDoc(docRef);

        if (docSnapshot.exists()) {
          setExpectedHours(docSnapshot.data().expectedHours?.toString() || "0");
        } else {
          setExpectedHours("0");
        }
        // 3) Set currentDocId to "today" only if NO session is active.
        //    If a session is active, the session tag remains set.
        setCurrentDocId(targetDay);
      } catch (error) {
        logError("WorkTimeTracker.getExpectedHoursForToday", error);
        useAlertStore
          .getState()
          .showAlert(
            t("workTimeTracker.error"),
            t("workTimeTracker.fetchDataError"),
          );
      }
    };
    getExpectedHoursForToday();
  }, []); // run only once when the component mounts

  // hook to update elapsed time
  useEffect(() => {
    if (!isWorking || !startWorkTime) {
      return;
    }

    const updateElapsedTime = () => {
      const now = Date.now();
      const currentSession = (now - startWorkTime.getTime()) / (1000 * 60 * 60);
      setElapsedTime(accumulatedDuration + currentSession); // Single source
    };

    updateElapsedTime(); // immediately Update by mount
    const interval = setInterval(updateElapsedTime, 1000); // floaty Update every second
    return () => clearInterval(interval);
  }, [isWorking, startWorkTime, accumulatedDuration]);

  // hook to update the app state if the app is in the foreground or background
  useEffect(() => {
    const loadElapsedTime = async () => {
      const storedElapsedTime = await AsyncStorage.getItem("elapsedTime");
      if (storedElapsedTime) {
        const parsed = JSON.parse(storedElapsedTime);
        const newValue = parsed > elapsedTime ? parsed : elapsedTime;
        // if the loaded value is higher than the current, update it
        setElapsedTime(newValue);
      }
    };
    loadElapsedTime();
  }, []); // add the saved time once when the component mounts

  // ref to store the timeout
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // hook to update the app state if the app is in the foreground or background using reference to the previous app state
  useEffect(() => {
    // flag to prevent multiple state changes when app goes from inactive to active
    let handledActive = false;

    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      // set the new app state
      setAppState(nextAppState);

      // condition to handle the state change if the app is in the foreground or background
      if (nextAppState === "background" || nextAppState === "inactive") {
        const nowISO = new Date().toISOString();
        // save the elapsed time and the last active time to AsyncStorage
        await AsyncStorage.multiSet([
          ["elapsedTime", JSON.stringify(elapsedTime)],
          ["lastActiveTime", nowISO],
        ]);
      }
      // if the app returns to "active" from a state that was not "active"
      // and the timer is running (isWorking === true), calculate the elapsed time
      if (
        prevAppStateRef.current !== "active" &&
        nextAppState === "active" &&
        isWorking
      ) {
        // prevent multiple state changes when app goes from inactive to active
        if (handledActive) {
          return;
        }
        handledActive = true;
        // load the elapsed time and last active time from AsyncStorage
        const lastTime = await AsyncStorage.getItem("lastActiveTime");
        const storedElapsedTime = await AsyncStorage.getItem("elapsedTime");

        if (lastTime && storedElapsedTime) {
          const savedElapsedTime = JSON.parse(storedElapsedTime);
          // calculate the elapsed time since the last active time (in hours)
          const elapsedMs = Date.now() - new Date(lastTime).getTime();
          const elapsedHours = elapsedMs / (1000 * 60 * 60);

          // update the elapsed time
          const newElapsed = savedElapsedTime + elapsedHours;

          // update only with newValue if the new elapsed time is greater than the current
          const newValue = newElapsed > elapsedTime ? newElapsed : elapsedTime;
          setElapsedTime(newValue);
          setAccumulatedDuration((prev) =>
            newElapsed > prev ? newElapsed : prev,
          );
          // set the workflow starttime new
          setStartWorkTime(new Date());
        }
        // set the app state to active after 1 second
        timeoutRef.current = setTimeout(() => {
          handledActive = false;
        }, 1000);
      }
      // save the previous app state for the next iteration
      prevAppStateRef.current = nextAppState;
    };
    // subscribe to app state changes
    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange,
    );
    // clear the event listener when the component unmounts
    return () => {
      subscription.remove();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [elapsedTime, isWorking]);

  // function to start work
  const handleStartWork = async () => {
    if (!serviceId) return;
    const userId = getAuth().currentUser?.uid;
    if (!userId) {
      logError("WorkTimeTracker.handleStartWork", "User ID not available");
      return;
    }
    try {
      const workDay = dayjs().tz(userTimeZone).format("YYYY-MM-DD");
      setCurrentDocId(workDay);

      const workRef = doc(
        FIREBASE_FIRESTORE,
        "Users",
        userId,
        "Services",
        serviceId,
        "WorkHours",
        workDay,
      );

      const docSnap = await getDoc(workRef);

      if (docSnap.exists()) {
        const validatedDoc = docSnap.data();
        const expectedHoursFromFirestore = validatedDoc.expectedHours;
        const prevDuration = validatedDoc.duration || 0;

        setAccumulatedDuration(prevDuration);
        // Synchronize the store with the doc value so that handleStopWork
        // uses the correct expectedHours value for overHours.
        setExpectedHours(String(expectedHoursFromFirestore ?? "0"));
        const newStartTime = new Date();

        const dataToWrite = {
          startTime: newStartTime.toISOString(),
          expectedHours: expectedHoursFromFirestore,
          workDay,
          userId,
        };

        await setDoc(workRef, dataToWrite, { merge: true });
        setStartWorkTime(newStartTime);
        setIsWorking(true);
      } else {
        useAlertStore
          .getState()
          .showAlert(
            t("workTimeTracker.attention"),
            t("workTimeTracker.expectedHoursRequired"),
          );
      }
    } catch (error) {
      logError("WorkTimeTracker.handleStartWork", error);
      useAlertStore
        .getState()
        .showAlert(
          t("workTimeTracker.error"),
          t("workTimeTracker.startTrackingError"),
        );
    }
  };

  // function to stop work
  const handleStopWork = async () => {
    if (!serviceId) {
      logError("WorkTimeTracker.handleStopWork", "Service ID not available");
      return;
    }
    const currentStartTime = startWorkTime;
    const currentAccumulated = accumulatedDuration;
    const currentDoc = currentDocId;

    if (!currentStartTime || !currentDoc) {
      logError("WorkTimeTracker.handleStopWork", "No start time or doc found");
      return;
    }

    setIsWorking(false);

    try {
      const endTime = new Date();
      let sessionHours =
        (endTime.getTime() - currentStartTime.getTime()) / (1000 * 60 * 60);
      if (sessionHours < 0 || sessionHours > 24) sessionHours = 0;

      const totalHours = currentAccumulated + sessionHours;
      // Round to the nearest second, not to 0.01 h (=36 s).
      // toFixed(2) loses up to 18 s per session, which accumulate.
      const roundedDuration = Math.round(totalHours * 3600) / 3600;
      if (roundedDuration < 0 || roundedDuration > 24 * 365) return;

      const userId = getAuth().currentUser?.uid;
      if (userId) {
        const docIdToUse = currentDocId || dayjs().format("YYYY-MM-DD");
        const workRef = doc(
          FIREBASE_FIRESTORE,
          "Users",
          userId,
          "Services",
          serviceId,
          "WorkHours",
          docIdToUse,
        );

        const dataToWrite = {
          endTime: endTime.toISOString(),
          duration: roundedDuration,
          elapsedTime: roundedDuration,
          overHours: Math.max(
            roundedDuration - parseFloat(expectedHours || "0"),
            0,
          ),
          userId,
          workDay: docIdToUse,
        };

        await setDoc(workRef, dataToWrite, { merge: true });
        setCurrentDocId(docIdToUse);
      }

      // Synchronize the ref immediately so that a concurrently running
      // saveState call does not set isWorking:true.
      isWorkingRef.current = false;
      startWorkTimeRef.current = null;

      // Session ended: Set isWorking to false in AsyncStorage.
      // The entry is NOT deleted so that no data is lost if the app
      // is accidentally killed during an active session.
      // Only the stop path toggles the flag; killing the app without stopping leaves it set to true.
      await AsyncStorage.setItem(
        "workTimeTrackerState",
        JSON.stringify({
          isWorking: false,
          startWorkTime: null,
          elapsedTime: roundedDuration,
          accumulatedDuration: roundedDuration,
          currentDocId: currentDocId || dayjs().format("YYYY-MM-DD"),
        }),
      );

      setAccumulatedDuration(roundedDuration);
      setElapsedTime(roundedDuration);
      setStartWorkTime(null);
      setRefreshTrigger((prev) => prev + 1);
      loadState(serviceId);
    } catch (error) {
      logError("WorkTimeTracker.handleStopWork", error);
      useAlertStore
        .getState()
        .showAlert(
          t("workTimeTracker.error"),
          t("workTimeTracker.stopTrackingError"),
        );
    }
  };

  // function to get the chart data from firestore
  const fetchChartData = async () => {
    if (!serviceId || !user) {
      return;
    }

    try {
      const snapshot = await getDocs(
        collection(
          FIREBASE_FIRESTORE,
          "Users",
          user.uid,
          "Services",
          serviceId,
          "WorkHours",
        ),
      );

      return snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          day: data.workDay || "",
          expectedHours: data.expectedHours || 0,
          overHours: data.overHours || 0,
          elapsedTime: data.duration || 0,
        };
      });
    } catch (error) {
      logError("WorkTimeTracker.fetchChartData", error);
      return [];
    }
  };

  // hook to update the chart data in the UI
  useEffect(() => {
    const fetchData = async () => {
      const newData = await fetchChartData();
      setData(newData ?? []);
    };
    fetchData();
  }, [user, currentDocId, refreshTrigger, serviceId]);

  // function to get the list data from firestore
  useEffect(() => {
    const fetchListData = async () => {
      if (!serviceId || !user) {
        return;
      }

      try {
        const snapshot = await getDocs(
          collection(
            FIREBASE_FIRESTORE,
            "Users",
            user.uid,
            "Services",
            serviceId,
            "WorkHours",
          ),
        );

        const formattedData = snapshot.docs
          .map((doc) => {
            const item = doc.data();
            if (!item.workDay || isNaN(new Date(item.workDay).getTime())) {
              logWarn("WorkTimeTracker.fetchListData", "Invalid work day");
              return null;
            }
            return {
              day: new Date(item.workDay).toISOString().split("T")[0],
              workDay: new Date(item.workDay).toISOString().split("T")[0],
              expectedHours: item.expectedHours || 0,
              overHours: item.overHours || 0,
              elapsedTime: item.duration || 0,
            };
          })
          .filter((item): item is DataPoint => item !== null);

        setData(formattedData);
      } catch (error) {
        logError("WorkTimeTracker.fetchListData", error);
      }
    };

    fetchListData();
  }, [user, currentDocId, refreshTrigger, serviceId]);

  // hook to update the local accumulated duration
  useEffect(() => {
    setAccumulatedDuration(elapsedTime);
  }, []); // once when the component mounts

  // Refs for realtime updates
  const accumulatedDurationRef = useRef(accumulatedDuration);
  const isWorkingRef = useRef(isWorking);
  const startWorkTimeRef = useRef(startWorkTime);
  const elapsedTimeRef = useRef(elapsedTime);

  // hook to hold refs stable for the saveState-Callback
  useEffect(() => {
    elapsedTimeRef.current = elapsedTime;
    accumulatedDurationRef.current = accumulatedDuration;
    isWorkingRef.current = isWorking;
    startWorkTimeRef.current = startWorkTime;
  }, [elapsedTime, accumulatedDuration, isWorking, startWorkTime]);

  // initialize saveIntervalRef
  const saveIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // function to save the state in AsyncStorage
  const saveState = useCallback(async () => {
    const state = {
      isWorking: isWorkingRef.current,
      startWorkTime: startWorkTimeRef.current?.toISOString() ?? null,
      elapsedTime: elapsedTimeRef.current,
      accumulatedDuration: accumulatedDurationRef.current,
      currentDocId: currentDocIdRef.current ?? null,
    };
    await AsyncStorage.setItem("workTimeTrackerState", JSON.stringify(state));
  }, []);

  // hook to set the save interval every 30 seconds
  useEffect(() => {
    if (isWorking) {
      saveIntervalRef.current = setInterval(() => {
        // save the state every 30 seconds
        saveState();
      }, 15000);
    }

    return () => {
      if (saveIntervalRef.current) {
        clearInterval(saveIntervalRef.current);
      }
    };
  }, [isWorking]);

  // hook to restore the state from AsyncStorage by mounting
  useEffect(() => {
    const restoreState = async () => {
      try {
        if (!serviceId) {
          logError("WorkTimeTracker.restoreState", "No serviceId found");
          return;
        }
        const saved = await AsyncStorage.getItem("workTimeTrackerState");
        if (!saved) {
          logWarn("WorkTimeTracker.restoreState", "No saved state found");
          return;
        }
        const parsed = JSON.parse(saved);

        // AsyncStorage Schema validation
        const validation = AsyncStorageWorkTrackerSchema.safeParse(parsed);
        if (!validation.success) {
          logError("WorkTimeTracker.restoreState", validation.error);
          await AsyncStorage.removeItem("workTimeTrackerState");
          return;
        }

        const validatedData = validation.data;

        // 1) Always restore the base state — regardless of
        //    whether the session doc still exists.
        setAccumulatedDuration(validatedData.accumulatedDuration || 0);
        setElapsedTime(validatedData.elapsedTime || 0);

        if (validatedData.isWorking && validatedData.startWorkTime) {
          const userId = getAuth().currentUser?.uid;
          if (!userId) {
            logError("WorkTimeTracker.restoreState", "No userId found");
            return;
          }

          // 2) The session date takes precedence over "today".
          //    The session date is read from the stored currentDocId,
          //    not from the current calendar day.
          const docIdToCheck =
            validatedData.currentDocId || dayjs().format("YYYY-MM-DD");

          const workRef = doc(
            FIREBASE_FIRESTORE,
            "Users",
            userId,
            "Services",
            serviceId,
            "WorkHours",
            docIdToCheck,
          );
          const docSnap = await getDoc(workRef);
          const data = docSnap.exists() ? docSnap.data() : null;

          // 3) If the doc is missing, do NOT delete the saved state
          //    and do NOT abort. The session continues; the tracker
          //    knows via currentDocId where to write upon stopping.
          //    Only the target time is unknown in this case -> fallback to "0".
          if (!data) {
            logWarn(
              "WorkTimeTracker.restoreState",
              "Session doc not found — restoring without expectedHours",
            );
            setExpectedHours("0");
          } else {
            // 4) Restore expectedHours from the session doc.
            if (data.expectedHours !== undefined) {
              setExpectedHours(String(data.expectedHours));
            }
          }

          // 5) startWorkTime is set to "now" so that the active
          //    timer interval continues counting correctly. The original
          //    start time is contained in validatedData.startWorkTime
          //    and was already used above to calculate elapsedSince.
          const startTime = new Date(validatedData.startWorkTime);
          const now = new Date();
          const elapsedSince =
            (now.getTime() - startTime.getTime()) / (1000 * 60 * 60);
          const newAccumulated =
            (validatedData.accumulatedDuration || 0) + elapsedSince;

          setAccumulatedDuration(newAccumulated);
          setElapsedTime(newAccumulated);
          setStartWorkTime(new Date());
          setIsWorking(true);
          setCurrentDocId(docIdToCheck);
        }
      } catch (err) {
        logError("WorkTimeTracker.restoreState", err);
      }
    };

    restoreState();
  }, []); // run once on mount

  // hook to save the state when the component unmounts
  useEffect(() => {
    return () => {
      saveState();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      {/* Worktime-Tracker Screen copilot tour step 2 */}
      <CopilotStep
        name="Work-Time Tracker"
        order={2}
        text={t("workTimeTracker.copilot.text")}
      >
        <CopilotTouchableView
          accessible={true}
          accessibilityLabel={t("workTimeTracker.accessibility.tracker")}
          accessibilityHint={t("workTimeTracker.accessibility.trackerHint")}
          style={{
            width: screenWidth * 0.9, // use 90% of the screen width
            maxWidth: 600,
            alignItems: "center",
            backgroundColor: "#191919",
            borderRadius: 12,
            padding: 20,
            shadowColor: "#000",
            shadowOpacity: 0.2,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 4 },
            elevation: 4,
            borderWidth: 1,
            borderColor: "aqua",
            marginBottom: 20,
          }}
        >
          <Text
            accessible={true}
            accessibilityRole="header"
            accessibilityLabel={t("workTimeTracker.accessibility.tracker")}
            style={{
              fontFamily: "MPLUSLatin_Bold",
              fontSize: 25,
              color: "white",
              marginBottom: 60,
              textAlign: "center",
            }}
          >
            {t("workTimeTracker.title")}
          </Text>
          {/* Start/Stop Button with  enable condition when user adds a expected hours */}
          {!isWorking ? (
            <TouchableOpacity
              accessible={true}
              accessibilityRole="button"
              accessibilityState={{ disabled: !docExists }}
              accessibilityLabel={t(
                "workTimeTracker.accessibility.startWorking",
              )}
              accessibilityHint={
                docExists
                  ? t("workTimeTracker.accessibility.startWorkingHint")
                  : t("workTimeTracker.accessibility.expectedHoursRequired")
              }
              onPress={docExists ? handleStartWork : undefined}
              disabled={!docExists}
              activeOpacity={0.7}
              style={{
                width: screenWidth * 0.7, // use 70% of the screen width
                maxWidth: 400,
                borderRadius: 12,
                overflow: "hidden",
                borderWidth: 2,
                borderColor: accessMode
                  ? docExists
                    ? "aqua"
                    : "#999"
                  : "aqua",

                marginBottom: 25,
                opacity: accessMode ? 1 : docExists ? 1 : 0.5,
              }}
            >
              <LinearGradient
                colors={
                  docExists
                    ? ["#00f7f7", "#005757"]
                    : accessMode
                      ? ["#888", "#3b626bff"]
                      : ["#53b2c7ff", "#aaa"]
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  height: 45,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    fontFamily: "MPLUSLatin_Bold",
                    fontSize: 22,
                    textAlign: "center",
                    transform: [{ translateY: -3 }],
                    color: docExists ? "white" : accessMode ? "#222" : "#AAA",
                  }}
                >
                  {t("workTimeTracker.buttons.start")}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              accessible={true}
              accessibilityRole="button"
              accessibilityState={{ disabled: !docExists }}
              accessibilityLabel={t(
                "workTimeTracker.accessibility.stopWorking",
              )}
              accessibilityHint={
                docExists
                  ? t("workTimeTracker.accessibility.stopWorkingHint")
                  : t(
                      "workTimeTracker.accessibility.expectedWorkingHoursRequired",
                    )
              }
              onPress={handleStopWork}
              activeOpacity={0.7}
              style={{
                width: screenWidth * 0.7,
                maxWidth: 400,
                borderRadius: 12,
                borderWidth: 2,
                borderColor: "aqua",
                backgroundColor: "transparent",
                shadowColor: "black",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.3,
                shadowRadius: 3,
                elevation: 5,
                marginBottom: 25,
                opacity: 1,
                overflow: "hidden",
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
                    color: "white",
                    textAlign: "center",
                    transform: [{ translateY: -3 }],
                  }}
                >
                  {t("workTimeTracker.buttons.stop")}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
          {/* Tracking Animation */}
          <View accessible={false} style={{ position: "relative", height: 20 }}>
            {isWorking && <WorkTimeAnimation />}
          </View>
          {/* Tracking Time */}
          <Text
            accessible={true}
            accessibilityLabel={t(
              "workTimeTracker.accessibility.elapsedWorkTime",
              {
                time: formatTime(elapsedTime),
              },
            )}
            style={{
              fontWeight: "bold",
              fontSize: 55,
              color: isWorking ? "white" : "#AAA",
              marginBottom: 5,
              textAlign: "center",
            }}
          >
            {formatTime(elapsedTime)}
          </Text>
        </CopilotTouchableView>
      </CopilotStep>
    </>
  );
};

export default WorkTimeTracker;

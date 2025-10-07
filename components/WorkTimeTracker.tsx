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

import { FIREBASE_FIRESTORE } from "../firebaseConfig";
import dayjs from "../dayjsConfig";
import WorkHoursState from "../components/WorkHoursState";
import { formatTime } from "../components/WorkTimeCalc";
import WorkTimeAnimation from "../components/WorkTimeAnimation";
import { useAlertStore } from "./services/customAlert/alertStore";
import { useAccessibilityStore } from "../components/services/accessibility/accessibilityStore";
import { FirestoreWorkHoursSchema } from "../validation/firestoreSchemas";
import { AsyncStorageWorkTrackerSchema } from "../validation/asyncStorageSchemas";
import {
  getValidatedDoc,
  getValidatedDocsFromSnapshot,
} from "../validation/getDocsWrapper";

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
    (state) => state.accessibilityEnabled
  );
  // console.log("accessMode in LoginScreen:", accessMode);

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

  // hook to load state
  useEffect(() => {
    loadState();
  }, []);

  // track currentDocId for the persistent mechanism by tracking the current day
  const currentDocIdRef = useRef(currentDocId);
  useEffect(() => {
    currentDocIdRef.current = currentDocId;
  }, [currentDocId]);

  // useEffect to get the expected hours for today
  useEffect(() => {
    const getExpectedHoursForToday = async () => {
      const userId = getAuth().currentUser?.uid;
      if (!userId) return;
      const today = dayjs().format("YYYY-MM-DD"); // current day
      setWorkDay(today);
      try {
        const docRef = doc(
          FIREBASE_FIRESTORE,
          "Users",
          userId,
          "Services",
          "AczkjyWoOxdPAIRVxjy3",
          "WorkHours",
          today
        );
        const docSnapshot = await getDoc(docRef);
        if (docSnapshot.exists()) {
          // document for today exists: set expected hours
          setExpectedHours(docSnapshot.data().expectedHours?.toString() || "0");
        } else {
          // no document for today: set expected hours to 0
          setExpectedHours("0");
        }
        // set current doc id to the current day
        setCurrentDocId(today);
      } catch (error) {
        console.error("Error fetching expected hours:", error);
        useAlertStore
          .getState()
          .showAlert(
            "Error",
            "An error occurred while fetching the data. Please try again."
          );
      }
    };
    getExpectedHoursForToday();
  }, []); // run only once when the component mounts

  // hook to update elapsed time
  useEffect(() => {
    if (!isWorking || !startWorkTime) return;

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
        // console.log(` Save elapsedTime: ${elapsedTime}, Time: ${nowISO}`);
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
          // console.log(" Second active state change ignored.");
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
          // console.log(`App was inactive for ${elapsedHours.toFixed(2)} Hours.`);
          // update the elapsed time
          const newElapsed = savedElapsedTime + elapsedHours;
          // console.log(
          //   ` Calculate new time: ${savedElapsedTime} + ${elapsedHours.toFixed(2)} = ${newElapsed.toFixed(2)}`
          // );
          // update only with newValue if the new elapsed time is greater than the current
          const newValue = newElapsed > elapsedTime ? newElapsed : elapsedTime;
          setElapsedTime(newValue);
          setAccumulatedDuration((prev) =>
            newElapsed > prev ? newElapsed : prev
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
      handleAppStateChange
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
    const userId = getAuth().currentUser?.uid;
    if (!userId) {
      console.error("User ID not available.");
      return;
    }
    // get the current work day
    try {
      const workDay = dayjs().tz(userTimeZone).format("YYYY-MM-DD");
      setCurrentDocId(workDay);

      const workRef = doc(
        FIREBASE_FIRESTORE,
        "Users",
        userId,
        "Services",
        "AczkjyWoOxdPAIRVxjy3",
        "WorkHours",
        workDay
      );
      const validatedDoc = await getValidatedDoc(
        workRef,
        FirestoreWorkHoursSchema
      );

      if (validatedDoc) {
        const expectedHoursFromFirestore = validatedDoc.expectedHours;
        // current accumulated duration (if exists)
        const prevDuration = validatedDoc.duration || 0;

        setAccumulatedDuration(prevDuration);
        // set new start time, so that already tracked time is considered
        const newStartTime = new Date();

        // validate the new start time before writing
        const dataToWrite = {
          startTime: newStartTime.toISOString(),
          expectedHours: expectedHoursFromFirestore,
          workDay,
          userId,
        };
        const writeValidation = FirestoreWorkHoursSchema.safeParse(dataToWrite);
        if (!writeValidation.success) {
          console.error("Invalid data to write:", writeValidation.error);
          return;
        }

        await setDoc(workRef, writeValidation.data, { merge: true });
        setStartWorkTime(newStartTime);
        setIsWorking(true);
      } else {
        useAlertStore
          .getState()
          .showAlert("Attention", "First add your expected hours.");
      }
    } catch (error) {
      console.error("WorkTracker: Start operation failed");
      useAlertStore.getState().showAlert("Error", "Failed to start tracking");
    }
  };

  // function to stop work
  const handleStopWork = async () => {
    // stop the timer
    setIsWorking(false);

    const currentStartTime = startWorkTime;
    const currentAccumulated = accumulatedDuration;
    const currentDoc = currentDocId;

    if (!currentStartTime || !currentDoc) {
      console.error("WorkTracker: Missing data for stop operation");
      return;
    }

    // catch the end time
    // calculate the duration of the current session
    try {
      const endTime = new Date();
      let sessionHours =
        (endTime.getTime() - currentStartTime.getTime()) / (1000 * 60 * 60);
      // basic sanity clamp
      if (sessionHours < 0 || sessionHours > 24) {
        console.error("Invalid session hours calculated:", sessionHours);
        sessionHours = 0; // or handle if needed
      }

      const totalHours = currentAccumulated + sessionHours;
      const roundedDuration = parseFloat(totalHours.toFixed(2));

      // validate the final duration
      if (roundedDuration < 0 || roundedDuration > 24 * 365) {
        console.error("Invalid total duration:", roundedDuration);
        return;
      }

      // update firestore with new data (use setDoc merge so it works when doc missing)
      const userId = getAuth().currentUser?.uid;
      if (userId) {
        const docIdToUse = currentDocId || dayjs().format("YYYY-MM-DD");
        const workRef = doc(
          FIREBASE_FIRESTORE,
          "Users",
          userId,
          "Services",
          "AczkjyWoOxdPAIRVxjy3",
          "WorkHours",
          docIdToUse
        );

        // validate the data before writing
        const dataToWrite = {
          endTime: endTime.toISOString(),
          duration: roundedDuration,
          elapsedTime: roundedDuration,
          overHours: Math.max(
            roundedDuration - parseFloat(expectedHours || "0"),
            0
          ),
          userId,
          workDay: docIdToUse,
        };

        const validation = FirestoreWorkHoursSchema.safeParse(dataToWrite);
        if (!validation.success) {
          console.error("Invalid Firestore data:", validation.error);
          return;
        }

        await setDoc(workRef, validation.data, { merge: true });
        // ensure local state reflects docId used
        setCurrentDocId(docIdToUse);
      }

      // update local state after firestore update
      setAccumulatedDuration(roundedDuration);
      setElapsedTime(roundedDuration);
      setStartWorkTime(null);

      // update UI
      setRefreshTrigger((prev) => prev + 1);
      loadState();
    } catch (error) {
      console.error("Error in handleStopWork");
      useAlertStore.getState().showAlert("Error", "Failed to stop tracking");
    }
  };

  // function to get the chart data from firestore
  const fetchChartData = async () => {
    if (!user) return [];

    try {
      const snapshot = await getDocs(
        collection(
          FIREBASE_FIRESTORE,
          "Users",
          user.uid,
          "Services",
          "AczkjyWoOxdPAIRVxjy3",
          "WorkHours"
        )
      );

      // validate the data with zod before returning
      const validatedData = getValidatedDocsFromSnapshot(
        snapshot,
        FirestoreWorkHoursSchema
      );

      return validatedData.map((item) => ({
        day: item.workDay || "",
        expectedHours: item.expectedHours || 0,
        overHours: item.overHours || 0,
        elapsedTime: item.duration || 0,
      }));
    } catch (error) {
      console.error("Error fetching chart data");
      return [];
    }
  };

  // hook to update the chart data in the UI
  useEffect(() => {
    const fetchData = async () => {
      const newData = await fetchChartData();
      setData(newData);
    };
    fetchData();
  }, [user, currentDocId, refreshTrigger]);

  // function to get the list data from firestore
  useEffect(() => {
    const fetchListData = async () => {
      if (!user) return;

      try {
        // snapshot of firestore data
        const snapshot = await getDocs(
          collection(
            FIREBASE_FIRESTORE,
            "Users",
            user.uid,
            "Services",
            "AczkjyWoOxdPAIRVxjy3",
            "WorkHours"
          )
        );

        // validate the data with zod
        const validatedData = getValidatedDocsFromSnapshot(
          snapshot,
          FirestoreWorkHoursSchema
        );

        // condition to check if the snapshot is empty
        if (snapshot.empty) {
          return;
        }

        const formattedData = validatedData
          // map the data to the expected format
          .map((item) => {
            // additionaly validate the data for next day
            if (!item.workDay || isNaN(new Date(item.workDay).getTime())) {
              console.warn("Invalid workDay in item:", item);
              return null;
            }

            // return the validated data as expected
            return {
              day: new Date(item.workDay).toISOString().split("T")[0],
              workDay: new Date(item.workDay).toISOString().split("T")[0],
              expectedHours: item.expectedHours || 0,
              overHours: item.overHours || 0,
              elapsedTime: item.duration || 0, // add elapsedTime from Firestore
            };
          })
          // filter out null values
          .filter((item): item is DataPoint => item !== null);

        setData(formattedData);
      } catch (error) {
        console.error("Error fetching list data");
      }
    };

    fetchListData();
  }, [user, currentDocId, refreshTrigger]);

  // hook to update the local accumulated duration
  useEffect(() => {
    // console.log("updating accumulated duration");
    setAccumulatedDuration(elapsedTime);
  }, []); // once when the component mounts

  // Refs for realtime updates
  const accumulatedDurationRef = useRef(accumulatedDuration);
  const isWorkingRef = useRef(isWorking);
  const startWorkTimeRef = useRef(startWorkTime);

  // hook to updates refs if state changes
  useEffect(() => {
    // console.log("updating refs");
    accumulatedDurationRef.current = accumulatedDuration;
  }, [accumulatedDuration]);

  // hook to update isWorkingRef
  useEffect(() => {
    // console.log("updating isWorkingRef");
    isWorkingRef.current = isWorking;
  }, [isWorking]);

  // hook to update startWorkTimeRef
  useEffect(() => {
    // console.log("updating startWorkTimeRef");
    startWorkTimeRef.current = startWorkTime;
  }, [startWorkTime]);

  // initialize saveIntervalRef
  const saveIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // function to save the state in AsyncStorage
  const saveState = useCallback(async () => {
    const state = {
      isWorking: isWorkingRef.current,
      startWorkTime: startWorkTimeRef.current?.toISOString() ?? null,
      elapsedTime,
      accumulatedDuration: accumulatedDurationRef.current,
      currentDocId: currentDocIdRef.current ?? null,
    };
    await AsyncStorage.setItem("workTimeTrackerState", JSON.stringify(state));
  }, [elapsedTime]);

  // hook to set the save interval every 30 seconds
  useEffect(() => {
    if (isWorking) {
      saveIntervalRef.current = setInterval(() => {
        // console.log("[INTERVAL] Auto-save triggered");
        saveState();
      }, 15000);
    }

    return () => {
      if (saveIntervalRef.current) {
        clearInterval(saveIntervalRef.current);
      }
    };
  }, [isWorking, saveState]);

  // hook to restore the state from AsyncStorage by mounting
  useEffect(() => {
    const restoreState = async () => {
      try {
        const saved = await AsyncStorage.getItem("workTimeTrackerState");
        if (!saved) return;
        const parsed = JSON.parse(saved);

        //validate the data with zod from AsyncStorage
        const validation = AsyncStorageWorkTrackerSchema.safeParse(parsed);
        if (!validation.success) {
          console.error("Invalid AsyncStorage data:", validation.error);
          await AsyncStorage.removeItem("workTimeTrackerState");
          return;
        }
        const validatedData = validation.data;

        // restore basic data
        setAccumulatedDuration(validatedData.accumulatedDuration || 0);
        setElapsedTime(validatedData.elapsedTime || 0);

        // continue only if the data is valid
        // only resume if previously marked as running AND startTime available
        if (validatedData.isWorking && validatedData.startWorkTime) {
          const userId = getAuth().currentUser?.uid;
          if (!userId) return; // no logged user -> no resume

          const docIdToCheck =
            validatedData.currentDocId || dayjs().format("YYYY-MM-DD");
          const workRef = doc(
            FIREBASE_FIRESTORE,
            "Users",
            userId,
            "Services",
            "AczkjyWoOxdPAIRVxjy3",
            "WorkHours",
            docIdToCheck
          );
          const snap = await getValidatedDoc(workRef, FirestoreWorkHoursSchema);

          if (!snap) {
            // inconsistent saved session -> not auto-resume
            console.warn(
              "Saved running session exists but no firestore doc -> not auto-resuming."
            );
            await AsyncStorage.removeItem("workTimeTrackerState");
            return;
          }

          // safe resume
          const startTime = new Date(validatedData.startWorkTime);
          const now = new Date();
          const elapsedSince =
            (now.getTime() - startTime.getTime()) / (1000 * 60 * 60);
          const newAccumulated =
            (validatedData.accumulatedDuration || 0) + elapsedSince;

          setAccumulatedDuration(newAccumulated);
          setElapsedTime(newAccumulated);
          setStartWorkTime(new Date()); // set new startpoint to resume
          setIsWorking(true);
          setCurrentDocId(docIdToCheck);
        }
      } catch (err) {
        console.error("Error restoring state:", err);
      }
    };

    restoreState();
  }, []); // run once on mount

  // hook to save the state when the component unmounts
  useEffect(() => {
    // console.log("[UNMOUNT] Saving state to AsyncStorage");
    return () => {
      saveState();
    };
  }, [saveState]);

  return (
    <>
      {/* DetailsScreen copilot tour step 2 */}
      <CopilotStep
        name="Work-Time Tracker"
        order={2}
        text="In this area you can track your daily work hours."
      >
        <CopilotTouchableView
          accessible={true}
          accessibilityLabel="Work Time Tracker"
          accessibilityHint="Start or stop tracking your work time"
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
            accessibilityLabel="Work Time Tracker"
            style={{
              fontFamily: "MPLUSLatin_Bold",
              fontSize: 25,
              color: "white",
              marginBottom: 60,
              textAlign: "center",
            }}
          >
            Work-Time Tracker
          </Text>
          {/* Start/Stop Button with  enable condition when user adds a expected hours */}
          {!isWorking ? (
            <TouchableOpacity
              accessible={true}
              accessibilityRole="button"
              accessibilityState={{ disabled: !docExists }}
              accessibilityLabel="Start working"
              accessibilityHint={
                docExists
                  ? "Starts tracking your work time"
                  : "You must first enter expected hours"
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
                  paddingVertical: 6,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    fontFamily: "MPLUSLatin_Bold",
                    fontSize: 22,
                    color: docExists ? "white" : accessMode ? "#222" : "#AAA",
                  }}
                >
                  Start
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              accessible={true}
              accessibilityRole="button"
              accessibilityState={{ disabled: !docExists }}
              accessibilityLabel="Stop working"
              accessibilityHint={
                docExists
                  ? "Stops tracking your work time"
                  : "Please enter your expected working hours first"
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
                  }}
                >
                  Stop
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
            accessibilityLabel={`Elapsed work time: ${formatTime(elapsedTime)}`}
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

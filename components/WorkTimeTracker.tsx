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
import React, { useState, useEffect, useRef } from "react";
import { LinearGradient } from "expo-linear-gradient";
import {
  collection,
  setDoc,
  getDocs,
  getDoc,
  doc,
  updateDoc,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { CopilotStep, walkthroughable } from "react-native-copilot";

import { FIREBASE_FIRESTORE } from "../firebaseConfig";
import dayjs from "../dayjsConfig";
import WorkHoursState from "../components/WorkHoursState";
import { formatTime } from "../components/WorkTimeCalc";
import WorkTimeAnimation from "../components/WorkTimeAnimation";
import { useAlertStore } from "./services/customAlert/alertStore";

///////////////////////////////////////////////////////////////////////////////////

interface DataPoint {
  day: string;
  expectedHours: number;
  overHours: number;
  workDay: string;
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

  // function to calculate elapsed time
  const calculateElapsedTime = (startTime: Date): number => {
    const elapsedMilliseconds = Date.now() - startTime.getTime();
    return elapsedMilliseconds / (1000 * 60 * 60);
  };

  // hook to update elapsed time
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    if (isWorking && startWorkTime) {
      const updateElapsedTime = () => {
        const currentSession = calculateElapsedTime(startWorkTime);
        setElapsedTime(accumulatedDuration + currentSession);
      };
      updateElapsedTime();
      timer = setInterval(updateElapsedTime, 60000);
    } else if (timer) {
      clearInterval(timer);
      timer = null;
    }
    return () => {
      if (timer) {
        clearInterval(timer);
      }
    };
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
          console.log(" Second active state change ignored.");
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
        setTimeout(() => {
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
    };
  }, [elapsedTime, isWorking]);

  // function to start work
  const handleStartWork = async () => {
    // console.log("Starting work...");
    const userId = getAuth().currentUser?.uid;
    if (!userId) {
      console.error("User ID not available.");
      return;
    }
    // get the current work day
    const workDay = dayjs().tz(userTimeZone).format("YYYY-MM-DD");
    setCurrentDocId(workDay);
    setIsWorking(true);
    try {
      const workRef = doc(
        FIREBASE_FIRESTORE,
        "Users",
        userId,
        "Services",
        "AczkjyWoOxdPAIRVxjy3",
        "WorkHours",
        workDay
      );
      const docSnap = await getDoc(workRef);
      let newStartTime;
      if (docSnap.exists()) {
        const workData = docSnap.data();
        const expectedHoursFromFirestore = workData?.expectedHours;
        // current accumulated duration (if exists)
        const prevDuration = Number(workData?.duration) || 0;
        setAccumulatedDuration(prevDuration);
        // set new start time, so that already tracked time is considered
        newStartTime = new Date();
        await setDoc(
          workRef,
          {
            startTime: newStartTime.toISOString(),
            expectedHours: expectedHoursFromFirestore,
            workDay,
            userId,
          },
          { merge: true }
        );
        // console.log(
        //   "Resuming work. Previous duration:",
        //   prevDuration,
        //   "hours. New start time:",
        //   newStartTime
        // );
        setStartWorkTime(newStartTime);
      } else {
        console.log("No Document found.");
        useAlertStore
          .getState()
          .showAlert("Attention", "First add your expected hours.");
        return;
      }
    } catch (error) {
      console.error("Error starting work:", error);
    }
  };

  // function to stop work
  const handleStopWork = async () => {
    // console.log("Stopping work...");
    setIsWorking(false);
    if (!startWorkTime || !currentDocId) {
      console.warn("Missing startWorkTime or currentDocId.");
      return;
    }
    const userId = getAuth().currentUser?.uid;
    if (!userId) {
      console.error("No user ID found.");
      return;
    }
    const endTime = new Date();
    // calculate the duration of the current session (in hours)
    const sessionDurationHours = calculateElapsedTime(startWorkTime);
    const totalDuration = accumulatedDuration + sessionDurationHours;
    const roundedDuration = parseFloat(totalDuration.toFixed(2));
    const overHours = roundedDuration - parseFloat(expectedHours);
    const roundedOverHours = parseFloat(overHours.toFixed(2));
    const workRef = doc(
      FIREBASE_FIRESTORE,
      "Users",
      userId,
      "Services",
      "AczkjyWoOxdPAIRVxjy3",
      "WorkHours",
      currentDocId
    );
    // check if the document exists
    const workSnap = await getDoc(workRef);
    if (!workSnap.exists()) {
      console.error("Error: Document does not exist!");
      return;
    }
    try {
      await updateDoc(workRef, {
        endTime: endTime.toISOString(),
        duration: roundedDuration,
        overHours: Math.max(roundedOverHours, 0),
        elapsedTime: roundedDuration,
      });
      // console.log(
      //   "Data successfully updated with total duration:",
      //   roundedDuration
      // );
      // load global state new to update the chart
      await loadState();
      setRefreshTrigger((prev) => prev + 1);
    } catch (error) {
      console.error("Error updating data:", error);
    }
    // update the local accumulated duration and reset the start time
    setAccumulatedDuration(roundedDuration);
    setStartWorkTime(null);
    setElapsedTime(roundedDuration); // to hold the total duration only if it´s the current day
  };

  // function to get the data from firestore
  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
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
      // condition to check if the snapshot is empty
      if (snapshot.empty) {
        console.log("No data found.");
        return;
      }
      // initialize the data with the fetched data from firestore
      const fetchedData = snapshot.docs.map((doc) => doc.data());
      const formattedData = fetchedData
        // map the data to the expected format
        .map((item) => {
          if (!item.workDay || isNaN(new Date(item.workDay).getTime())) {
            console.error("Missing workDay in item:", item);
            return null;
          }
          // return data as expected
          return {
            day: new Date(item.workDay).toISOString().split("T")[0],
            workDay: new Date(item.workDay).toISOString().split("T")[0],
            expectedHours: Number(item.expectedHours) || 0,
            overHours: Number(item.overHours) || 0,
            elapsedTime: Number(item.duration) || 0, // add elapsedTime from Firestore
          };
        })
        // filter out null values
        .filter((item) => item !== null);
      // console.log("Formatted data:", formattedData);
      setData(formattedData as DataPoint[]);
    };
    fetchData();
  }, [user, currentDocId, refreshTrigger]);

  // hook to update the local accumulated duration
  useEffect(() => {
    setAccumulatedDuration(elapsedTime);
  }, []); // once when the component mounts

  return (
    <>
      {/* DetailsScreen copilot tour step 2 */}
      <CopilotStep
        name="Work-Time Tracker"
        order={2}
        text="In this area you can track your daily work hours."
      >
        <CopilotTouchableView
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
            marginBottom: 50,
          }}
        >
          <Text
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
              onPress={docExists ? handleStartWork : undefined}
              disabled={!docExists}
              activeOpacity={0.7}
              style={{
                width: screenWidth * 0.7,
                maxWidth: 400,
                borderRadius: 14,
                borderWidth: 1.5,
                borderColor: "aqua",
                backgroundColor: "transparent",
                shadowColor: "black",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.3,
                shadowRadius: 3,
                elevation: 5,
                marginBottom: 25,
                opacity: docExists ? 1 : 0.5,
              }}
            >
              <LinearGradient
                colors={["#00f7f7", "#005757"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  paddingVertical: 10,
                  justifyContent: "center",
                  alignItems: "center",
                  borderRadius: 12,
                }}
              >
                <Text
                  style={{
                    fontFamily: "MPLUSLatin_Bold",
                    fontSize: 22,
                    color: docExists ? "white" : "#AAA",
                  }}
                >
                  Start
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={handleStopWork}
              activeOpacity={0.7}
              style={{
                width: screenWidth * 0.7,
                maxWidth: 400,
                borderRadius: 14,
                borderWidth: 1.5,
                borderColor: "aqua",
                backgroundColor: "transparent",
                shadowColor: "black",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.3,
                shadowRadius: 3,
                elevation: 5,
                marginBottom: 25,
              }}
            >
              <LinearGradient
                colors={["#00f7f7", "#005757"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  paddingVertical: 10,
                  justifyContent: "center",
                  alignItems: "center",
                  borderRadius: 12,
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
          <View style={{ position: "relative", height: 20 }}>
            {isWorking && <WorkTimeAnimation />}
          </View>
          {/* Tracking Time */}
          <Text
            style={{
              fontWeight: "bold",
              fontSize: 55,
              color: isWorking ? "white" : "gray",
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

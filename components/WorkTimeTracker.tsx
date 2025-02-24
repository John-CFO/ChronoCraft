/////////////////////////////WorkTimeTracker Component////////////////////////////

import { View, Text, Button, AppState } from "react-native";
import React, { useState, useEffect } from "react";
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

import { FIREBASE_FIRESTORE } from "../firebaseConfig";
import dayjs from "../dayjsConfig";
import WorkHoursState from "../components/WorkHoursState";
import { formatTime } from "../components/WorkTimeCalc";

///////////////////////////////////////////////////////////////////////////////////

interface DataPoint {
  day: string;
  expectedHours: number;
  overHours: number;
  workDay: string;
}
///////////////////////////////////////////////////////////////////////////////////

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

  // global WorkHoursState
  const {
    isWorking,
    startWorkTime,
    elapsedTime,
    expectedHours,
    currentDocId,
    setIsWorking,
    setStartWorkTime,
    setElapsedTime,
    setData,
    setCurrentDocId,
    loadState,
  } = WorkHoursState();

  // initialize firebase auth and get current user
  const auth = getAuth();
  const user = auth.currentUser;

  // hook to load state
  useEffect(() => {
    loadState();
  }, []);

  // hook to load state if currentDocId changes
  useEffect(() => {
    if (currentDocId) {
      loadState();
    }
  }, [currentDocId]);

  // function to calculate elapsed time
  const calculateElapsedTime = (startTime: Date): number => {
    const elapsedMilliseconds = Date.now() - startTime.getTime();
    return elapsedMilliseconds / (1000 * 60 * 60);
  };

  // hook to update elapsed time
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;

    if (isWorking && startWorkTime) {
      const updateElapsedTime = () => {
        const currentSession = calculateElapsedTime(startWorkTime);
        setElapsedTime(accumulatedDuration + currentSession);
      };

      updateElapsedTime();
      timer = setInterval(updateElapsedTime, 1000);
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
    const handleAppStateChange = async (nextAppState: string) => {
      // variable to store the app state
      let appStateValue:
        | "active"
        | "background"
        | "inactive"
        | "unknown"
        | "extension"
        | null = null;
      // check if the app state is valid
      if (
        nextAppState === "active" ||
        nextAppState === "background" ||
        nextAppState === "inactive" ||
        nextAppState === "unknown" ||
        nextAppState === "extension"
      ) {
        appStateValue = nextAppState;
      } else {
        console.error(`Invalid app state: ${nextAppState}`);
      }
      // if the app returns from the background and is working:
      if (
        appState.match(/inactive|background/) && // check what the app state was before
        nextAppState === "active" && // check if the app is in the foreground
        isWorking // check if the app is working
      ) {
        const lastTime = await AsyncStorage.getItem("lastActiveTime");
        if (lastTime) {
          // calculate the elapsed time
          const elapsedHours =
            (Date.now() - new Date(lastTime).getTime()) / (1000 * 60 * 60);
          // update the accumulated duration
          setAccumulatedDuration((prev) => prev + elapsedHours);
          // set a new start time, so that the difference is measured from now
          setStartWorkTime(new Date());
        }
      }
      // Wenn die App in den Hintergrund geht und gearbeitet wird:
      // if the app goes to the background and is working
      if (nextAppState.match(/inactive|background/) && isWorking) {
        await AsyncStorage.setItem("lastActiveTime", new Date().toISOString());
      }
      // set the app state if it is valid
      if (appStateValue !== null) {
        setAppState(appStateValue);
      }
    };
    // event listener to listen for changes in the app state
    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange
    );
    // delete the event listener
    return () => {
      subscription.remove();
    };
  }, [appState, isWorking]);

  // function to start work
  const handleStartWork = async () => {
    console.log("Starting work...");

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

        // condition to check if expectedHoursFromFirestore is null else set alert and return
        if (
          expectedHoursFromFirestore == null ||
          isNaN(expectedHoursFromFirestore)
        ) {
          alert("First add your expected hours.");
          return;
        }

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
        console.log(
          "Resuming work. Previous duration:",
          prevDuration,
          "hours. New start time:",
          newStartTime
        );
        setStartWorkTime(newStartTime);
      } else {
        console.log("No Document found.");
        alert("First add your expected hours.");
        return;
      }
    } catch (error) {
      console.error("Error starting work:", error);
    }
  };
  // function to stop work
  const handleStopWork = async () => {
    console.log("Stopping work...");
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
    // full duration = accumulated duration + current session
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
      });
      console.log(
        "Data successfully updated with total duration:",
        roundedDuration
      );
      // load global state new to update the chart
      await loadState();
      setRefreshTrigger((prev) => prev + 1);
    } catch (error) {
      console.error("Error updating data:", error);
    }
    // update the local accumulated duration and reset the start time
    setAccumulatedDuration(roundedDuration);
    setStartWorkTime(null);
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
        console.warn("No data found in Firestore.");
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
            elapsedTime: Number(item.duration) || 0, // Add elapsedTime from Firestore
          };
        })
        // filter out null values
        .filter((item) => item !== null);

      console.log("Formatted data:", formattedData);
      setData(formattedData as DataPoint[]);
    };

    fetchData();
  }, [user, currentDocId, refreshTrigger]);

  return (
    <View
      style={{
        width: "100%",
        maxWidth: 400,
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
        WorkTime Tracker
      </Text>
      {!isWorking ? (
        <Button title="Start" onPress={handleStartWork} />
      ) : (
        <Button title="Stop" onPress={handleStopWork} />
      )}
      {isWorking && startWorkTime && (
        <Text style={{ color: "aqua", marginTop: 8 }}>
          Working hours are running: {formatTime(elapsedTime)} hours
        </Text>
      )}
    </View>
  );
};

export default WorkTimeTracker;

/////////////////////////////WorkTimeTracker Component////////////////////////////

import { View, Text, Button } from "react-native";
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
import dayjs from "../dayjsConfig";
import { produce } from "immer";
import { FIREBASE_FIRESTORE } from "../firebaseConfig";
import WorkHoursState from "../components/WorkHoursState";

///////////////////////////////////////////////////////////////////////////////////

interface DataPoint {
  day: string;
  expectedHours: number;
  overHours: number;
  workDay: string;
}
///////////////////////////////////////////////////////////////////////////////////

const WorkTimeTracker = () => {
  // state to handle the user time zone
  const [userTimeZone, setUserTimeZone] = useState<string>(dayjs.tz.guess());
  // global state
  const {
    isWorking,
    startWorkTime,
    elapsedTime,
    expectedHours,
    data,
    currentDocId,
    setIsWorking,
    setStartWorkTime,
    setElapsedTime,
    setData,
    setWorkHours,
    setWorkData,
    setCurrentDocId,
    loadState,
    saveState,
  } = WorkHoursState();

  const auth = getAuth();
  const user = auth.currentUser;

  // hook to load the state
  useEffect(() => {
    loadState();
  }, []);

  // hook to load the state when the docId changes
  useEffect(() => {
    if (currentDocId) {
      loadState();
    }
  }, [currentDocId]);

  // calculate the elapsed time
  const calculateElapsedTime = (startTime: Date): number => {
    const elapsedMilliseconds = Date.now() - startTime.getTime();
    return elapsedMilliseconds / (1000 * 60 * 60);
  };

  // format and round the time
  const formatTime = (timeInHours: number): string => {
    const hours = Math.floor(timeInHours);
    const minutes = Math.floor((timeInHours - hours) * 60);
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
      2,
      "0"
    )}`;
  };

  // function to update the elapsed time( with acceleration factor for testing purposes)
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    const accelerationFactor = 60;
    if (isWorking && startWorkTime) {
      const updateElapsedTime = () => {
        const elapsedTimeInHours =
          calculateElapsedTime(startWorkTime) * accelerationFactor;
        setElapsedTime(elapsedTimeInHours);
      };

      updateElapsedTime();

      timer = setInterval(() => {
        updateElapsedTime();
      }, 1_000); // update every second
    } else {
      // save stopping the timer
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    }

    return () => {
      if (timer) {
        clearInterval(timer);
      }
    };
  }, [isWorking, startWorkTime]);

  // function to start the work
  const handleStartWork = async () => {
    console.log("Starting work...");

    const userId = getAuth().currentUser?.uid;
    if (!userId) {
      console.error("User ID nicht verfügbar.");
      return;
    }

    const workDay = dayjs().tz(userTimeZone).format("YYYY-MM-DD");

    // **currentDocId setzen, falls noch nicht vorhanden**
    setCurrentDocId(workDay);

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

      // get the expected hours from firestore
      const docSnap = await getDoc(workRef);
      if (docSnap.exists()) {
        const workData = docSnap.data();
        const expectedHoursFromFirestore = workData?.expectedHours;

        // if no expected hours exist set alert
        if (
          expectedHoursFromFirestore == null ||
          isNaN(expectedHoursFromFirestore)
        ) {
          alert("First add your expected hours.");
          return;
        }

        console.log(
          "Expected Hours from Firestore:",
          expectedHoursFromFirestore
        );

        const startTime = new Date().toISOString();

        // save the starttime and expected hours to firestore
        await setDoc(
          workRef,
          {
            startTime,
            expectedHours: expectedHoursFromFirestore,
            workDay,
            userId,
          },
          { merge: true }
        );

        console.log("Start Worktime:", startTime);
        console.log("Expected Workhours saved:", expectedHoursFromFirestore);

        setStartWorkTime(new Date(startTime));
        setIsWorking(true);
      } else {
        console.log("No Document found.");
        alert("First add your expected hours.");
      }
    } catch (error) {
      console.error("Error starting work:", error);
    }
  };

  // function to stop the work
  const handleStopWork = async () => {
    console.log("Stopping work...");
    console.log("Start time:", startWorkTime);
    console.log("Current doc ID:", currentDocId);

    if (!startWorkTime || !currentDocId) {
      console.warn("Missing Starttime or Dokument-ID!");
      return;
    }
    if (!currentDocId) {
      console.warn("Missing Dokument-ID!");
      return;
    }

    const userId = getAuth().currentUser?.uid;
    if (!userId) {
      console.error("Found no user ID.");
      return;
    }

    // find the document checking if the user has the right permissions
    const workRef = doc(
      FIREBASE_FIRESTORE,
      "Users",
      userId,
      "Services",
      "AczkjyWoOxdPAIRVxjy3",
      "WorkHours",
      currentDocId
    );
    const workSnap = await getDoc(workRef);

    if (!workSnap.exists()) {
      console.error("Found no Document!");
      return;
    }

    const workData = workSnap.data();
    if (workData.userId !== userId) {
      console.error("Error! This user is not allowed to stop the work!");
      return;
    }

    // calculate the duration
    const accelerationFactor = 60; // simulate 1 second as 1 minute
    const endTime = new Date();
    const duration = calculateElapsedTime(startWorkTime);
    const acceleratedDuration = duration * accelerationFactor;
    const roundedDuration = parseFloat(acceleratedDuration.toFixed(2));

    const workDay = startWorkTime
      ? dayjs(startWorkTime).tz(userTimeZone).format("YYYY-MM-DD")
      : null;
    const overHours = roundedDuration - parseFloat(expectedHours);
    const roundedOverHours = parseFloat(overHours.toFixed(2));
    if (!workDay) {
      console.error("Error: workDay is NULL!", startWorkTime);
    }
    try {
      // update with savety check
      await updateDoc(workRef, {
        endTime: endTime.toISOString(),
        duration: roundedDuration,
        overHours: Math.max(roundedOverHours, 0),
      });

      console.log("Work successfully stopped.");
      setStartWorkTime(null); // reset timer
      setCurrentDocId(null); // reset Firestore-ID
    } catch (error) {
      console.error("Error stopping work:", error);
    }
  };

  // hook to get the data from firestore
  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

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

      if (snapshot.empty) {
        console.warn("No data found in Firestore.");
        return;
      }

      const fetchedData = snapshot.docs.map((doc) => doc.data());
      const formattedData = fetchedData
        // map the fetched data to the desired format
        .map((item) => {
          if (!item.workDay || isNaN(new Date(item.workDay).getTime())) {
            console.error("Missing workDay in item:", item);
            return null;
          }
          return {
            day: new Date(item.workDay).toISOString().split("T")[0],
            workDay: new Date(item.workDay).toISOString().split("T")[0],
            expectedHours: Number(item.expectedHours) || 0,
            overHours: Number(item.overHours) || 0,
          };
        })
        // filter out null values
        .filter((item) => item !== null);

      console.log("Formatted data:", formattedData);
      setData(formattedData as DataPoint[]);
    };

    fetchData();
  }, [user, currentDocId]);

  // hook to get the data from firestore when the component mounts
  useEffect(() => {
    const fetchWorkHours = async () => {
      try {
        const userId = getAuth().currentUser?.uid;
        if (!userId) {
          console.log("User is not authenticated");
          return;
        }

        const workHoursRef = collection(
          FIREBASE_FIRESTORE,
          "Users",
          userId,
          "Services",
          "AczkjyWoOxdPAIRVxjy3",
          "WorkHours"
        );

        const querySnapshot = await getDocs(workHoursRef);
        const fetchedWorkHours = querySnapshot.docs.map((doc) => doc.data());

        setWorkHours(fetchedWorkHours); // Update the global state
      } catch (error) {
        console.error("Error fetching work hours:", error);
      }
    };

    fetchWorkHours();
  }, []);

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

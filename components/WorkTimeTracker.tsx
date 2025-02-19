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
        const elapsedTimeInHours = calculateElapsedTime(startWorkTime);
        setElapsedTime(elapsedTimeInHours);
      };

      updateElapsedTime();

      timer = setInterval(updateElapsedTime, 1000);
    } else {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    }

    /* timer = setInterval(() => {
        updateElapsedTime();
      }, 1_000); // update every second
    } else {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    }*/

    return () => {
      if (timer) {
        clearInterval(timer);
      }
    };
  }, [isWorking, startWorkTime]);

  // function to start work
  const handleStartWork = async () => {
    console.log("Starting work...");

    const userId = getAuth().currentUser?.uid;
    if (!userId) {
      console.error("User ID nicht verfügbar.");
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

        console.log(
          "Expected Hours from Firestore:",
          expectedHoursFromFirestore
        );
        // initialize start time
        const startTime = new Date().toISOString();

        // update the document
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
      } else {
        console.log("No Document found.");
        alert("First add your expected hours.");
      }
    } catch (error) {
      console.error("Error starting work:", error);
    }
  };

  // function to stop work
  const handleStopWork = async () => {
    console.log("Stopping work...");
    setIsWorking(false); // Interval sofort stoppen

    if (!startWorkTime || !currentDocId) {
      console.warn("Fehlende Startzeit oder Dokument-ID!");
      return;
    }

    const userId = getAuth().currentUser?.uid;
    if (!userId) {
      console.error("Keine Benutzer-ID gefunden.");
      return;
    }

    const endTime = new Date();
    const realDurationMs = endTime.getTime() - startWorkTime.getTime();
    const realDurationHours = realDurationMs / (1000 * 60 * 60);
    const roundedDuration = parseFloat(realDurationHours.toFixed(2));
    const overHours = roundedDuration - parseFloat(expectedHours);
    const roundedOverHours = parseFloat(overHours.toFixed(2));

    const workRef = doc(
      FIREBASE_FIRESTORE,
      "Users",
      userId,
      "Services",
      "AczkjyWoOxdPAIRVxjy3",
      "WorkHours",
      currentDocId // Hier sicherstellen, dass die ID existiert
    );

    // Existenz des Dokuments prüfen
    const workSnap = await getDoc(workRef);
    if (!workSnap.exists()) {
      console.error("Fehler: Das Dokument existiert nicht!");
      return;
    }

    try {
      await updateDoc(workRef, {
        endTime: endTime.toISOString(),
        duration: roundedDuration,
        overHours: Math.max(roundedOverHours, 0),
      });
      console.log("Daten erfolgreich aktualisiert.");
    } catch (error) {
      console.error("Fehler beim Stoppen:", error);
    }

    // State zurücksetzen
    setStartWorkTime(null);
    setCurrentDocId(null);
  };
  // fnction to get the data from firestore
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
      // map the data and formate it
      const fetchedData = snapshot.docs.map((doc) => doc.data());
      const formattedData = fetchedData
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
  }, [user, currentDocId]);

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

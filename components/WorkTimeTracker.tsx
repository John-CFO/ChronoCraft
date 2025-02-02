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
  DocumentData,
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
  // const [isWorking, setIsWorking] = useState(false);
  // const [startWorkTime, setStartWorkTime] = useState<null | Date>(null);
  // const [elapsedTime, setElapsedTime] = useState(0);
  // const [data, setData] = useState<DataPoint[]>([]);
  // const [currentDocId, setCurrentDocId] = useState<string | null>(null);
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

  // Zustand beim Laden der Komponente initialisieren
  useEffect(() => {
    loadState();
  }, []);

  // Zustand beim Laden der Komponente initialisieren
  useEffect(() => {
    if (currentDocId) {
      loadState(); // Lade den Zustand, wenn die docId verfügbar ist
    }
  }, [currentDocId]);

  const calculateElapsedTime = (startTime: Date): number => {
    const elapsedMilliseconds = Date.now() - startTime.getTime();
    return elapsedMilliseconds / (1000 * 60 * 60);
  };

  const formatTime = (timeInHours: number): string => {
    const hours = Math.floor(timeInHours);
    const minutes = Math.floor((timeInHours - hours) * 60);
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
      2,
      "0"
    )}`;
  };

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
      }, 1_000); // Timer alle Sekunde aktualisieren
    } else {
      // Sicherstellen, dass der Timer gestoppt wird
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
  const handleStartWork = () => {
    setStartWorkTime(new Date());
    setIsWorking(true);
  };

  /* const handleStopWork = async () => {
    console.log("Stopping work...");
    console.log("Start time:", startWorkTime);
    console.log("Current doc ID:", currentDocId);
    if (!startWorkTime || !currentDocId) {
      console.warn("Startzeit oder Dokument-ID fehlen!");
      return;
    }

    const userId = getAuth().currentUser?.uid;
    if (!userId) {
      console.error("User ID nicht verfügbar.");
      return;
    }

    try {
      const endTime = new Date();
      const duration = calculateElapsedTime(startWorkTime);
      const roundedDuration = parseFloat(duration.toFixed(2));
      const workDay = dayjs(startWorkTime)
        .tz(userTimeZone)
        .format("YYYY-MM-DD");
      const overHours = roundedDuration - parseFloat(expectedHours);
      const roundedOverHours = Math.max(parseFloat(overHours.toFixed(2)), 0);

      const docRef = doc(
        FIREBASE_FIRESTORE,
        "Users",
        userId,
        "Services",
        "AczkjyWoOxdPAIRVxjy3",
        "WorkHours",
        currentDocId
      );

      // Save work data to Firestore
      await setDoc(docRef, {
        userId,
        expectedHours: parseFloat(expectedHours),
        workDay,
        start: startWorkTime.toISOString(),
        end: endTime.toISOString(),
        duration: roundedDuration,
        overHours: roundedOverHours,
      }); */

  // Update the state locally
  /* setWorkData((prev) => {
        const existingEntry = prev.find((entry: any) => entry.date === workDay);
        if (existingEntry) {
          return [...prev].map((entry: any) =>
            entry.date === workDay
              ? {
                  ...entry,
                  duration: entry.duration + roundedDuration,
                  overHours: Math.max(entry.overHours + roundedOverHours, 0),
                }
              : entry
          );
        } else {
          return [...prev, {
            date: workDay,
            duration: roundedDuration,
            overHours: Math.max(roundedOverHours, 0),
          }];
        }
      });*/

  /*  (setWorkData as (value: any[] | ((draft: any[]) => void)) => void)(
        produce((draft) => {
          const existingEntry = draft.find(
            (entry: any) => entry.date === workDay
          );
          if (existingEntry) {
            existingEntry.duration += roundedDuration;
            existingEntry.overHours = Math.max(
              existingEntry.overHours + roundedOverHours,
              0
            );
          } else {
            draft.push({
              date: workDay,
              duration: roundedDuration,
              overHours: Math.max(roundedOverHours, 0),
            });
          }
        })
      );

      // Stop the timer
      setIsWorking(false);
      setStartWorkTime(null);
      setElapsedTime(0); // Reset elapsed time

      // Save the state
      await saveState();
      console.log("Work stopped. State should be reset now.");
    } catch (error) {
      console.error("Fehler beim Speichern der Arbeitszeit:", error);
    }
  }; */

  const handleStopWork = async () => {
    console.log("Stopping work...");
    console.log("Start time:", startWorkTime);
    console.log("Current doc ID:", currentDocId);

    if (!startWorkTime || !currentDocId) {
      console.warn("Startzeit oder Dokument-ID fehlen!");
      return;
    }
    if (!currentDocId) {
      console.warn("Startzeit oder Dokument-ID fehlen!");
      return;
    }

    const userId = getAuth().currentUser?.uid;
    if (!userId) {
      console.error("User ID nicht verfügbar.");
      return;
    }

    // **Firestore-Dokument abrufen und prüfen, ob der User-Check passt**
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
      console.error("Dokument nicht gefunden!");
      return;
    }

    const workData = workSnap.data();
    if (workData.userId !== userId) {
      console.error(
        "Fehler: Dieser User hat keine Berechtigung für diese Work-Session!"
      );
      return;
    }

    // **Dauer & Überstunden berechnen**
    const accelerationFactor = 60; // 1 Sekunde = 1 Minute simulieren
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
      console.error("Fehler: workDay ist NULL!", startWorkTime);
    }
    try {
      // **Update mit Sicherheitscheck speichern**
      await updateDoc(workRef, {
        endTime: endTime.toISOString(),
        duration: roundedDuration,
        overHours: Math.max(roundedOverHours, 0),
      });

      console.log("Arbeit erfolgreich gestoppt und gespeichert.");
      setStartWorkTime(null); // Timer zurücksetzen
      setCurrentDocId(null); // Firestore-ID zurücksetzen
    } catch (error) {
      console.error("Fehler beim Speichern der Arbeitszeit:", error);
    }
  };

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
        .filter((item) => item !== null);

      console.log("Formatted data:", formattedData);
      setData(formattedData as DataPoint[]);
    };

    fetchData();
  }, [user, currentDocId]);

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

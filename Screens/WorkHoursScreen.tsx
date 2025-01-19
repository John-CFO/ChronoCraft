///////////////////////////////////////WorkHoursScreen.tsx////////////////////////////////////////////

import {
  View,
  Text,
  ScrollView,
  TextInput,
  Button,
  Alert,
  TouchableOpacity,
} from "react-native";
import React, { useState, useEffect } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { StackedBarChart } from "react-native-chart-kit";
import {
  collection,
  setDoc,
  getDocs,
  doc,
  DocumentData,
} from "firebase/firestore";
import dayjs from "../dayjsConfig";
import { getAuth } from "firebase/auth";

import { FIREBASE_FIRESTORE } from "../firebaseConfig";

//////////////////////////////////////////////////////////////////////////////////////////////////////

const WorkHoursScreen = () => {
  // state to handle the user time zone
  const [userTimeZone, setUserTimeZone] = useState<string>(dayjs.tz.guess());
  // state to handle the work data
  const [workData, setWorkData] = useState<
    { date: string; duration: number; overHours: number }[]
  >([]);
  // state to handle the expected hours
  const [expectedHours, setExpectedHours] = useState("");
  // state to handle the start time
  const [startWorkTime, setStartWorkTime] = useState<Date | null>(null);
  // state to handle the isWorking state
  const [isWorking, setIsWorking] = useState(false);
  // state to handle the elapsed time to calculate the total hours
  const [elapsedTime, setElapsedTime] = useState(0);
  // state to manage the document ID when user saves expectedHours and tracking data in Firestore
  const [currentDocId, setCurrentDocId] = useState<string | null>(null);
  const [workHours, setWorkHours] = useState<DocumentData[]>([]);
  // function to calculate the elapsed time in hours
  const calculateElapsedTime = (startTime: Date): number => {
    const elapsedMilliseconds = Date.now() - startTime.getTime();
    return elapsedMilliseconds / (1000 * 60 * 60); // recalculate to hours
  };

  // function to format and round the time
  const formatTime = (timeInHours: number): string => {
    const hours = Math.floor(timeInHours);
    const minutes = Math.floor((timeInHours - hours) * 60);
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  };

  // function to calculate the total hours worked
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    const accelerationFactor = 60; // simulate 1 second as 1 minute (for testing purposes)
    if (isWorking && startWorkTime) {
      const updateElapsedTime = () => {
        const elapsedTimeInHours =
          calculateElapsedTime(startWorkTime) * accelerationFactor; // accelerate the elapsed time(for testing purposes)
        setElapsedTime(elapsedTimeInHours); // set elapsed time in hours
      };

      updateElapsedTime(); // update imidiatly

      timer = setInterval(() => {
        updateElapsedTime(); // update every minute
      }, 1_000); //(for testing purposes)   standart: 60_000); // calculate interval in 60sec
    }

    return () => {
      if (timer) {
        clearInterval(timer); // clean the interval
      }
    };
  }, [isWorking, startWorkTime]);

  // function to save the expected hours
  const handleSaveMinHours = async () => {
    const hours = parseFloat(expectedHours);

    // validate expectedHours input
    if (!expectedHours || isNaN(hours) || hours <= 0) {
      Alert.alert(
        "Invalid Input",
        "Please enter a valid number greater than 0.",
        [{ text: "OK", style: "default" }]
      );
      return;
    }

    try {
      const userId = getAuth().currentUser?.uid;
      if (!userId) {
        console.error("User ID not available.");
        return;
      }
      const docRef = currentDocId
        ? doc(
            FIREBASE_FIRESTORE,
            "Users",
            userId,
            "Services",
            "AczkjyWoOxdPAIRVxjy3",
            "WorkHours",
            currentDocId
          )
        : doc(
            collection(
              FIREBASE_FIRESTORE,
              "Users",
              userId,
              "Services",
              "AczkjyWoOxdPAIRVxjy3",
              "WorkHours"
            )
          );
      if (!currentDocId) {
        setCurrentDocId(docRef.id); // save the document ID for future use
      }
      await setDoc(docRef, {
        userId,
        expectedHours: hours,
      });
      setCurrentDocId(docRef.id); // save document ID
      console.log("Expected hours saved:", hours);
    } catch (error) {
      console.error("Error saving min hours:", error);
      Alert.alert(
        "Error",
        "During the saving process an error occurred. Please try again.",
        [{ text: "OK", style: "default" }]
      );
    }
  };

  // function to start the work
  const handleStartWork = () => {
    setStartWorkTime(new Date());
    setIsWorking(true);
  };

  // function to stop the work and update the work data in firestore
  const handleStopWork = async () => {
    if (startWorkTime && currentDocId) {
      const accelerationFactor = 60; // simulate 1 second as 1 minute (for testing purposes)
      const endTime = new Date();
      const duration = calculateElapsedTime(startWorkTime); // calculate duration
      const acceleratedDuration = duration * accelerationFactor; // accelerate the duration(for testing purposes)
      const roundedDuration = parseFloat(acceleratedDuration.toFixed(2)); // rou
      const workDay = dayjs(startWorkTime)
        .tz(userTimeZone)
        .format("YYYY-MM-DD");
      const overHours = roundedDuration - parseFloat(expectedHours);
      const roundedOverHours = parseFloat(overHours.toFixed(2));
      try {
        const userId = getAuth().currentUser?.uid;
        if (!userId) {
          console.error("User ID not available.");
          return;
        }
        const docRef = doc(
          FIREBASE_FIRESTORE,
          "Users",
          userId,
          "Services",
          "AczkjyWoOxdPAIRVxjy3",
          "WorkHours",
          currentDocId
        );
        // save data to firestore
        await setDoc(docRef, {
          userId,
          expectedHours: parseFloat(expectedHours),
          workDay,
          start: startWorkTime.toISOString(),
          end: endTime.toISOString(),
          duration: roundedDuration,
          overHours: Math.max(roundedOverHours, 0),
        });
        setWorkData((prev) => {
          const existingEntry = prev.find((entry) => entry.date === workDay);
          // condtion to update the duration and overHours
          if (existingEntry) {
            return prev.map((entry) =>
              entry.date === workDay
                ? {
                    ...entry,
                    duration: entry.duration + roundedDuration,
                    overHours: Math.max(entry.overHours + roundedOverHours, 0), // use the rounded overHours
                  }
                : entry
            );
          } else {
            return [
              ...prev,
              {
                date: workDay,
                duration: roundedDuration,
                overHours: Math.max(roundedOverHours, 0), // use the rounded overHours
              },
            ];
          }
        });
        console.log("Saved work data:", roundedDuration, roundedOverHours);
      } catch (error) {
        console.error("Error saving work data:", error);
      } finally {
        setStartWorkTime(null);
        setIsWorking(false);
      }
    }
  };

  // hook with snapshot to get the work data from firestore
  useEffect(() => {
    const fetchWorkHours = async () => {
      try {
        const userId = getAuth().currentUser?.uid;
        if (!userId) {
          console.log("User is not authenticated");
          return;
        }
        // define the path to your collection (userId is already part of the path)
        const workHoursRef = collection(
          FIREBASE_FIRESTORE,
          "Users",
          userId,
          "Services",
          "AczkjyWoOxdPAIRVxjy3", // specific service ID
          "WorkHours"
        );

        // fetch the documents from the collection
        const querySnapshot = await getDocs(workHoursRef);

        const fetchedWorkHours:
          | ((prevState: never[]) => never[])
          | DocumentData[] = [];
        querySnapshot.forEach((doc) => {
          fetchedWorkHours.push(doc.data());
        });

        setWorkHours(fetchedWorkHours);
      } catch (error) {
        console.error("Error fetching work hours:", error);
      }
    };

    fetchWorkHours();
  }, []);

  // hookt to process the work data from firestore
  useEffect(() => {
    const processWorkHours = () => {
      const processedData = workHours.map((doc) => ({
        date: doc.workDay,
        duration: doc.duration,
        overHours: doc.overHours,
      }));
      setWorkData(processedData); // set the processed data
    };
    processWorkHours();
  }, [workHours]); // if workHours changes

  // hook to get the current time
  useEffect(() => {
    setUserTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
  }, []);

  // function to  define the stacked chart data
  const stackedChartData = {
    legend: ["Work Hours", "Over Hours"],
    data: workData.map((entry) => {
      console.log("Entry for chart:", entry);
      return [entry.duration, entry.overHours];
    }),
    barColors: ["rgb(51, 51, 51)", "rgb(0, 247, 255)"],
    labels: workData.map((entry) => entry.date),
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "black" }}>
      <View
        style={{
          flex: 1,
          minHeight: "100%",
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "black",
          padding: 16,
        }}
      >
        <Text
          style={{
            fontSize: 25,
            fontFamily: "MPLUSLatin_Bold",
            color: "white",
            marginBottom: 50,
          }}
        >
          - Workhours Management -
        </Text>
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
          {/* title */}
          <Text
            style={{
              fontFamily: "MPLUSLatin_Bold",
              fontSize: 25,
              color: "white",
              marginBottom: 60,
              textAlign: "center",
            }}
          >
            Daily Workhours
          </Text>
          <Text
            style={{
              fontSize: 18,
              fontFamily: "MPLUSLatin_ExtraLight",
              color: "white",
              textAlign: "center",
              marginBottom: 10,
            }}
          >
            "add your minimum working hours"
          </Text>
          <View
            style={{
              marginTop: 30,
              width: "100%",
              backgroundColor: "#191919",
              alignItems: "center",
            }}
          >
            <TextInput
              placeholder="(e.g. 8)"
              placeholderTextColor="grey"
              value={expectedHours}
              keyboardType="numeric"
              onChangeText={setExpectedHours}
              style={{
                marginBottom: 15,
                width: 280,
                borderColor: "aqua",
                borderWidth: 1.5,
                borderRadius: 12,
                paddingLeft: 15,
                paddingRight: 40,
                paddingBottom: 5,
                fontSize: 22,
                height: 50,
                color: "white",
                fontWeight: "bold",
                backgroundColor: "black",
              }}
            />
          </View>
          <TouchableOpacity
            onPress={handleSaveMinHours}
            style={{
              width: 280,
              borderRadius: 12,
              overflow: "hidden",
              borderWidth: 3,
              borderColor: "white",
              marginBottom: 25,
            }}
          >
            <LinearGradient
              colors={["#00FFFF", "#FFFFFF"]}
              style={{
                alignItems: "center",
                justifyContent: "center",
                height: 45,
                width: 280,
              }}
            >
              <Text
                style={{
                  fontFamily: "MPLUSLatin_Bold",
                  fontSize: 22,
                  color: "grey",
                  marginBottom: 5,
                  paddingRight: 10,
                }}
              >
                Save
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <View>
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
        <View
          style={{
            alignItems: "center",
            padding: 15,
            borderWidth: 1,
            borderColor: "aqua",
            borderRadius: 12,
            backgroundColor: "#191919",
          }}
        >
          {/* title */}
          <Text
            style={{
              fontFamily: "MPLUSLatin_Bold",
              fontSize: 25,
              color: "white",
              marginBottom: 60,
              textAlign: "center",
            }}
          >
            Workhours Chart
          </Text>
          <StackedBarChart
            data={stackedChartData}
            width={350}
            height={300}
            yAxisLabel=""
            yAxisSuffix="h"
            fromZero={true}
            yAxisInterval={1} // steps for y-axis
            hideLegend={false} // set true to hide legend
            chartConfig={{
              color: (opacity = 1) => `rgba(0, 255, 255, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
              propsForLabels: {
                fontSize: 12,
                fontWeight: "bold",
                fill: "gray",
              },
            }}
            style={{
              borderWidth: 0.5,
              //borderColor: "aqua",
              borderRadius: 12, //shadow options for android
              shadowColor: "#ffffff",
              elevation: 3,
              //shadow options for ios
              shadowOffset: { width: 3, height: 3 },
            }}
          />
        </View>
      </View>
    </ScrollView>
  );
};

export default WorkHoursScreen;

/*
{workData.length === 0 ? (
  <Text style={{ textAlign: "center", marginTop: 20 }}>
    No Working Hours yet
  </Text>
):()*/

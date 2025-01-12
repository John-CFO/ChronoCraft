///////////////////////////////////////WorkHoursScreen.tsx////////////////////////////////////////////

import { View, Text, ScrollView, TextInput, Button } from "react-native";
import React, { useState, useEffect } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { BarChart } from "react-native-chart-kit";
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { FIREBASE_FIRESTORE } from "../firebaseConfig";
import { TouchableOpacity } from "react-native-gesture-handler";

//////////////////////////////////////////////////////////////////////////////////////////////////////

const WorkHoursScreen = () => {
  // state to handle the work data
  const [workData, setWorkData] = useState<
    { date: string; duration: number }[]
  >([]);
  // state to handle the expected hours
  const [expectedHours, setExpectedHours] = useState("");
  // state to handle the start time
  const [startWorkTime, setStartWorkTime] = useState<Date | null>(null);
  // state to handle the isWorking state
  const [isWorking, setIsWorking] = useState(false);
  // state to handle the elapsed time to calculate the total hours
  const [elapsedTime, setElapsedTime] = useState(0);

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

    if (isWorking && startWorkTime) {
      const updateElapsedTime = () => {
        const elapsedTimeInHours = calculateElapsedTime(startWorkTime);
        setElapsedTime(elapsedTimeInHours); // set elapsed time in hours
      };

      updateElapsedTime(); // update imidiatly

      timer = setInterval(() => {
        updateElapsedTime(); // update every minute
      }, 60_000); // calculate interval in 60sec
    }

    return () => {
      if (timer) {
        clearInterval(timer); // clean the interval
      }
    };
  }, [isWorking, startWorkTime]);

  // hook with snapshot to get the work data from firestore
  useEffect(() => {
    const unsubscribe = onSnapshot(
      query(
        collection(FIREBASE_FIRESTORE, "workData"),
        where("userId", "==", getAuth().currentUser?.uid)
      ),
      (snapshot) => {
        const fetchedData = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            date: new Date(data.start).toLocaleDateString(),
            duration: data.duration,
          };
        });
        setWorkData(fetchedData);
      }
    );
    return () => unsubscribe();
  }, []);

  // function to save the expected hours
  const handleSaveMinHours = async () => {
    const hours = parseFloat(expectedHours);
    if (!isNaN(hours) && hours > 0) {
      try {
        await addDoc(collection(FIREBASE_FIRESTORE, "workHours"), {
          expectedHours: hours,
        });
        console.log("Expected hours saved:", hours);
      } catch (error) {
        console.error("Error saving min hours:", error);
      }
    }
  };

  // function to start the work
  const handleStartWork = () => {
    setStartWorkTime(new Date());
    setIsWorking(true);
  };

  // function to stop the work and update the work data in firestore
  const handleStopWork = async () => {
    if (startWorkTime) {
      const endTime = new Date();
      const duration = calculateElapsedTime(startWorkTime); // uses the calculateElapsedTime function

      const workDay = startWorkTime.toISOString().split("T")[0];

      try {
        await addDoc(collection(FIREBASE_FIRESTORE, "workHours"), {
          start: startWorkTime.toISOString(),
          end: endTime.toISOString(),
          duration,
          workDay,
        });

        setWorkData((prev) => {
          const existingEntry = prev.find((entry) => entry.date === workDay);

          if (existingEntry) {
            return prev.map((entry) =>
              entry.date === workDay
                ? { ...entry, duration: entry.duration + duration }
                : entry
            );
          } else {
            return [...prev, { date: workDay, duration }];
          }
        });

        console.log("Saved work data:", duration);
      } catch (error) {
        console.error("Error saving work data:", error);
      } finally {
        setStartWorkTime(null);
        setIsWorking(false);
      }
    }
  };

  return (
    <ScrollView>
      <View
        style={{
          flex: 1,
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
            borderWidth: 2,
            borderColor: "aqua",
          }}
        >
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

        <View>
          {workData.length === 0 ? (
            <Text style={{ textAlign: "center", marginTop: 20 }}>
              No Working Hours yet
            </Text>
          ) : (
            <BarChart
              data={{
                labels: workData.map((item) => item.date),
                datasets: [{ data: workData.map((item) => item.duration) }],
              }}
              width={350}
              height={300}
              yAxisLabel=""
              yAxisSuffix=" h"
              chartConfig={{
                backgroundColor: "#191919",
                backgroundGradientFrom: "#191919",
                backgroundGradientTo: "#191919",
                decimalPlaces: 1,

                color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
              }}
              style={{
                marginTop: 20,
                borderRadius: 12,
                height: 300,
                width: 350,

                borderWidth: 2,
                borderColor: "aqua",
                overflow: "hidden",
              }}
            />
          )}
        </View>
      </View>
    </ScrollView>
  );
};

export default WorkHoursScreen;

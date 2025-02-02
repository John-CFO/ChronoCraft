import React, { useState, useEffect } from "react";
import { Text, View, TouchableOpacity, TextInput, Alert } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { getAuth } from "firebase/auth";
import { setDoc, doc, onSnapshot } from "firebase/firestore";

import { FIREBASE_FIRESTORE } from "../firebaseConfig";
import dayjs from "../dayjsConfig";

const WorkHoursInput = () => {
  const [expectedHours, setExpectedHours] = useState("");
  const [currentDocId, setCurrentDocId] = useState<string | null>(null);
  const [userTimeZone, setUserTimeZone] = useState<string>(dayjs.tz.guess());
  const [tempExpectedHours, setTempExpectedHours] = useState<string>("");

  // Effect, um die Daten nach dem Speichern aus Firestore zu holen
  useEffect(() => {
    const fetchWorkHours = async () => {
      const userId = getAuth().currentUser?.uid;
      if (!userId || !currentDocId) return;

      const docRef = doc(
        FIREBASE_FIRESTORE,
        "Users",
        userId,
        "Services",
        "AczkjyWoOxdPAIRVxjy3",
        "WorkHours",
        currentDocId
      );

      const unsubscribe = onSnapshot(docRef, (docSnapshot) => {
        if (docSnapshot.exists()) {
          const data = docSnapshot.data();
          if (data && data.expectedHours) {
            setExpectedHours(data.expectedHours.toString());
            setTempExpectedHours(data.expectedHours.toString()); // Sync temp value with firestore
          }
        }
      });

      return unsubscribe; // Unsubscribe when component unmounts
    };

    fetchWorkHours();
  }, [currentDocId]); // Runs only when currentDocId changes

  const handleSaveMinHours = async () => {
    const hours = parseFloat(tempExpectedHours);

    if (!tempExpectedHours || isNaN(hours) || hours <= 0) {
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

      const workDay = dayjs().tz(userTimeZone).format("YYYY-MM-DD");

      // Referenz für das Dokument basierend auf dem workDay
      const docRef = doc(
        FIREBASE_FIRESTORE,
        "Users",
        userId,
        "Services",
        "AczkjyWoOxdPAIRVxjy3",
        "WorkHours",
        workDay // Das Datum als Dokument-ID
      );

      if (!currentDocId) {
        setCurrentDocId(docRef.id);
      }

      // Speichern der Arbeitszeit in Firestore
      await setDoc(docRef, {
        userId,
        expectedHours: hours,
        workDay,
      });

      setCurrentDocId(docRef.id);
      console.log("Expected hours saved:", hours);
      setExpectedHours(tempExpectedHours);
      setTempExpectedHours(""); // clear temp value
    } catch (error) {
      console.error("Error saving expected hours:", error);
      if (error instanceof Error) {
        console.error("Error message:", error.message);
      }
      Alert.alert(
        "Error",
        "During the saving process an error occurred. Please try again.",
        [{ text: "OK", style: "default" }]
      );
    }
  };

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
          value={tempExpectedHours}
          keyboardType="numeric"
          onChangeText={setTempExpectedHours}
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
      {/* Hourly Rate info container */}
      <View
        style={{
          width: "100%",
          height: 50,
          alignItems: "flex-start",
          justifyContent: "center",
          paddingLeft: 10,
          borderRadius: 10,
          //shadow options for android
          shadowColor: "#ffffff",
          elevation: 2,
          //shadow options for ios
          shadowOffset: { width: 2, height: 2 },
          shadowOpacity: 0.3,
          shadowRadius: 3,
          backgroundColor: "#191919",
        }}
      >
        <Text
          style={{
            fontSize: 30,
            fontWeight: "bold",
            color: "white",
            marginBottom: 5,
          }}
        >
          <Text
            style={{
              color: "grey",
              fontSize: 16,
              fontFamily: "MPLUSLatin_Bold",
            }}
          >
            Your expected WorkHours:{" "}
          </Text>
          {expectedHours || "Not set"}
        </Text>
      </View>
    </View>
  );
};

export default WorkHoursInput;

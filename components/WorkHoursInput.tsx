/////////////////////////////WorkHoursInput Component////////////////////////////

import React, { useState } from "react";
import { Text, View, TouchableOpacity, TextInput, Alert } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { getAuth } from "firebase/auth";
import { setDoc, doc } from "firebase/firestore";

import { FIREBASE_FIRESTORE } from "../firebaseConfig";
import dayjs from "../dayjsConfig";

const WorkHoursInput = () => {
  // state to store the expected hours
  const [expectedHours, setExpectedHours] = useState("");
  // state to store the current document ID
  const [currentDocId, setCurrentDocId] = useState<string | null>(null);
  // state to store the user's time zone
  const [userTimeZone, setUserTimeZone] = useState<string>(dayjs.tz.guess());
  // state to store the temporary expected hours
  const [tempExpectedHours, setTempExpectedHours] = useState("");

  // function to save the expected hours
  const handleSaveMinHours = async () => {
    const hours = parseFloat(tempExpectedHours); // parse the expected hours

    if (!tempExpectedHours || isNaN(hours) || hours <= 0) {
      Alert.alert(
        "Invalid Input",
        "Please enter a valid number greater than 0.",
        [{ text: "OK", style: "default" }]
      );
      return;
    }
    // condition to check if the user is logged in
    try {
      const userId = getAuth().currentUser?.uid;
      if (!userId) {
        console.error("User ID not available.");
        return;
      }
      // use the user's time zone
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

      // condition to check if the currentDocId is null and set it
      if (!currentDocId) {
        setCurrentDocId(docRef.id);
      }

      // save the data to Firestore
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
      // alert to inform the user about the error
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
      {/* title and subtitle */}
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
        {/* Text Input to enter the expected hours */}
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
      {/* Save Button */}
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

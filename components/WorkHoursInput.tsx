/////////////////////////////WorkHoursInput Component////////////////////////////

// This component is used to show the expected hours input field and save the expected hours to Firestore

/////////////////////////////////////////////////////////////////////////////////

import React, { useState, useEffect } from "react";
import {
  Text,
  View,
  TouchableOpacity,
  TextInput,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { getAuth } from "firebase/auth";
import { setDoc, doc, getDoc } from "firebase/firestore";
import { CopilotStep, walkthroughable } from "react-native-copilot";

import { FIREBASE_FIRESTORE } from "../firebaseConfig";
import dayjs from "../dayjsConfig";
import WorkHoursState from "../components/WorkHoursState";
import { useAlertStore } from "./services/customAlert/alertStore";
import { sanitizeHours } from "./InputSanitizers";

//////////////////////////////////////////////////////////////////////////////////

// modified walkthroughable for copilot tour
const CopilotWalktroughView = walkthroughable(View);

const WorkHoursInput = () => {
  // state to store the expected hours
  const [expectedHours, setExpectedHours] = useState("");
  // state to store the current document ID
  const [currentDocId, setCurrentDocId] = useState<string | null>(null);
  // state to store the user's time zone
  const [userTimeZone, setUserTimeZone] = useState<string>(dayjs.tz.guess());
  // state to store the temporary expected hours
  const [tempExpectedHours, setTempExpectedHours] = useState("");
  // gets the current document ID from the WorkHoursState
  const { setDocExists, setCurrentDocId: setGlobalDocId } = WorkHoursState();

  // screensize for dynamic size calculation
  const screenWidth = Dimensions.get("window").width;

  // hook to fetch the expected hours from Firestore by mount
  useEffect(() => {
    const fetchExpectedHours = async () => {
      try {
        const userId = getAuth().currentUser?.uid;
        if (!userId) return;
        const tz = dayjs.tz.guess();
        const workDay = dayjs().tz(tz).format("YYYY-MM-DD");
        const docRef = doc(
          FIREBASE_FIRESTORE,
          "Users",
          userId,
          "Services",
          "AczkjyWoOxdPAIRVxjy3",
          "WorkHours",
          workDay
        );
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setExpectedHours(data.expectedHours.toString());
          setDocExists(true);
          setGlobalDocId(docRef.id);
        }
      } catch (error) {
        console.error("Error fetching hours:", error);
      }
    };
    fetchExpectedHours();
  }, []); // empty array enshures that this runs only once by mount

  // function to save the expected hours
  const [saving, setSaving] = useState(false);
  const handleSaveMinHours = async () => {
    const hours = parseFloat(tempExpectedHours); // parse the expected hours
    if (!tempExpectedHours || isNaN(hours) || hours <= 0) {
      useAlertStore
        .getState()
        .showAlert(
          "Invalid Input",
          "Please enter a valid number greater than 0.",
          [{ text: "OK", style: "default" }]
        );
      return;
    }
    // condition to check if the user is logged in
    setSaving(true);
    try {
      const userId = getAuth().currentUser?.uid;
      if (!userId) {
        console.error("User ID not available.");
        return;
      }
      // use the user's time zone
      const workDay = dayjs().tz(userTimeZone).format("YYYY-MM-DD");
      // reference for the document based on the workDay
      const docRef = doc(
        FIREBASE_FIRESTORE,
        "Users",
        userId,
        "Services",
        "AczkjyWoOxdPAIRVxjy3",
        "WorkHours",
        workDay // date as document ID
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
      // console.log("Expected hours saved:", hours);
      setExpectedHours(tempExpectedHours);
      setTempExpectedHours(""); // clear temp value
      setDocExists(true);
      setGlobalDocId(docRef.id);
    } catch (error) {
      console.error("Error saving expected hours:", error);
      if (error instanceof Error) {
        console.error("Error message:", error.message);
      }
      // alert to inform the user about the error
      useAlertStore
        .getState()
        .showAlert(
          "Error",
          "During the saving process an error occurred. Please try again.",
          [{ text: "OK", style: "default" }]
        );
    }
    setSaving(false);
  };

  return (
    <>
      {/* DetailsScreen copilot tour step 2 */}
      <CopilotStep
        name="Daily Work-Hours"
        order={1}
        text="In this card you have to set the expected work hours for today and save them."
      >
        <CopilotWalktroughView
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
            Daily Work-Hours
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
              marginTop: 20,
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
              onChangeText={(text) => setTempExpectedHours(sanitizeHours(text))}
              style={{
                marginBottom: 15,
                width: screenWidth * 0.7, // dynamic with of 70%
                maxWidth: 400,
                borderColor: "aqua",
                borderWidth: 1.5,
                borderRadius: 12,
                paddingLeft: 15,
                paddingRight: 40,
                paddingBottom: 5,
                fontSize: 22,
                height: 50,
                color: "white",
                backgroundColor: "black",
              }}
            />
          </View>
          {/* Save button */}
          <TouchableOpacity
            onPress={handleSaveMinHours}
            style={{
              width: screenWidth * 0.7, // use 70% of the screen width
              maxWidth: 400,
              borderRadius: 12,
              overflow: "hidden",
              borderWidth: 2,
              borderColor: saving ? "lightgray" : "aqua",
              marginBottom: 30,
            }}
          >
            <LinearGradient
              colors={["#00f7f7", "#005757"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                paddingVertical: 6,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  fontFamily: "MPLUSLatin_Bold",
                  fontSize: 22,
                  color: saving ? "lightgray" : "white",
                  marginBottom: 5,
                  paddingRight: 10,
                }}
              >
                {saving ? "Saving..." : "Save"}
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
        </CopilotWalktroughView>
      </CopilotStep>
    </>
  );
};

export default WorkHoursInput;

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
import { useAccessibilityStore } from "../components/services/accessibility/accessibilityStore";
import { FirestoreWorkHoursSchema } from "../validation/firestoreSchemas";

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
  const {
    setDocExists,
    setCurrentDocId: setGlobalDocId,
    isWorking,
  } = WorkHoursState();

  // initialize the accessibility store
  const accessMode = useAccessibilityStore(
    (state) => state.accessibilityEnabled
  );
  // console.log("accessMode in LoginScreen:", accessMode);

  // screensize for dynamic size calculation
  const screenWidth = Dimensions.get("window").width;

  // hook to fetch the expected hours from Firestore by mount
  useEffect(() => {
    const fetchExpectedHours = async () => {
      try {
        const userId = getAuth().currentUser?.uid;
        if (!userId) {
          console.log("No user authenticated");
          return;
        }

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
          const parsed = FirestoreWorkHoursSchema.safeParse(data);

          if (parsed.success) {
            // validate the data with zod
            const validatedData = parsed.data;
            setExpectedHours(validatedData.expectedHours?.toString() || "0");
            setDocExists(true);
            setGlobalDocId(docRef.id);
          } else {
            // invalid data detected -> use default values
            console.error("Invalid Firestore document:", parsed.error);
            useAlertStore
              .getState()
              .showAlert(
                "Data Error",
                "Invalid work hours data detected. Using default values.",
                [{ text: "OK", style: "default" }]
              );
            // Fallback to default values
            setExpectedHours("0");
            setDocExists(false);
            setGlobalDocId(null);
          }
        } else {
          // doc does not exist -> use default values
          setExpectedHours("0");
          setDocExists(false);
          setGlobalDocId(null);
        }
      } catch (error) {
        console.error("Error fetching hours:", error);
        // show error alert
        useAlertStore
          .getState()
          .showAlert("Error", "Failed to load work hours. Please try again.", [
            { text: "OK", style: "default" },
          ]);
      }
    };

    fetchExpectedHours();
  }, []); // empty array enshures that this runs only once by mount

  // Healper function to recalculate and save the expected hours
  const recalcAndSaveForDay = async (
    docRef: any,
    duration: number,
    newExpected: number,
    existingData?: any
  ) => {
    // console.log("[DEBUG recalc] called with", {
    //   duration,
    //   newExpected,
    //   existingData,
    // });
    try {
      const previousExpected =
        existingData?.expectedHours !== undefined
          ? Number(existingData.expectedHours)
          : undefined;

      const newOver = Math.max(duration - newExpected, 0);
      const roundedOver = parseFloat(newOver.toFixed(2));
      const roundedDuration = parseFloat(duration.toFixed(2));

      // console.log("[DEBUG recalc] previousExpected:", previousExpected);
      // console.log(
      //   "[DEBUG recalc] newOver (raw):",
      //   newOver,
      //   "roundedOver:",
      //   roundedOver
      // );
      // console.log("[DEBUG recalc] roundedDuration:", roundedDuration);

      // build history entry (optional)- only if previousExpected is known
      const historyEntry =
        previousExpected !== undefined
          ? [
              {
                previousExpected,
                newExpected,
                changedAt: new Date().toISOString(),
              },
            ]
          : [];
      // console.log("[DEBUG recalc] historyEntry:", historyEntry);
      // Merge-Update, to prevent overwriting
      await setDoc(
        docRef,
        {
          expectedHours: newExpected,
          overHours: roundedOver,
          duration: roundedDuration,
          // Append history only if we have a previous value
          ...(historyEntry.length > 0 && {
            plannedHoursHistory: [
              ...(existingData?.plannedHoursHistory || []),
              ...historyEntry,
            ],
          }),
        },
        { merge: true }
      );
      const verifySnap = await getDoc(docRef);
      // console.log("[DEBUG recalc] verify doc:", {
      //   workDay: existingData?.workDay,
      //   id: docRef.id,
      //   data: verifySnap.data(),
      // });
    } catch (err) {
      console.error("recalcAndSaveForDay error:", err);
      throw err;
    }
  };

  // function to save the expected hours
  const [saving, setSaving] = useState(false);
  const handleSaveMinHours = async () => {
    const hours = parseFloat(tempExpectedHours);
    // console.log(
    //   "[DEBUG save] tempExpectedHours:",
    //   tempExpectedHours,
    //   "parsed:",
    //   hours
    // );
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

    setSaving(true);
    try {
      const userId = getAuth().currentUser?.uid;
      if (!userId) {
        console.error("User ID not available.");
        setSaving(false);
        return;
      }

      const workDay = dayjs().tz(userTimeZone).format("YYYY-MM-DD");
      // console.log("[DEBUG save] userId:", userId, "workDay:", workDay);
      const docRef = doc(
        FIREBASE_FIRESTORE,
        "Users",
        userId,
        "Services",
        "AczkjyWoOxdPAIRVxjy3",
        "WorkHours",
        workDay
      );

      // validate the user data with zod
      const dataToSave = {
        userId,
        expectedHours: hours,
        workDay,
      };
      const validation = FirestoreWorkHoursSchema.safeParse(dataToSave);
      if (!validation.success) {
        console.error("Data validation failed:", validation.error);
        useAlertStore
          .getState()
          .showAlert(
            "Validation Error",
            "Invalid data format. Please check your input.",
            [{ text: "OK", style: "default" }]
          );
        setSaving(false);
        return;
      }

      // get existing data
      const existingSnap = await getDoc(docRef);

      if (existingSnap.exists()) {
        const data = existingSnap.data();
        // console.log("[DEBUG save] existingSnap:", data);
        const prevExpected = Number(data.expectedHours) || 0;
        const duration = Number(data.duration) || 0;
        // console.log(
        //   "[DEBUG save] prevExpected:",
        //   prevExpected,
        //   "duration:",
        //   duration,
        //   "newHours:",
        //   hours
        // );

        // check if expected hours has changed
        if (prevExpected !== hours && duration > 0) {
          // console.log(
          //   "[DEBUG save] change requested on tracked day. isWorking =",
          //   isWorking
          // );
          // check if tracker is running
          const trackerRunning = isWorking;

          if (trackerRunning) {
            // Custom Alert: block change
            useAlertStore
              .getState()
              .showAlert(
                "Tracker is running",
                `You have already ${duration.toFixed(
                  2
                )}h tracked. While tracker is running, the expected hours can't be changed.`,
                [{ text: "OK", style: "default" }]
              );

            setSaving(false);
            return; // change is blocked
          } else {
            // Tracker is not runnig: Warning + Confirmation
            useAlertStore
              .getState()
              .showAlert(
                "Change Expected Hours",
                `You have already ${duration.toFixed(
                  2
                )}h tracked. If you change your expected hours from ${prevExpected}h to ${hours}h the Over -/Worked time will new calculated. Tracked time will not be changed. Continue?`,
                [
                  {
                    text: "Delete",
                    style: "cancel",
                    onPress: () => {
                      setSaving(false);
                    },
                  },
                  {
                    text: "Continue",
                    style: "destructive",
                    onPress: async () => {
                      setSaving(true);
                      try {
                        // validate the user data with zod
                        const recalcData = {
                          ...data,
                          expectedHours: hours,
                          workDay,
                          userId,
                        };

                        const recalcValidation =
                          FirestoreWorkHoursSchema.safeParse(recalcData);
                        if (!recalcValidation.success) {
                          console.error(
                            "Recalc data validation failed:",
                            recalcValidation.error
                          );
                          useAlertStore
                            .getState()
                            .showAlert(
                              "Validation Error",
                              "Invalid data for recalculation.",
                              [{ text: "OK", style: "default" }]
                            );
                          return;
                        }

                        await recalcAndSaveForDay(
                          docRef,
                          duration,
                          hours,
                          recalcValidation.data
                        );
                        setCurrentDocId(docRef.id);
                        setExpectedHours(hours.toString());
                        setTempExpectedHours("");
                        setDocExists(true);
                        setGlobalDocId(docRef.id);
                      } catch (err) {
                        useAlertStore
                          .getState()
                          .showAlert(
                            "Error",
                            "Error by update the data. Please try again.",
                            [{ text: "OK", style: "default" }]
                          );
                        console.error(err);
                      } finally {
                        setSaving(false);
                      }
                    },
                  },
                ]
              );

            return; // Important: return setSaving(false) here, because onPress is async
          }
        }
      }

      // No conflict: write (merge) expected hours
      await setDoc(docRef, validation.data, { merge: true });

      // If duration already exists (e. g. resume), recalculate once (no race)
      const finalSnap = await getDoc(docRef);
      const finalData = finalSnap.exists() ? finalSnap.data() : {};
      const durationFinal = Number(finalData.duration) || 0;
      if (durationFinal > 0) {
        // validate the user data with zod for the final update
        const finalDataToValidate = {
          ...finalData,
          expectedHours: hours,
          workDay,
          userId,
        };

        const finalValidation =
          FirestoreWorkHoursSchema.safeParse(finalDataToValidate);
        if (finalValidation.success) {
          await recalcAndSaveForDay(
            docRef,
            durationFinal,
            hours,
            finalValidation.data
          );
        }
      }
      // Simple unique update - UI-local states
      setCurrentDocId(docRef.id);
      setExpectedHours?.(hours.toString());
      setTempExpectedHours("");
      setDocExists(true);
      setGlobalDocId(docRef.id);
    } catch (error) {
      console.error("Error saving expected hours:", error);
      useAlertStore
        .getState()
        .showAlert(
          "Error",
          "During the saving process an error occurred. Please try again.",
          [{ text: "OK", style: "default" }]
        );
    } finally {
      setSaving(false);
    }
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
            accessibilityRole="header"
            accessible={true}
            accessibilityLabel="Daily Work Hours"
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
            accessible={true}
            accessibilityLabel={
              accessMode ? "Enter your hours" : "Add your minimum working hours"
            }
            numberOfLines={1}
            adjustsFontSizeToFit
            style={{
              fontSize: accessMode ? 20 : 18,
              fontFamily: accessMode
                ? "MPLUSLatin_Bold"
                : "MPLUSLatin_ExtraLight",
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
              accessible={true}
              accessibilityLabel="Input expected working hours. Example: 8"
              accessibilityHint="Enter the number of hours you plan to work today"
              placeholder="(e.g. 8)"
              placeholderTextColor={accessMode ? "white" : "grey"}
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
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={saving ? "Saving" : "Save expected work hours"}
            accessibilityHint="Saves the entered daily work hours"
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
                height: 45,
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
            accessible={true}
            accessibilityLabel={`Your expected work hours are ${
              expectedHours || "not set"
            }`}
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
                  color: accessMode ? "white" : "grey",
                  fontSize: 16,
                  fontFamily: "MPLUSLatin_Bold",
                }}
              >
                Your expected WorkHours:{" "}
              </Text>
              {expectedHours || "- - -"}
            </Text>
          </View>
        </CopilotWalktroughView>
      </CopilotStep>
    </>
  );
};

export default WorkHoursInput;

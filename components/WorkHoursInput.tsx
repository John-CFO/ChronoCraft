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
import { useTranslation } from "react-i18next";

import { FIREBASE_FIRESTORE } from "../firebaseConfig";
import { useService } from "../components/contexts/ServiceContext";
import dayjs from "../dayjsConfig";
import WorkHoursState from "../components/WorkHoursState";
import { useAlertStore } from "./services/customAlert/alertStore";
import { sanitizeHours } from "./InputSanitizers";
import { useDotAnimation } from "../components/DotAnimation";
import { useAccessibilityStore } from "../components/services/accessibility/accessibilityStore";
import { logError } from "../lib/loggerClient";

//////////////////////////////////////////////////////////////////////////////////

// modified walkthroughable for copilot tour
const CopilotWalktroughView = walkthroughable(View);

const WorkHoursInput = () => {
  // useTranslation hook to access translations
  const { t } = useTranslation();

  // state to handle the dot animation
  const [loading, setLoading] = useState(true);

  // define the dot animation with a delay
  const dots = useDotAnimation(loading, 700);

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
    (state) => state.accessibilityEnabled,
  );

  // screensize for dynamic size calculation
  const screenWidth = Dimensions.get("window").width;

  // declare useService hook
  const { serviceId } = useService();

  // hook to fetch the expected hours from Firestore by mount
  useEffect(() => {
    const fetchExpectedHours = async () => {
      try {
        if (!serviceId) return;
        const userId = getAuth().currentUser?.uid;
        if (!userId) {
          logError(
            "WorkHoursInput.handleSaveMinHours",
            new Error("User ID not available"),
          );

          return;
        }

        const tz = dayjs.tz.guess();
        const workDay = dayjs().tz(tz).format("YYYY-MM-DD");
        const docRef = doc(
          FIREBASE_FIRESTORE,
          "Users",
          userId,
          "Services",
          serviceId,
          "WorkHours",
          workDay,
        );

        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();

          // check if expectedHours exists
          const expectedHours = Number(data?.expectedHours) || 0;

          setExpectedHours(expectedHours.toString());
          setDocExists(true);
          setGlobalDocId(docRef.id);
        } else {
          // doc does not exist -> use default values
          setExpectedHours("0");
          setDocExists(false);
          setGlobalDocId(null);
        }
      } catch (error) {
        logError("WorkHoursInput.fetchExpectedHours", error);
        useAlertStore
          .getState()
          .showAlert(
            t("workHoursInput.error"),
            t("workHoursInput.fetchExpectedHoursError"),
            [{ text: t("workHoursInput.ok"), style: "default" }],
          );
      }
    };

    fetchExpectedHours();
  }, []); // empty array enshures that this runs only once by mount

  // Healper function to recalculate and save the expected hours
  const recalcAndSaveForDay = async (
    docRef: any,
    duration: number,
    newExpected: number,
    existingData?: any,
  ) => {
    try {
      const previousExpected =
        existingData?.expectedHours !== undefined
          ? Number(existingData.expectedHours)
          : undefined;

      const newOver = Math.max(duration - newExpected, 0);
      const roundedOver = parseFloat(newOver.toFixed(2));
      const roundedDuration = parseFloat(duration.toFixed(2));

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
        { merge: true },
      );
    } catch (err) {
      logError("WorkHoursInput.recalcAndSaveForDay", err);
      throw err;
    }
  };

  // helper function to parse hours to HH:MM
  const formatHoursToHHMM = (hours: number) => {
    const totalMinutes = Math.round(hours * 60);
    const hh = Math.floor(totalMinutes / 60);
    const mm = totalMinutes % 60;

    return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
  };

  // function to save the expected hours
  const [saving, setSaving] = useState(false);
  const handleSaveMinHours = async () => {
    if (!serviceId) return;
    const hours = parseFloat(tempExpectedHours);
    if (!tempExpectedHours || isNaN(hours) || hours <= 0) {
      useAlertStore
        .getState()
        .showAlert(
          t("workHoursInput.invalidInput"),
          t("workHoursInput.invalidHours"),
          [{ text: t("workHoursInput.ok"), style: "default" }],
        );
      return;
    }

    setSaving(true);
    try {
      const userId = getAuth().currentUser?.uid;
      if (!userId) {
        logError(
          "WorkHoursInput.handleSaveMinHours",
          t("workHoursInput.userIdUnavailable"),
        );
        setSaving(false);
        return;
      }

      const workDay = dayjs().tz(userTimeZone).format("YYYY-MM-DD");
      const docRef = doc(
        FIREBASE_FIRESTORE,
        "Users",
        userId,
        "Services",
        serviceId,
        "WorkHours",
        workDay,
      );

      const existingSnap = await getDoc(docRef);
      const existingData = existingSnap.exists() ? existingSnap.data() : {};
      const prevExpected = Number(existingData.expectedHours) || 0;
      const duration = Number(existingData.duration) || 0;

      const displayDuration = formatHoursToHHMM(duration);

      if (prevExpected !== hours && duration > 0) {
        if (isWorking) {
          useAlertStore.getState().showAlert(
            t("workHoursInput.trackerRunning"),
            t("workHoursInput.expectedHoursChangeWhileTracking", {
              duration: displayDuration,
            }),
            [{ text: t("workHoursInput.ok"), style: "default" }],
          );
          setSaving(false);
          return;
        }

        // Confirmation when user needs to change expected hours
        useAlertStore.getState().showAlert(
          t("workHoursInput.changeExpectedHours"),
          t("workHoursInput.changeExpectedHoursDescription", {
            duration: displayDuration,
          }),
          [
            {
              text: t("workHoursInput.cancel"),
              style: "cancel",
              onPress: () => setSaving(false),
            },
            {
              text: t("workHoursInput.continue"),
              style: "destructive",
              onPress: async () => {
                try {
                  await recalcAndSaveForDay(docRef, duration, hours, {
                    ...existingData,
                    expectedHours: hours,
                    workDay,
                    userId,
                  });
                  setCurrentDocId(docRef.id);
                  setExpectedHours(hours.toString());
                  setTempExpectedHours("");
                  setDocExists(true);
                  setGlobalDocId(docRef.id);
                } catch (err) {
                  console.error(err);
                  useAlertStore
                    .getState()
                    .showAlert(
                      t("workHoursInput.error"),
                      t("workHoursInput.updateError"),
                      [{ text: t("workHoursInput.ok"), style: "default" }],
                    );
                } finally {
                  setSaving(false);
                }
              },
            },
          ],
        );
        return; // Important: exit here because onPress is async
      }

      // Save normally (no conflict)
      await setDoc(
        docRef,
        { ...existingData, expectedHours: hours, workDay, userId },
        { merge: true },
      );
      setCurrentDocId(docRef.id);
      setExpectedHours(hours.toString());
      setTempExpectedHours("");
      setDocExists(true);
      setGlobalDocId(docRef.id);
    } catch (error) {
      logError("WorkHoursInput.handleSaveMinHours", error);
      useAlertStore
        .getState()
        .showAlert(t("workHoursInput.error"), t("workHoursInput.saveError"), [
          { text: t("workHoursInput.ok"), style: "default" },
        ]);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {/* Worktime-Tracker Screen copilot tour step 2 */}
      <CopilotStep
        name={t("workHoursInput.copilotName")}
        order={1}
        text={t("workHoursInput.copilotDescription")}
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
            {t("workHoursInput.title")}
          </Text>

          <Text
            accessible={true}
            accessibilityLabel={t(
              accessMode
                ? "workHoursInput.accessibilityEnterHours"
                : "workHoursInput.accessibilityAddMinimumHours",
            )}
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
            {t("workHoursInput.subtitle")}
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
              accessibilityLabel={t("workHoursInput.inputAccessibilityLabel")}
              accessibilityHint={t("workHoursInput.inputAccessibilityHint")}
              placeholder={t("workHoursInput.inputPlaceholder")}
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
            accessibilityLabel={t(
              saving
                ? "workHoursInput.saving"
                : "workHoursInput.saveExpectedWorkHours",
            )}
            accessibilityHint={t("workHoursInput.saveAccessibilityHint")}
            onPress={handleSaveMinHours}
            style={{
              width: screenWidth * 0.7,
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
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <View
                style={{
                  height: 50,
                  width: 200,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                {saving ? (
                  // animated saving dots
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text
                      // adjust font rendering (if a translation is too long)
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.8}
                      style={{
                        marginBottom: 5,
                        fontFamily: "MPLUSLatin_Bold",
                        fontSize: 22,
                        color: "lightgray",
                        width: 120,
                        textAlign: "right",
                      }}
                    >
                      {t("workHoursInput.saving")}
                    </Text>
                    <Text
                      style={{
                        marginBottom: 5,
                        fontFamily: "MPLUSLatin_Bold",
                        fontSize: 22,
                        color: "lightgray",
                        width: 40,
                        textAlign: "left",
                      }}
                    >
                      {dots}
                    </Text>
                  </View>
                ) : (
                  // regular save button
                  <Text
                    style={{
                      marginBottom: 5,
                      fontFamily: "MPLUSLatin_Bold",
                      fontSize: 22,
                      color: "white",
                      textAlign: "center",
                    }}
                  >
                    {t("workHoursInput.save")}
                  </Text>
                )}
              </View>
            </LinearGradient>
          </TouchableOpacity>
          {/* Hourly Rate info container */}
          <View
            accessible={true}
            accessibilityLabel={t("workHoursInput.expectedHoursAccessibility", {
              hours: expectedHours || t("workHoursInput.notSet"),
            })}
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
                {t("workHoursInput.expectedWorkHours")}
              </Text>
              {"  "}
              {expectedHours || "- - -"}
            </Text>
          </View>
        </CopilotWalktroughView>
      </CopilotStep>
    </>
  );
};

export default WorkHoursInput;

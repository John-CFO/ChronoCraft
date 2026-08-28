///////////////////////////////////////VacationForm Component////////////////////////////////////////

// This component is used to show the vacation form
// The user can select a start and end date and save the vacation to Firestore

/////////////////////////////////////////////////////////////////////////////////////////////////////

import React, { useState, useEffect } from "react";
import {
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { FontAwesome } from "@expo/vector-icons";
import { serverTimestamp, collection, addDoc } from "firebase/firestore";
import { CopilotStep, walkthroughable } from "react-native-copilot";
import { useTranslation } from "react-i18next";

import { FIREBASE_AUTH, FIREBASE_FIRESTORE } from "../firebaseConfig";
import { useCalendarStore } from "../components/CalendarState";
import { useService } from "../components/contexts/ServiceContext";
import { useAlertStore } from "./services/customAlert/alertStore";
import { VacationInputSchema } from "../validation/vacationSchemas";
import { logError } from "../lib/loggerClient";

/////////////////////////////////////////////////////////////////////////////////////////////////////

// modified walkthroughable for copilot tour
const CopilotTouchableView = walkthroughable(View);

const VacationForm = () => {
  // useTranslation hook to access translations
  const { t } = useTranslation();

  // declare serviceId
  const { serviceId } = useService();

  // initial start and end dates states
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // states to open the date pickers and show the selected dates
  const [tempStartDate, setTempStartDate] = useState<string | null>(null);
  const [tempEndDate, setTempEndDate] = useState<string | null>(null);

  // globale CalendarState
  const { markedDates, resetMarkedDates, handleSelect, handleCancel } =
    useCalendarStore();

  // isSaving state for the loading indicator
  const [isSaving, setIsSaving] = useState(false);

  // function to save vacation data to Firestore
  const handleSaveVacation = async () => {
    setIsSaving(true);

    try {
      if (!serviceId) return;
      // check if user is logged in
      const user = FIREBASE_AUTH.currentUser;
      if (!user) {
        logError("VacationForm.handleSaveVacation", "No user logged in");
        return;
      }
      // reduce markedDates to remove `customStyles` property (unchanged)
      const filteredMarkedDates = Object.keys(markedDates).reduce(
        (acc, date) => {
          const { customStyles, ...rest } = (markedDates as any)[date];
          acc[date] = rest; // delete `customStyles` property
          return acc;
        },
        {} as Record<string, any>,
      );

      // derive startDate defensively (first sorted key)
      const startDate = Object.keys(filteredMarkedDates).sort()[0];

      const input = {
        uid: user.uid,
        startDate,
        markedDates: filteredMarkedDates,
      };
      // validate input with zod
      const parsed = VacationInputSchema.safeParse(input);
      if (!parsed.success) {
        logError(
          "VacationForm.handleSaveVacation.validation",
          parsed.error.issues,
        );
        useAlertStore
          .getState()
          .showAlert(
            t("vacationForm.invalidInput"),
            t("vacationForm.invalidData"),
            [{ text: t("vacationForm.ok") }],
          );
        return;
      }

      // All good => write to Firestore (createdAt serverTimestamp)
      const vacationsCollection = collection(
        FIREBASE_FIRESTORE,
        "Users",
        user.uid,
        "Services",
        serviceId,
        "Vacations",
      );

      await addDoc(vacationsCollection, {
        uid: user.uid,
        startDate: parsed.data.startDate,
        markedDates: parsed.data.markedDates,
        createdAt: serverTimestamp(),
      });

      resetMarkedDates(); // reset marked dates after saving
      setStartDate("");
      setEndDate("");
    } catch (error) {
      logError("VacationForm.handleSaveVacation", error);
      useAlertStore
        .getState()
        .showAlert(t("vacationForm.error"), t("vacationForm.saveFailed"), [
          { text: t("vacationForm.ok") },
        ]);
    } finally {
      setIsSaving(false);
    }
  };

  // save function with error handling for the button
  const handleSave = async () => {
    if (!markedDates || Object.keys(markedDates).length === 0) {
      useAlertStore
        .getState()
        .showAlert(
          t("vacationForm.attention"),
          t("vacationForm.selectVacationDateFirst"),
          [{ text: t("vacationForm.ok") }],
        );
      return;
    }
    await handleSaveVacation();
  };

  // cancel function
  const handleFormCancel = () => {
    handleCancel();
    setStartDate("");
    setEndDate("");
  };

  // hook to render the selected dates and clear the form after selection
  useEffect(() => {
    if (startDate && endDate) {
      handleSelect(startDate, endDate);
      // setStartDate("");
      // setEndDate("");
    }
  }, [startDate, endDate]);

  // hook to clear the form after leaving the VacationScreen
  useEffect(() => {
    return () => {
      //console.log("Cleaning up VacationForm state...");
      setTempStartDate(null);
      setTempEndDate(null);
    };
  }, []);

  return (
    <ScrollView>
      {/* VacationScreen copilot tour step 2 */}
      <CopilotStep
        name={t("vacationForm.copilot.name")}
        order={2}
        text={t("vacationForm.copilot.text")}
      >
        <CopilotTouchableView>
          {/* Container with relativer Position for the ActivityIndicator */}
          <View style={{ position: "relative" }}>
            <View
              style={{
                paddingTop: 15,
                paddingHorizontal: 10,
                alignItems: "center",
                borderTopColor: "grey",
                borderWidth: 0.5,
                backgroundColor: "#000",
                width: "100%",
                justifyContent: "center",
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                {/* Start Date and End Date Buttons */}
                <TouchableOpacity
                  accessibilityLabel={
                    startDate
                      ? t("vacationForm.startDateSelected", { date: startDate })
                      : t("vacationForm.startDateNotSelected")
                  }
                  accessible={true}
                  // validate start date
                  onPress={() => {
                    if (!tempStartDate) {
                      setTempStartDate(new Date().toISOString().split("T")[0]);
                    }
                  }}
                  style={{
                    margin: 5,
                    backgroundColor: "#191919",
                    width: 160,
                    height: 50,
                    borderWidth: 1,
                    borderColor: "aqua",
                    borderRadius: 8,
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    {/* form icon for start date */}
                    <MaterialCommunityIcons
                      name="calendar-text"
                      size={32}
                      color="grey"
                    />
                    {/* start date value */}
                    <Text
                      style={{
                        fontSize: 18,
                        fontWeight: "bold",
                        color: "white",
                      }}
                    >
                      {startDate || "—"}
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* End Date Button */}
                <TouchableOpacity
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel={
                    endDate
                      ? t("vacationForm.endDateSelected", { date: endDate })
                      : t("vacationForm.selectEndDate")
                  }
                  onPress={() => {
                    // condition to prevent selecting an end date before a start date with an alert
                    if (!startDate) {
                      useAlertStore
                        .getState()
                        .showAlert(
                          t("vacationForm.sorry"),
                          t("vacationForm.selectStartDateFirst"),
                          [
                            {
                              text: t("vacationForm.ok"),
                            },
                          ],
                        );
                      return;
                    }

                    setTempEndDate(new Date().toISOString().split("T")[0]);
                  }}
                  style={{
                    margin: 5,
                    backgroundColor: "#191919",
                    width: 160,
                    height: 50,
                    borderWidth: 1,
                    borderColor: "aqua",
                    borderRadius: 8,
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    {/* form icon for end date */}
                    <FontAwesome
                      name="arrow-circle-right"
                      size={32}
                      color="grey"
                    />
                    {/* end date value */}
                    <Text
                      style={{
                        fontSize: 18,
                        fontWeight: "bold",
                        color: "white",
                      }}
                    >
                      {endDate || "—"}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
            {/* Date Picker Modals */}
            {tempStartDate !== null && (
              <DateTimePicker
                value={tempStartDate ? new Date(tempStartDate) : new Date()}
                minimumDate={new Date()}
                mode="date"
                display="spinner"
                themeVariant="dark" // IOS only
                accentColor="aqua" //IOS only
                textColor="white" //IOS only
                onChange={(event, selectedDate) => {
                  // condition to delete value if user pressed cancel
                  if (event.type === "dismissed") {
                    setTempStartDate(null);
                    return;
                  }
                  //condition to add the selected date
                  if (selectedDate) {
                    setTempStartDate(null); // delete the temporary display
                    setStartDate(selectedDate.toISOString().split("T")[0]);
                  }
                }}
              />
            )}
            {tempEndDate !== null && (
              <DateTimePicker
                value={tempEndDate ? new Date(tempEndDate) : new Date()}
                minimumDate={new Date()}
                mode="date"
                display="spinner"
                themeVariant="dark" // IOS only
                accentColor="aqua" //IOS only
                textColor="white" //IOS only
                onChange={(event, selectedDate) => {
                  // condition to delete value if user pressed cancel

                  if (event.type === "dismissed") {
                    setTempEndDate(null);
                    return;
                  }
                  //condition to add the selected date
                  if (selectedDate) {
                    setTempEndDate(null); // delete the temporary display
                    setEndDate(selectedDate.toISOString().split("T")[0]);
                  }
                }}
              />
            )}
            <View
              style={{
                width: "100%",
                paddingHorizontal: 10,
                paddingVertical: 10,
                flexDirection: "row",
                justifyContent: "center",
                alignItems: "center",
                gap: 10,
                borderBottomColor: "grey",
                borderWidth: 0.5,
                backgroundColor: "#000",
              }}
            >
              {/* Save Button */}
              <TouchableOpacity
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel={t("vacationForm.saveVacationDates")}
                onPress={handleSave}
                activeOpacity={0.7}
                style={{
                  height: 50,
                  width: 160,
                  borderRadius: 12,
                  borderWidth: 1.5,
                  borderColor: "aqua",
                  backgroundColor: "transparent",
                  shadowColor: "black",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.3,
                  shadowRadius: 3,
                  elevation: 5,
                }}
              >
                <LinearGradient
                  colors={["#00f7f7", "#005757"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    flex: 1,
                    justifyContent: "center",
                    alignItems: "center",
                    borderRadius: 10,
                  }}
                >
                  <Text
                    style={{
                      color: "white",
                      fontSize: 22,
                      fontFamily: "MPLUSLatin_Bold",
                    }}
                  >
                    {t("vacationForm.save")}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>

              {/* Cancel Button */}
              <TouchableOpacity
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel={t("vacationForm.cancelVacationSelection")}
                onPress={handleFormCancel}
                activeOpacity={0.7}
                style={{
                  height: 50,
                  width: 160,
                  borderRadius: 12,
                  borderWidth: 1.5,
                  borderColor: "aqua",
                  backgroundColor: "transparent",
                  shadowColor: "black",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.3,
                  shadowRadius: 3,
                  elevation: 5,
                }}
              >
                <LinearGradient
                  colors={["#00f7f7", "#005757"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    flex: 1,
                    justifyContent: "center",
                    alignItems: "center",
                    borderRadius: 10,
                  }}
                >
                  <Text
                    style={{
                      color: "white",
                      fontSize: 22,
                      fontFamily: "MPLUSLatin_Bold",
                    }}
                  >
                    {t("vacationForm.cancel")}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
            {/* Overlay ActivityIndicator */}
            {isSaving && (
              <View
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: "rgba(0,0,0,0.5)",
                  justifyContent: "center",
                  alignItems: "center",
                  zIndex: 10,
                }}
              >
                <ActivityIndicator size="large" color="white" />
              </View>
            )}
          </View>
        </CopilotTouchableView>
      </CopilotStep>
    </ScrollView>
  );
};

export default VacationForm;

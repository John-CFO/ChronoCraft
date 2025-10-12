///////////////////////////////////////VacationForm Component////////////////////////////////////////

// This component is used to show the vacation form
// The user can select a start and end date and save the vacation to Firestore

/////////////////////////////////////////////////////////////////////////////////////////////////////

import React, { useState, useEffect } from "react";
import { Text, View, ScrollView, TouchableOpacity } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { FontAwesome } from "@expo/vector-icons";
import { serverTimestamp, collection, addDoc } from "firebase/firestore";
import { CopilotStep, walkthroughable } from "react-native-copilot";

import { FIREBASE_AUTH, FIREBASE_FIRESTORE } from "../firebaseConfig";
import { useCalendarStore } from "../components/CalendarState";
import { useAlertStore } from "./services/customAlert/alertStore";
import { VacationInputSchema } from "../validation/vacationSchemas.sec";

/////////////////////////////////////////////////////////////////////////////////////////////////////

// modified walkthroughable for copilot tour
const CopilotTouchableView = walkthroughable(View);

const VacationForm = () => {
  // initial start and end dates states
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // states to open the date pickers and show the selected dates
  const [tempStartDate, setTempStartDate] = useState<string | null>(null);
  const [tempEndDate, setTempEndDate] = useState<string | null>(null);

  // globale CalendarState
  const { markedDates, resetMarkedDates, handleSelect, handleCancel } =
    useCalendarStore();
  //console.log("Marked dates in store:", markedDates);

  // function to save vacation data to Firestore
  const handleSaveVacation = async () => {
    try {
      // check if user is logged in
      const user = FIREBASE_AUTH.currentUser;
      if (!user) {
        console.error("No user logged in");
        return;
      }
      // reduce markedDates to remove `customStyles` property (unchanged)
      const filteredMarkedDates = Object.keys(markedDates).reduce(
        (acc, date) => {
          const { customStyles, ...rest } = (markedDates as any)[date];
          acc[date] = rest; // delete `customStyles` property
          return acc;
        },
        {} as Record<string, any>
      );

      // derive startDate defensively (first sorted key)
      const startDate = Object.keys(filteredMarkedDates).sort()[0];

      const input = {
        startDate,
        markedDates: filteredMarkedDates,
      };
      // validate input with zod
      const parsed = VacationInputSchema.safeParse(input);
      if (!parsed.success) {
        console.error(
          "Vacation input validation failed:",
          parsed.error.format()
        );
        useAlertStore
          .getState()
          .showAlert(
            "Invalid Input",
            "Vacation data is invalid. Please retry.",
            [{ text: "OK" }]
          );
        return;
      }

      // All good => write to Firestore (createdAt serverTimestamp)
      const vacationsCollection = collection(
        FIREBASE_FIRESTORE,
        "Users",
        user.uid,
        "Services",
        "AczkjyWoOxdPAIRVxjy3",
        "Vacations"
      );

      await addDoc(vacationsCollection, {
        uid: user.uid,
        startDate: parsed.data.startDate,
        markedDates: parsed.data.markedDates,
        createdAt: serverTimestamp(),
      });

      resetMarkedDates(); // reset marked dates after saving
    } catch (error) {
      console.error("Error saving vacation:", error);
      useAlertStore
        .getState()
        .showAlert("Error", "Saving vacation failed.", [{ text: "OK" }]);
    }
  };

  // save function with error handling for the button
  const handleSave = async () => {
    if (!markedDates || Object.keys(markedDates).length === 0) {
      // console.error("No data to save in markedDates");
      useAlertStore
        .getState()
        .showAlert("Attention!", "First vote a vacation date.", [
          { text: "OK" },
        ]);
      return;
    }
    await handleSaveVacation();
  };

  // hook to render the selected dates and clear the form after selection
  useEffect(() => {
    if (startDate && endDate) {
      handleSelect(startDate, endDate);
      setStartDate("");
      setEndDate("");
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
        name="Select-Form"
        order={2}
        text="Select the start and end dates of your vacation. You can then save the date in the calendar or cancel it. Saving the date will add it to the Booked Vacation card."
      >
        <CopilotTouchableView>
          <View
            style={{
              paddingTop: 15,
              alignItems: "center",
              borderTopColor: "grey",
              borderWidth: 0.5,
              backgroundColor: "black",
              width: "100%",
              height: 80,
              justifyContent: "center",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 25,
              }}
            >
              {/* Start Date and End Date Buttons */}
              <TouchableOpacity
                accessibilityLabel={
                  startDate
                    ? `Start date: ${startDate}`
                    : "Start Date not selected"
                }
                accessible={false}
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
                    position: "relative",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    paddingRight: 20,
                    width: "100%",
                  }}
                >
                  {/* form icon for start date */}
                  <MaterialCommunityIcons
                    name="calendar-text"
                    size={40}
                    color="grey"
                    style={{
                      position: "absolute",
                      left: 5,
                    }}
                  />
                  {/* start date value */}
                  <Text
                    style={{
                      textAlign: "center",
                      fontSize: 18,
                      fontWeight: "bold",
                      color: "white",
                      left: 10,
                    }}
                  >
                    {startDate || "Start Date"}
                  </Text>
                </View>
              </TouchableOpacity>
              {/* End Date Button */}
              <TouchableOpacity
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel={
                  endDate ? `End date selected: ${endDate}` : "Select end date"
                }
                onPress={() => {
                  // condition to prevent selecting an end date before a start date with an alert
                  if (!startDate) {
                    useAlertStore
                      .getState()
                      .showAlert("Sorry", "Please select a start date first.", [
                        {
                          text: "OK",
                        },
                      ]);
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
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    position: "relative",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    paddingRight: 20,
                    width: "100%",
                  }}
                >
                  {/* form icon for end date */}
                  <FontAwesome
                    name="arrow-circle-right"
                    size={40}
                    color="grey"
                    style={{
                      position: "absolute",
                      left: 5,
                    }}
                  />
                  {/* end date value */}
                  <Text
                    style={{
                      textAlign: "center",
                      fontSize: 18,
                      fontWeight: "bold",
                      color: "white",
                      left: 10,
                    }}
                  >
                    {endDate || "End Date"}
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
                //console.log("DatePicker event type:", event.type);
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
                //console.log("DatePicker event type:", event.type);
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
              height: 80,
              flexDirection: "row",
              justifyContent: "space-around",
              paddingHorizontal: 70,
              alignItems: "center",
              borderBottomColor: "grey",
              borderWidth: 0.5,
              backgroundColor: "black",
              gap: 20,
            }}
          >
            {/* Save Button */}
            <TouchableOpacity
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Save vacation dates"
              onPress={handleSave}
              activeOpacity={0.7}
              style={{
                height: 45,
                width: 120,
                borderRadius: 14,
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
                  borderRadius: 12,
                }}
              >
                <Text
                  style={{
                    color: "white",
                    fontSize: 22,
                    fontFamily: "MPLUSLatin_Bold",
                  }}
                >
                  Save
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Cancel Button */}
            <TouchableOpacity
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Cancel vacation date selection"
              onPress={handleCancel}
              activeOpacity={0.7}
              style={{
                height: 45,
                width: 120,
                borderRadius: 14,
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
                  borderRadius: 12,
                }}
              >
                <Text
                  style={{
                    color: "white",
                    fontSize: 22,
                    fontFamily: "MPLUSLatin_Bold",
                  }}
                >
                  Cancel
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </CopilotTouchableView>
      </CopilotStep>
    </ScrollView>
  );
};

export default VacationForm;

///////////////////////////////////////VacationForm Component////////////////////////////////////////

// This component is used to show the vacation form
// The user can select a start and end date and save the vacation to Firestore

/////////////////////////////////////////////////////////////////////////////////////////////////////

import React, { useState, useEffect } from "react";
import { Text, View, ScrollView, TouchableOpacity, Alert } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { FontAwesome } from "@expo/vector-icons";
import { serverTimestamp, collection, addDoc } from "firebase/firestore";

import { FIREBASE_AUTH, FIREBASE_FIRESTORE } from "../firebaseConfig";
import { useCalendarStore } from "../components/CalendarState";

/////////////////////////////////////////////////////////////////////////////////////////////////////

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

      // reduce markedDates to remove `customStyles` property
      const filteredMarkedDates = Object.keys(markedDates).reduce(
        (acc, date) => {
          const { customStyles, ...rest } = markedDates[date];
          acc[date] = rest; // delete `customStyles` property
          return acc;
        },
        {} as { [key: string]: any }
      );

      const vacationsCollection = collection(
        FIREBASE_FIRESTORE,
        "Users",
        user.uid,
        "Services",
        "AczkjyWoOxdPAIRVxjy3",
        "Vacations"
      );

      // conducted by sorting the keys of `markedDates`
      const startDate = Object.keys(filteredMarkedDates).sort()[0];

      // create new document in `Vacations` collection
      await addDoc(vacationsCollection, {
        uid: user.uid,
        startDate: startDate,
        markedDates: filteredMarkedDates,
        createdAt: serverTimestamp(),
      });

      resetMarkedDates(); // reset marked dates after saving
    } catch (error) {
      console.error("Error saving vacation:", error);
    }
  };

  // save function with error handling for the button
  const handleSave = async () => {
    if (Object.keys(markedDates).length === 0) {
      console.error("No data to save in markedDates");
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
      <View
        style={{
          paddingTop: 15,
          alignItems: "center",
          borderTopColor: "grey",
          borderWidth: 0.5,
          backgroundColor: "black",
          width: "100%",
          height: 80,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 25,
          }}
        >
          {/*  Start Date and End Date Buttons  */}
          <TouchableOpacity
            // validate start date
            onPress={() => {
              if (!tempStartDate) {
                setTempStartDate(new Date().toISOString().split("T")[0]);
              }
            }}
            style={{
              margin: 5,
              backgroundColor: "#191919",
              width: 180,
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
              <MaterialCommunityIcons
                name="calendar-text"
                size={40}
                color="grey"
                style={{
                  position: "absolute",
                  left: 5,
                }}
              />

              <Text
                style={{
                  textAlign: "center",
                  fontSize: 18,
                  fontWeight: "bold",
                  color: "white",
                }}
              >
                {startDate || "Start Date"}
              </Text>
            </View>
          </TouchableOpacity>

          {/* End Date Button */}
          <TouchableOpacity
            onPress={() => {
              // condition to prevent selecting an end date before a start date with an alert
              if (!startDate) {
                Alert.alert("Sorry", "Please select a start date first.", [
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
              width: 180,
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
              <FontAwesome
                name="arrow-circle-right"
                size={40}
                color="grey"
                style={{
                  position: "absolute",
                  left: 5,
                }}
              />

              <Text
                style={{
                  textAlign: "center",
                  fontSize: 18,
                  fontWeight: "bold",
                  color: "white",
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
        }}
      >
        {/* Save Button */}
        <TouchableOpacity
          style={{
            height: 45,
            width: 120,
            borderRadius: 8,
            borderWidth: 3,
            borderColor: "white",
            overflow: "hidden",
          }}
          onPress={handleSave}
        >
          <LinearGradient
            colors={["#00FFFF", "#FFFFFF"]}
            style={{
              alignItems: "center",
              justifyContent: "center",
              height: 45,
              width: 120,
            }}
          >
            <Text
              style={{
                color: "grey",
                fontSize: 18,
                fontFamily: "MPLUSLatin_Bold",
                marginBottom: 11,
                marginRight: 9,
              }}
            >
              Save
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Cancel Button */}
        <TouchableOpacity
          style={{
            height: 45,
            width: 120,
            borderRadius: 8,
            borderWidth: 3,
            borderColor: "white",
            overflow: "hidden",
          }}
          onPress={handleCancel}
        >
          <LinearGradient
            colors={["#00FFFF", "#FFFFFF"]}
            style={{
              alignItems: "center",
              justifyContent: "center",
              height: 45,
              width: 120,
            }}
          >
            <Text
              style={{
                color: "grey",
                fontSize: 18,
                fontFamily: "MPLUSLatin_Bold",
                marginBottom: 11,
                marginRight: 9,
              }}
            >
              Cancel
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

export default VacationForm;

///////////////////////////////////////VacationForm Component////////////////////////////////////////

//NOTE - Todo: change TextInpot to TextInput.Mask

import {
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from "react-native";
import React, { useState } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { FontAwesome } from "@expo/vector-icons";
import { FIREBASE_AUTH, FIREBASE_FIRESTORE } from "../firebaseConfig";
import {
  doc,
  setDoc,
  serverTimestamp,
  collection,
  addDoc,
} from "firebase/firestore";

import { useCalendarStore } from "../components/CalendarState";

////////////////////////////////////////////////////////////////////////////////////////////////////

const VacationForm = () => {
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const { markedDates, resetMarkedDates, handleSelect, handleCancel } =
    useCalendarStore();

  // function to handle date selection
  const handleDateSelection = () => {
    if (startDate && endDate) {
      handleSelect(startDate, endDate);
      setStartDate(""); //clear start date
      setEndDate(""); //clear end date
      console.log(
        "Marked dates in store:",
        useCalendarStore.getState().markedDates
      );
    }
  };

  // function to save vacation data to Firestore
  const handleSaveVacation = async () => {
    try {
      const user = FIREBASE_AUTH.currentUser;
      if (!user) {
        console.error("Kein Benutzer angemeldet");
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
        "Services",
        "AczkjyWoOxdPAIRVxjy3",
        "Vacations"
      );

      // create new document in `Vacations` collection
      await addDoc(vacationsCollection, {
        uid: user.uid,
        markedDates: filteredMarkedDates,
        createdAt: serverTimestamp(),
      });

      resetMarkedDates(); // reset marked dates after saving
    } catch (error) {
      console.error("Fehler beim Speichern des Urlaubs:", error);
    }
  };

  // save function with error handling
  const handleSave = async () => {
    if (Object.keys(markedDates).length === 0) {
      console.error("Keine Daten zum Speichern vorhanden");
      return;
    }

    await handleSaveVacation();
  };

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
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View style={{ paddingHorizontal: 10 }}>
            <MaterialCommunityIcons
              name="calendar-text"
              size={40}
              color="white"
            />
          </View>

          {/* Input Field "Start Date" */}
          <View
            style={{
              margin: 5,
              backgroundColor: "lightgrey",
              width: 130,
              height: 50,
              borderWidth: 2,
              borderColor: "white",
              borderRadius: 8,
            }}
          >
            <TextInput
              placeholder="Start Date"
              placeholderTextColor="grey"
              editable={true}
              keyboardType="numeric"
              value={startDate}
              onChangeText={(text) => setStartDate(text)}
              style={{
                width: 250,
                height: 40,
                paddingLeft: 10,
                fontSize: 22,
              }}
            />
          </View>

          <View style={{ paddingHorizontal: 10 }}>
            <FontAwesome name="arrow-circle-right" size={40} color="white" />
          </View>

          {/* Input Field "End Date" */}
          <View
            style={{
              margin: 5,
              backgroundColor: "lightgrey",
              width: 130,
              height: 50,
              borderWidth: 3,
              borderColor: "white",
              borderRadius: 8,
            }}
          >
            <TextInput
              placeholder="End Date"
              placeholderTextColor="grey"
              editable={true}
              keyboardType="numeric"
              value={endDate}
              onChangeText={(text) => setEndDate(text)}
              style={{
                width: 250,
                height: 40,
                paddingLeft: 10,
                fontSize: 22,
              }}
            />
          </View>
        </View>
      </View>

      <View
        style={{
          alignItems: "center",
          backgroundColor: "black",
          padding: 20,
        }}
      >
        {/* Select Button */}
        <TouchableOpacity
          onPress={handleDateSelection}
          style={{
            height: 45,
            width: 260,
            borderRadius: 8,
            borderWidth: 3,
            borderColor: "white",
            overflow: "hidden",
          }}
        >
          <LinearGradient
            colors={["#00FFFF", "#FFFFFF"]}
            style={{
              alignItems: "center",
              justifyContent: "center",
              height: 45,
              width: 260,
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
              Select
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

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

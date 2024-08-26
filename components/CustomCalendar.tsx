////////////////////////// CustomCalendar Component //////////////////////////////

import { View } from "react-native";
import React, { useState, useEffect } from "react";
import { Calendar } from "react-native-calendars";
import { collection, addDoc } from "firebase/firestore";
import MarkedDates from "react-native-calendars";

import { FIREBASE_AUTH, FIREBASE_FIRESTORE } from "../firebaseConfig";

/////////////////////////////////////////////////////////////////////////////////

interface MarkedDates {
  [date: string]: {
    selected: boolean;
    marked?: boolean;
    dotColor?: string;
  };
}

/////////////////////////////////////////////////////////////////////////////////

const CustomCalendar = () => {
  const [selectedDates, setSelectedDates] = useState<{
    [date: string]: boolean;
  }>({});

  const saveBooking = async () => {
    const user = FIREBASE_AUTH.currentUser;

    if (user) {
      const userId = user.uid;
      const bookingsRef = collection(FIREBASE_FIRESTORE, "bookings");

      // Extrahiere die ausgewählten Daten aus dem State
      const selectedDatesArray = Object.keys(selectedDates).filter(
        (date) => selectedDates[date]
      );

      // Speichere die Daten in Firestore
      await addDoc(bookingsRef, {
        userId,
        dates: selectedDatesArray,
      });
    } else {
      console.log("User is not logged in");
    }
  };

  const markSelectedDates = (
    start: string | number | Date,
    end: string | number | Date
  ) => {
    const markedDates: {
      [date: string]: { selected: boolean };
    } = {};

    if (start === end) {
      // Der Benutzer hat nur einen Tag ausgewählt
      const dateString = new Date(start).toISOString().split("T")[0];
      markedDates[dateString] = { selected: true };
    } else {
      // Der Benutzer hat ein Zeitintervall ausgewählt
      let currentDate = new Date(start);
      while (currentDate <= new Date(end)) {
        const dateString = currentDate.toISOString().split("T")[0];
        markedDates[dateString] = { selected: true };
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }

    return markedDates;
  };

  const handleDayPress = (day: { dateString: string | number | Date }) => {
    const { dateString } = day;
    const startDate = dateString;
    const endDate = dateString;
    // Rufe markSelectedDates auf und logge die Ergebnisse
    const newSelectedDates = markSelectedDates(startDate, endDate);

    console.log("New Selected Dates:", newSelectedDates);

    setSelectedDates((prevDates: {}) => {
      return {
        ...prevDates,
        ...newSelectedDates,
      };
    });

    // Vergleiche als JSON-Strings, um eine korrekte Überprüfung durchzuführen
    {
      /*if (JSON.stringify(newSelectedDates) !== JSON.stringify(selectedDates)) {
      console.log("Updating Selected Dates");
      setSelectedDates(
        newSelectedDates as unknown as { [date: string]: boolean }
      );
    }*/
    }
  };

  return (
    <View>
      <Calendar
        current={"2024-02-05"}
        minDate={"2023-01-01"}
        maxDate={"2025-12-31"}
        onDayPress={handleDayPress}
        markedDates={selectedDates as unknown as MarkedDates}
        style={{
          height: 350,
          marginBottom: 50,
        }}
        theme={{
          backgroundColor: "#ffffff",
          calendarBackground: "#000000",
          textSectionTitleColor: "lightgrey",
          selectedDayBackgroundColor: "#00adf5",
          selectedDayTextColor: "#ffffff",
          todayTextColor: "aqua",
          dayTextColor: "white",
          textDisabledColor: "#595959",
          dotColor: "#00adf5",
          selectedDotColor: "#ffffff",
          arrowColor: "aqua",
          monthTextColor: "aqua",
          indicatorColor: "red",
          textDayFontFamily: "monospace",
          textMonthFontFamily: "monospace",
          textDayHeaderFontFamily: "monospace",
          textDayFontWeight: "300",
          textMonthFontWeight: "bold",
          textDayHeaderFontWeight: "100",
          textDayFontSize: 16,
          textMonthFontSize: 18,
          textDayHeaderFontSize: 16,
        }}
      />
    </View>
  );
};

export default CustomCalendar;

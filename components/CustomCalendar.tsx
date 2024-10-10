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

// interface to show the current month by rendering the VacationScreen
interface CustomCalendarProps {
  currentMonth: string;
}

/////////////////////////////////////////////////////////////////////////////////

const CustomCalendar: React.FC<CustomCalendarProps> = ({ currentMonth }) => {
  const [selectedDates, setSelectedDates] = useState<{
    [date: string]: boolean;
  }>({});

  const saveBooking = async () => {
    const user = FIREBASE_AUTH.currentUser;

    if (user) {
      const userId = user.uid;
      const bookingsRef = collection(FIREBASE_FIRESTORE, "bookings");

      // extract the selected dates from the selectedDates object
      const selectedDatesArray = Object.keys(selectedDates).filter(
        (date) => selectedDates[date]
      );

      // save the selected dates to the database
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
      // user has selected a single day
      const dateString = new Date(start).toISOString().split("T")[0];
      markedDates[dateString] = { selected: true };
    } else {
      // user has selected multiple days
      let currentDate = new Date(start);
      while (currentDate <= new Date(end)) {
        const dateString = currentDate.toISOString().split("T")[0];
        markedDates[dateString] = { selected: true };
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }

    return markedDates;
  };

  return (
    <View>
      <Calendar
        key={currentMonth}
        current={currentMonth}
        minDate={"2024-01-01"}
        maxDate={"2030-12-31"}
        markedDates={
          selectedDates as unknown as {
            [date: string]: { selected: boolean };
          }
        }
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

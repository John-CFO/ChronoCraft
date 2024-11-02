////////////////////////// CustomCalendar Component //////////////////////////////

import { View, Text } from "react-native";
import React, { useState, useEffect } from "react";
import { Calendar } from "react-native-calendars";
import { collection, addDoc } from "firebase/firestore";
import MarkedDates from "react-native-calendars";

import { FIREBASE_AUTH, FIREBASE_FIRESTORE } from "../firebaseConfig";
import { useCalendarStore } from "../components/CalendarState";
/////////////////////////////////////////////////////////////////////////////////

interface CustomCalendarProps {
  currentMonth: string;
  markedDates: {
    [key: string]: any;
  };
}

////////////////////////////////////////////////////////////////////////////////
const CustomCalendar: React.FC<CustomCalendarProps> = () => {
  // initialize the useCalendarStore and setCurrentMonth
  const { markedDates } = useCalendarStore();
  const [currentMonth, setCurrentMonth] = useState("");

  return (
    <View>
      {/* Calendar - style and handle options*/}
      <Calendar
        key={Object.keys(markedDates).join(",")}
        //key={currentMonth}
        current={currentMonth}
        markedDates={useCalendarStore((state) => state.markedDates)}
        onPress={(day: { dateString: any }) => {
          console.log("Selected day", day.dateString);
        }}
        markingType={"custom"}
        minDate={"2024-01-01"}
        maxDate={"2030-12-31"}
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

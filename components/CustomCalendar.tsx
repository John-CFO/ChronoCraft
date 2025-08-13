////////////////////////// CustomCalendar Component //////////////////////////////

// This component shows the customised calendar and the functiont to navigate iside the calendar.

//////////////////////////////////////////////////////////////////////////////////

import { View } from "react-native";
import React, {
  useImperativeHandle,
  forwardRef,
  useState,
  useEffect,
} from "react";
import { Calendar } from "react-native-calendars";
import { CopilotStep, walkthroughable } from "react-native-copilot";

import { useCalendarStore } from "../components/CalendarState";
import { useAccessibilityStore } from "../components/services/accessibility/accessibilityStore";

/////////////////////////////////////////////////////////////////////////////////

interface CustomCalendarProps {
  currentMonth: string;
  markedDates: {
    [key: string]: any;
  };
}

export interface CustomCalendarRef {
  scrollToMonth: (month: string) => void;
  scrollToToday: () => void;
}

////////////////////////////////////////////////////////////////////////////////

// modified walkthroughable for copilot tour
const CopilotTouchableView = walkthroughable(View);

const CustomCalendar = forwardRef<CustomCalendarRef, CustomCalendarProps>(
  (_, ref) => {
    // initialize the useCalendarStore and setCurrentMonth
    const { markedDates } = useCalendarStore();

    // initialize the accessibility store
    const accessMode = useAccessibilityStore(
      (state) => state.accessibilityEnabled
    );

    // initialize currentMonth state
    const [currentMonth, setCurrentMonth] = useState<string>("");

    // initialize earliestMarkedDate by sorting the markedDates and selecting the first date
    // this will be used to determine the currentMonth and serve as a reference point
    // when the user adds a new marked date, ensuring the calendar starts at the earliest marked date
    const earliestMarkedDate = Object.keys(markedDates).sort()[0];

    // hook to set the currentMonth when the earliestMarkedDate changes
    useEffect(() => {
      setCurrentMonth(
        earliestMarkedDate || new Date().toISOString().split("T")[0]
      );
    }, [earliestMarkedDate]);

    // method to scroll by using the ref
    useImperativeHandle(ref, () => ({
      // method to scroll to the first day in the markedDates object
      scrollToMonth: (month: string) => {
        setCurrentMonth(month); // set the month where the user wants to scroll
      },
      // method to scroll to the current month when user pushes the save or cancel button
      scrollToToday: () => {
        const today = new Date().toISOString().split("T")[0];
        setCurrentMonth(today); // set the calendar to the current month
      },
    }));

    return (
      <>
        {/* VacationScreen copilot tour step 1 */}
        <CopilotStep
          name="Calendar"
          order={1}
          text="In this area you can view your vacation-calendar."
        >
          <CopilotTouchableView
            accessible={true}
            accessibilityLabel="Vacation calendar showing marked vacation days. Swipe left or right to change month."
          >
            {/* Calendar - style and handle options*/}
            <Calendar
              key={`${currentMonth}-${accessMode}`}
              current={currentMonth}
              markedDates={useCalendarStore((state) => state.markedDates)}
              onPress={(day: { dateString: any }) => {
                console.log("Selected day", day.dateString);
              }}
              onMonthChange={(date: { dateString: any }) =>
                setCurrentMonth(date.dateString)
              }
              markingType={"custom"}
              minDate={"2024-01-01"}
              maxDate={"2030-12-31"}
              style={{
                height: 350,
                width: 430,
                marginBottom: accessMode ? 95 : 50,
              }}
              theme={{
                backgroundColor: "#ffffff",
                calendarBackground: "#000000",
                textSectionTitleColor: "lightgrey",
                selectedDayBackgroundColor: "#00adf5",
                selectedDayTextColor: "#ffffff",
                todayTextColor: "aqua",
                dayTextColor: "white",
                textDisabledColor: accessMode ? "#797979ff" : "#595959",
                dotColor: "#00adf5",
                selectedDotColor: "#ffffff",
                arrowColor: "aqua",
                monthTextColor: "aqua",
                indicatorColor: "red",
                textDayFontFamily: "monospace",
                textMonthFontFamily: "monospace",
                textDayHeaderFontFamily: "monospace",
                textDayFontWeight: accessMode ? "bold" : "300",
                textMonthFontWeight: "bold",
                textDayHeaderFontWeight: accessMode ? "bold" : "100",
                textDayFontSize: 16,
                textMonthFontSize: accessMode ? 22 : 18,
                textDayHeaderFontSize: 16,

                "stylesheet.calendar.main": {
                  dayContainer: {
                    width: accessMode ? 46 : 40,
                    height: accessMode ? 46 : 40,
                    justifyContent: "center",
                    alignItems: "center",
                  },
                },
              }}
            />
          </CopilotTouchableView>
        </CopilotStep>
      </>
    );
  }
);

export default CustomCalendar;

////////////////////////////////////CalendarState Component////////////////////////////////

import { create } from "zustand";

//////////////////////////////////////////////////////////////////////////////////////////

// interface to handle calendar state and actions
interface CalendarState {
  markedDates: {
    [key: string]: any;
  };
  setMarkedDates: (newDates: { [key: string]: any }) => void;
  resetMarkedDates: () => void;
  handleSelect: (startDate: string, endDate?: string) => void;
  handleCancel: () => void;
}

// types for markedDates styles
type MarkedDate = {
  customStyles: {
    container: {
      borderWidth: number;
      borderColor: string;
      backgroundColor: string;
    };
    text: {
      color: string;
      fontWeight: string;
    };
  };
};

// type for markedDates
type MarkedDates = {
  [key: string]: MarkedDate;
};

//////////////////////////////////////////////////////////////////////////////////////////

// create CalendarStore
export const useCalendarStore = create<CalendarState>((set) => ({
  // initial state
  markedDates: {},

  // function to update markedDates
  setMarkedDates: (newDates) => set({ markedDates: newDates }),

  // function to reset markedDates
  resetMarkedDates: () => set(() => ({ markedDates: {} })),

  // function to handle date selection to the CustomCalendar
  handleSelect: (startDate, endDate) => {
    if (!startDate || !endDate) {
      //console.error("start or end date is missing.");
      return;
    }

    const dates: MarkedDates = {};
    let currentDate = new Date(startDate);

    const end = new Date(endDate);

    while (currentDate <= end) {
      const formattedDate = currentDate.toISOString().split("T")[0];
      dates[formattedDate] = {
        customStyles: {
          container: {
            borderWidth: 1,
            borderColor: "aqua",
            backgroundColor: "transparent",
          },
          text: { color: "white", fontWeight: "bold" },
        },
      };

      // go to the next day
      currentDate.setDate(currentDate.getDate() + 1);
    }

    useCalendarStore.getState().setMarkedDates(dates); // update store
    //console.log("Neue markierte Daten:", dates);
  },

  // function to cancel date selection
  handleCancel: () => set(() => ({ markedDates: {} })),
}));

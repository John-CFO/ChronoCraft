////////////////////////////////////CalendarState Component////////////////////////////////

// This component manages the state of the calendar component

//////////////////////////////////////////////////////////////////////////////////////////

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

// Date -> local "YYYY-MM-DD"-String (NO UTC!)
export const toLocalISODate = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

// "YYYY-MM-DD" -> local Midnight (NO UTC!)
export const fromLocalISODate = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};

// create CalendarStore
export const useCalendarStore = create<CalendarState>((set) => ({
  // initial state
  markedDates: {},

  // setter to update markedDates
  setMarkedDates: (newDates) => set({ markedDates: newDates }),

  // function to reset markedDates
  resetMarkedDates: () => set(() => ({ markedDates: {} })),

  // function to handle date selection to the CustomCalendar
  handleSelect: (startDate, endDate) => {
    if (!startDate || !endDate) return;

    const dates: MarkedDates = {};
    const current = fromLocalISODate(startDate);
    const end = fromLocalISODate(endDate);

    while (current <= end) {
      dates[toLocalISODate(current)] = {
        customStyles: {
          container: {
            borderWidth: 1,
            borderColor: "aqua",
            backgroundColor: "transparent",
          },
          text: { color: "white", fontWeight: "bold" },
        },
      };
      current.setDate(current.getDate() + 1);
    }

    useCalendarStore.getState().setMarkedDates(dates); // update store
  },

  // function to cancel date selection
  handleCancel: () => set(() => ({ markedDates: {} })),
}));

/////////////////////////////////Calendar State Component//////////////////////////////////

import { create } from "zustand";

//////////////////////////////////////////////////////////////////////////////////////////

interface CalendarState {
  markedDates: {
    [key: string]: any;
  };
  setMarkedDates: (newDates: { [key: string]: any }) => void;
  resetMarkedDates: () => void;
  handleSelect: (startDate: string, endDate: string) => void;
  handleCancel: () => void;
}

//////////////////////////////////////////////////////////////////////////////////////////

// initialize the useCalendarStore
export const useCalendarStore = create<CalendarState>((set) => ({
  markedDates: {},

  // setter function to set the marked dates
  setMarkedDates: (newDates) =>
    set((state) => ({
      markedDates: { ...state.markedDates, ...newDates },
    })),
  resetMarkedDates: () => set(() => ({ markedDates: {} })),

  // function to select the dates and send it to save function and the Custom Calendar component
  handleSelect: (startDate: string, endDate?: string) => {
    if (!startDate) {
      console.error("Start date is undefined.");
      return;
    }

    console.log("Start Date:", startDate);
    console.log("End Date:", endDate);

    // convert date to ISO format
    const convertToISODate = (dateString: string) => {
      const [day, month, year] = dateString.split(".");
      return `${year}-${month}-${day}`;
    };

    const formattedStartDate = convertToISODate(startDate);
    const currentDate = new Date(formattedStartDate);
    let newMarkedDates: { [key: string]: any } = {};

    if (endDate) {
      const formattedEndDate = convertToISODate(endDate);
      const lastDate = new Date(formattedEndDate);

      // loop through the dates between the start and end dates
      while (currentDate <= lastDate) {
        const dateString = currentDate.toISOString().split("T")[0];

        newMarkedDates[dateString] = {
          customStyles: {
            container: {
              borderWidth: 1,
              borderColor: "aqua",
              borderRadius: 50,
            },
            text: {
              color: "white",
            },
          },
        };

        currentDate.setDate(currentDate.getDate() + 1);
      }
    } else {
      // marking the current date
      const dateString = currentDate.toISOString().split("T")[0];
      newMarkedDates[dateString] = {
        customStyles: {
          container: {
            borderWidth: 1,
            borderColor: "aqua",
            borderRadius: 50,
          },
          text: {
            color: "white",
          },
        },
      };
    }

    // setter function to set the marked dates
    set((state) => ({
      markedDates: { ...state.markedDates, ...newMarkedDates },
    }));

    console.log("Marked dates set: ", newMarkedDates);
  },

  // function to cancel the selection
  handleCancel: () => set(() => ({ markedDates: {} })),
}));

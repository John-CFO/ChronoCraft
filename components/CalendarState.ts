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
// helper function to convert a date string to ISO format
const convertToISODate = (dateString: string) => {
  const [day, month, year] = dateString.split(".");
  return `${year}-${month}-${day}`;
};
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
    const today = new Date();
    today.setHours(0, 0, 0, 0); // add time to midnight

    // convert startDate to Date object
    const formattedStartDate = convertToISODate(startDate);
    const selectedDate = new Date(formattedStartDate);
    selectedDate.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
      alert("Please select a future date.");
      return;
    }

    if (!startDate) {
      // console.error("Start date is undefined.");
      return;
    }

    if (endDate) {
      const formattedEndDate = convertToISODate(endDate);
      const selectedEndDate = new Date(formattedEndDate);
      selectedEndDate.setHours(0, 0, 0, 0);

      // check if the end date is also in the future
      if (selectedEndDate < today) {
        alert("Please select a future end date.");
        return;
      }
    }

    // console.log("Start Date:", startDate);
    // console.log("End Date:", endDate);

    // mark the dates between startDate and endDate
    const currentDate = new Date(formattedStartDate);
    let newMarkedDates: { [key: string]: any } = {};

    if (endDate) {
      const formattedEndDate = convertToISODate(endDate);
      const lastDate = new Date(formattedEndDate);

      // loop through the dates between startDate and endDate
      while (currentDate <= lastDate) {
        const dateString = currentDate.toISOString().split("T")[0];

        if (currentDate >= today) {
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

        currentDate.setDate(currentDate.getDate() + 1);
      }
    } else {
      // mark only the start date if no end date is provided
      const dateString = currentDate.toISOString().split("T")[0];
      if (currentDate >= today) {
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
    }

    set((state) => ({
      markedDates: { ...state.markedDates, ...newMarkedDates },
    }));
  },

  // function to cancel the selection
  handleCancel: () => set(() => ({ markedDates: {} })),
}));

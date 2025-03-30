//////////////////////////////TourStatus Component////////////////////////////

import { useEffect } from "react";
import { useCopilot } from "react-native-copilot";
import AsyncStorage from "@react-native-async-storage/async-storage";

////////////////////////////////////////////////////////////////////////////

const TourStatus = () => {
  // declare copilothook
  const { start } = useCopilot();

  // hook to check the tour status
  useEffect(() => {
    const checkTourStatus = async () => {
      // console.log("startet CheckTourStatus");
      // try to get the tour status from async storage
      try {
        const hasSeenTour = await AsyncStorage.getItem("hasSeenTour");
        // console.log("hasSeenTour:", hasSeenTour);
        // condition to check if the tour status is null
        if (hasSeenTour === null) {
          // console.log("Start tour...");
          // start the tour with a delay
          setTimeout(() => {
            start();
            AsyncStorage.setItem("hasSeenTour", "true");
            // console.log("Tour marked as seen!");
          }, 500);
        }
      } catch (error) {
        console.error("Error checking tour status:", error);
      }
    };

    checkTourStatus();
  }, [start]);

  return null;
};

export default TourStatus;

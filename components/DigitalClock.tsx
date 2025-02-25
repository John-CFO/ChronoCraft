/////////////////////////////////////DigitalClock Component////////////////////////////////////////

import { View, Text } from "react-native";
import React, { useState, useEffect } from "react";
import dayjs from "dayjs";

//////////////////////////////////////////////////////////////////////////////////////////////////

const DigitalClock = () => {
  // set current time state with dayjs
  const [currentTime, setCurrentTime] = useState(dayjs());

  // hook to handle the interval change every 1 sec.
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(dayjs());
    }, 1000);

    // clear the interval
    return () => clearInterval(interval);
  }, []);

  return (
    <View
      style={{
        justifyContent: "center",
        alignItems: "center",
        width: 220,
        height: 80,
        borderRadius: 14,
        borderColor: "aqua",
      }}
    >
      <Text style={{ fontSize: 46, fontWeight: "bold", color: "grey" }}>
        {currentTime.format("HH:mm:ss")}
      </Text>
    </View>
  );
};

export default DigitalClock;

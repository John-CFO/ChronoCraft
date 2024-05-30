import { View, Text } from "react-native";
import React, { useState, useEffect } from "react";
import dayjs from "dayjs";

const DigitalClock = () => {
  //set current time state
  const [currentTime, setCurrentTime] = useState(dayjs());

  //handle the interval change every 1 sec.
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(dayjs());
    }, 1000);

    //clear the interval
    return () => clearInterval(interval);
  }, []);

  return (
    <View
      style={{
        justifyContent: "center",
        alignItems: "center",
        width: 220,
        height: 80,
        backgroundColor: "black",
        borderWidth: 6,
        borderRadius: 14,
        borderColor: "aqua",
      }}
    >
      <Text style={{ fontSize: 46, fontWeight: "bold", color: "white" }}>
        {currentTime.format("HH:mm:ss")}
      </Text>
    </View>
  );
};

export default DigitalClock;

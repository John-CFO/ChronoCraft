///////////////////////////////////DigitalDate Component//////////////////////////////////

import { View, Text } from "react-native";
import React, { useState, useEffect } from "react";
import dayjs from "dayjs";

//////////////////////////////////////////////////////////////////////////////////////////
const DigitalDate = () => {
  // current date state with dayjs
  const [currentDate, setCurrentDate] = useState(dayjs());

  // function to update current date every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentDate(dayjs());
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  return (
    <View
      style={{
        alignItems: "center",
        justifyContent: "center",

        width: 420,
        height: 80,
        backgroundColor: "black",

        borderColor: "aqua",
      }}
    >
      <Text style={{ fontSize: 24, fontWeight: "bold", color: "white" }}>
        {currentDate.format("DD-MM-YYYY")}
      </Text>
    </View>
  );
};

export default DigitalDate;

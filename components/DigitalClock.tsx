/////////////////////////////////////DigitalClock Component////////////////////////////////////////

import { View, Text } from "react-native";
import React, { useState, useEffect, useRef } from "react";
import dayjs from "dayjs";

//////////////////////////////////////////////////////////////////////////////////////////////////

const DigitalClock = () => {
  // set current time state with dayjs
  const [currentTime, setCurrentTime] = useState(dayjs());

  // ref to store the timeout
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  // hook to handle the interval change every 1 sec.
  useEffect(() => {
    const tick = () => {
      const now = dayjs();
      setCurrentTime(now);

      const delay = 1000 - now.millisecond();
      timeoutRef.current = setTimeout(tick, delay);
    };

    timeoutRef.current = setTimeout(tick, 0);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
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

export default React.memo(DigitalClock);

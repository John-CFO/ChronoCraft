import React, { useEffect, useState } from "react";
import { VictoryBar, VictoryChart } from "victory-native";

//////////////////////////////////////////////////////////////////////////////

const Clock = () => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const intervalId = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(intervalId);
  }, []);

  return (
    <VictoryChart>
      <VictoryBar />
    </VictoryChart>
  );
};

export default Clock;

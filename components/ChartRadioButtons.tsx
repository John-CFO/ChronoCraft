/////////////////////////////////ChartRadioButtons Component////////////////////////////

import { View, Text, TouchableOpacity } from "react-native";
import React, { useState } from "react";

////////////////////////////////////////////////////////////////////////////////////////

const ChartRadioButtons = () => {
  // state to set the chart type with the radio button
  const [chartType, setChartType] = useState<"week" | "month" | "year">("week");

  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-around",
        marginBottom: 20,
      }}
    >
      <TouchableOpacity
        style={{ flexDirection: "row", alignItems: "center" }}
        onPress={() => setChartType("week")}
      >
        <View
          style={{
            height: 20,
            width: 20,
            borderRadius: 10,
            borderWidth: 2,
            borderColor: "aqua",
            alignItems: "center",
            justifyContent: "center",
            marginRight: 8,
          }}
        >
          {chartType === "week" && (
            <View
              style={{
                height: 12,
                width: 12,
                borderRadius: 6,
                backgroundColor: "aqua",
              }}
            />
          )}
        </View>
        <Text style={{ fontSize: 16, color: "white" }}>Week</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={{ flexDirection: "row", alignItems: "center" }}
        onPress={() => setChartType("month")}
      >
        <View
          style={{
            height: 20,
            width: 20,
            borderRadius: 10,
            borderWidth: 2,
            borderColor: "aqua",
            alignItems: "center",
            justifyContent: "center",
            marginRight: 8,
          }}
        >
          {chartType === "month" && (
            <View
              style={{
                height: 12,
                width: 12,
                borderRadius: 6,
                backgroundColor: "aqua",
              }}
            />
          )}
        </View>
        <Text style={{ fontSize: 16, color: "white" }}>Month</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={{ flexDirection: "row", alignItems: "center" }}
        onPress={() => setChartType("year")}
      >
        <View
          style={{
            height: 20,
            width: 20,
            borderRadius: 10,
            borderWidth: 2,
            borderColor: "aqua",
            alignItems: "center",
            justifyContent: "center",
            marginRight: 8,
          }}
        >
          {chartType === "year" && (
            <View
              style={{
                height: 12,
                width: 12,
                borderRadius: 6,
                backgroundColor: "aqua",
              }}
            />
          )}
        </View>
        <Text style={{ fontSize: 16, color: "white" }}>Year</Text>
      </TouchableOpacity>
    </View>
  );
};

export default ChartRadioButtons;

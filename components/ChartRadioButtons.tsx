//////////////////////////////////ChartRadioButtons Component////////////////////////////////

// This component is used to show the chart radio buttons in the WorkHours Chart card

import { View, Text, TouchableOpacity } from "react-native";
import React from "react";

//////////////////////////////////////////////////////////////////////////////////////////////

interface ChartRadioButtonsProps {
  chartType: "week" | "month" | "year";
  setChartType: (chartType: "week" | "month" | "year") => void;
}

//////////////////////////////////////////////////////////////////////////////////////////////

const ChartRadioButtons: React.FC<ChartRadioButtonsProps> = ({
  chartType,
  setChartType,
}) => {
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-around",
        marginBottom: 20,
      }}
    >
      <TouchableOpacity
        onPress={() => setChartType("week")}
        style={{ flexDirection: "row", alignItems: "center" }}
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
        onPress={() => setChartType("month")}
        style={{ flexDirection: "row", alignItems: "center" }}
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
        onPress={() => setChartType("year")}
        style={{ flexDirection: "row", alignItems: "center" }}
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

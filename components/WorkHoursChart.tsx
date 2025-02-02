import { View, Text } from "react-native";
import React, { useState } from "react";
import { BarChart } from "react-native-gifted-charts";
import WorkHoursState from "../components/WorkHoursState";

interface DataPoint {
  day: string;
  expectedHours: number;
  overHours: number;
  workDay: string;
}

const WorkHoursChart = () => {
  const { data } = WorkHoursState();
  const [tooltipData, setTooltipData] = useState<{
    date: string;
    expectedHours: number;
    overHours: number;
    x: number;
    y: number;
  } | null>(null);

  const handleBarPress = (item: any, index: number) => {
    if (
      item &&
      item.expectedHours !== undefined &&
      item.overHours !== undefined
    ) {
      const barWidth = 22; // Breite eines Balkens
      const spacing = 24; // Abstand zwischen den Balken
      const x = index * (barWidth + spacing) + barWidth / 2; // X-Position des Tooltips
      const y = 400 - (item.expectedHours + item.overHours) * 30; // Y-Position des Tooltips

      setTooltipData({
        date: item.day,
        expectedHours: item.expectedHours,
        overHours: item.overHours,
        x,
        y,
      });
    }
  };

  const safeData = data
    .map((item, index) => {
      if (!item.workDay || isNaN(new Date(item.workDay).getTime())) {
        console.warn("Invalid or missing day in safeData:", item);
        return null;
      }
      if (!item.day || typeof item.day !== "string") {
        console.error(`Invalid day at index ${index}:`, item);
      }
      const parsedDate = new Date(item.workDay);
      return {
        day: parsedDate.toISOString().split("T")[0],
        expectedHours: Number(item.expectedHours) || 0,
        overHours: Number(item.overHours) || 0,
      };
    })
    .filter((item) => item !== null);

  const stackedBarData = safeData.map((item) => ({
    stacks: [
      { value: item.expectedHours, color: "gray" },
      { value: item.overHours, color: "aqua" },
    ],
    label: item.day,
  }));

  return (
    <View
      style={{
        paddingHorizontal: 20,
        marginTop: 50,
        width: "100%",
        height: 400,
        borderWidth: 1,
        borderColor: "aqua",
        borderRadius: 12,
        backgroundColor: "#191919",
      }}
    >
      <Text
        style={{
          fontFamily: "MPLUSLatin_Bold",
          fontSize: 25,
          color: "white",
          marginBottom: 30,
          marginTop: 25,
          textAlign: "center",
        }}
      >
        Workhours Chart
      </Text>

      <BarChart
        data={stackedBarData}
        barWidth={22}
        spacing={24}
        roundedTop
        roundedBottom
        hideRules
        xAxisLabelTextStyle={{ color: "white" }}
        yAxisTextStyle={{ color: "white" }}
        noOfSections={4}
        yAxisOffset={0}
        initialSpacing={10}
        onPress={(item: DataPoint, index: number) =>
          handleBarPress(item, index)
        }
      />

      <View
        style={{
          flexDirection: "row",
          justifyContent: "center",
          alignItems: "center",
          marginTop: 5,
          marginBottom: 15,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginHorizontal: 10,
          }}
        >
          <View
            style={{
              height: 12,
              width: 12,
              borderRadius: 6,
              backgroundColor: "gray",
            }}
          />
          <Text style={{ marginLeft: 5, fontSize: 14, color: "white" }}>
            Expected Hours
          </Text>
        </View>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginHorizontal: 10,
          }}
        >
          <View
            style={{
              height: 12,
              width: 12,
              borderRadius: 6,
              backgroundColor: "aqua",
            }}
          />
          <Text style={{ marginLeft: 5, fontSize: 14, color: "white" }}>
            Over Hours
          </Text>
        </View>
      </View>
      {tooltipData && (
        <View
          style={{
            position: "absolute",
            top: tooltipData.y,
            left: tooltipData.x,
            backgroundColor: "white",
            padding: 10,
            borderRadius: 5,
            elevation: 5,
          }}
        >
          <Text style={{ fontSize: 16, color: "black" }}>
            {`Date: ${tooltipData.date}\nExpected Hours: ${tooltipData.expectedHours}\nOver Hours: ${tooltipData.overHours}`}
          </Text>
        </View>
      )}
    </View>
  );
};

export default WorkHoursChart;

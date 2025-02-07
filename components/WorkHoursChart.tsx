//////////////////////////////////////////////////WorkHoursChart Component////////////////////////////

// this file mounts the WorkHoursChart in the WorkHoursScreen
// it includes the bar chart and the tooltip with the position options and the data maping function

import { View, Text } from "react-native";
import React, { useState } from "react";
import { BarChart } from "react-native-gifted-charts";

import WorkHoursState from "../components/WorkHoursState";
import ChartRadioButtons from "./ChartRadioButtons";

//////////////////////////////////////////////////////////////////////////////////////////////////////

const WorkHoursChart = () => {
  // get the data from the WorkHoursState
  const { data } = WorkHoursState();
  // state to postion the tooltip
  const [tooltipData, setTooltipData] = useState<{
    date: string;
    expectedHours: number;
    overHours: number;
    x: number;
    y: number;
  } | null>(null);

  // function to handle bar press
  const handleBarPress = (item: any, index: number) => {
    if (item?.stacks) {
      const expectedHours = item.stacks[0]?.value || 0;
      const overHours = item.stacks[1]?.value || 0;

      const barWidth = 22;
      const spacing = 24;
      const chartHeight = 400;
      const scaleFactor = 10; // pixel to hour

      const x = index * (barWidth + spacing) + barWidth / 2;
      const highestPoint = (expectedHours + overHours) * scaleFactor;
      let y = chartHeight - highestPoint - 40;

      // options to position the tooltip in Y if it is too high
      if (y < 50) y = 50;

      // options to position the tooltip in Y if it is too low
      if (y > chartHeight - 100) y = chartHeight - 280;

      // atjust x position
      let adjustedX = x;
      if (x < 40) adjustedX += 50;
      if (x > 300) adjustedX -= 50;

      // set tooltip to expected position with data
      setTooltipData({
        date: item.label,
        expectedHours,
        overHours,
        x: adjustedX,
        y: y,
      });
      console.log("Tooltip Position:", {
        x: adjustedX,
        y: y,
        highestPoint,
        expectedHours,
        overHours,
      });
    }
  };
  // function to  filter an maping the values and define the data for the bar chart
  const stackData = data
    .filter((item) => item.elapsedTime > 0) // filter out items where elapsedTime is 0
    .map((item, index) => {
      if (!item.workDay || isNaN(new Date(item.workDay).getTime())) {
        console.warn("Invalid or missing day:", item);
        return null;
      }
      // format the date to e.g. "01.Jan"
      const formattedDate = new Date(item.workDay)
        .toLocaleDateString("de-DE", { day: "2-digit", month: "short" })
        .replace(/\./g, "");

      return {
        label: formattedDate,
        stacks: [
          { value: Number(item.expectedHours) || 0, color: "gray" }, // use elapsedTime instead of expectedHours
          {
            value: Number(item.overHours) || 0,
            color: "aqua",
            marginBottom: 2,
          },
        ],
      };
    })
    .filter((item) => item !== null);

  return (
    <View
      style={{
        marginTop: 50,
        width: "100%",
        height: 480,
        borderWidth: 1,
        borderColor: "aqua",
        borderRadius: 12,
        backgroundColor: "#191919",
      }}
    >
      {/*Title */}
      <Text
        style={{
          fontFamily: "MPLUSLatin_Bold",
          fontSize: 25,
          color: "white",
          marginBottom: 80,
          marginTop: 25,
          textAlign: "center",
        }}
      >
        Workhours Chart
      </Text>
      <ChartRadioButtons />
      {/*Stacked Bar Chart */}
      <BarChart
        width={290}
        //rotateLabel
        maxValue={12}
        noOfSections={6}
        stackData={stackData}
        barWidth={30}
        initialSpacing={5}
        spacing={28}
        barBorderRadius={2.5}
        isAnimated
        yAxisColor={"darkgray"}
        xAxisColor={"darkgray"}
        xAxisLabelTextStyle={{ color: "white" }}
        yAxisTextStyle={{ color: "white" }}
        onPress={(item: any, index: number) => handleBarPress(item, index)}
      />

      {/*Legend Container */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "center",
          alignItems: "center",
          marginTop: 25,
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
      {/*Tooltip Box */}
      {tooltipData && (
        <View
          style={{
            position: "absolute",
            width: 115,
            height: 80,
            justifyContent: "space-around",
            top: tooltipData.y,
            left: tooltipData.x,
            backgroundColor: "#333",
            padding: 8,
            borderRadius: 8,
            elevation: 5,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.5,
            shadowRadius: 4,
          }}
        >
          <Text style={{ fontSize: 14, color: "white", fontWeight: "bold" }}>
            {`📅 ${tooltipData.date}`}
          </Text>
          <Text style={{ fontSize: 12, color: "white" }}>
            {`⏳ Expected: ${tooltipData.expectedHours}h`}
          </Text>
          <Text style={{ fontSize: 12, color: "aqua" }}>
            {`🚀 Over: ${tooltipData.overHours}h`}
          </Text>
        </View>
      )}
    </View>
  );
};

export default WorkHoursChart;

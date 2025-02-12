//////////////////////////////////////////////////WorkHoursChart Component////////////////////////////

// This file mounts the WorkHoursChart in the WorkHoursScreen
// It includes the bar chart and the tooltip with the position options and the data mapping function

//////////////////////////////////////////////////////////////////////////////////////////////////////

import { View, Text, TouchableWithoutFeedback } from "react-native";
import React, { useState } from "react";
import { BarChart } from "react-native-gifted-charts";

import WorkHoursState from "../components/WorkHoursState";
import ChartRadioButtons from "./ChartRadioButtons";
import { formatTooltipDate } from "../components/FormatToolTip";

//////////////////////////////////////////////////////////////////////////////////////////////////////

const WorkHoursChart = () => {
  // get the data from dem WorkHoursState
  const { data } = WorkHoursState();
  // state to use the initial chart type
  const [chartType, setChartType] = useState("week");
  // state for the tooltips with typeing
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
      // extract the expected and over hours from the item
      const expectedHours = item.stacks[0]?.value || 0;
      const overHours = item.stacks[1]?.value || 0;

      // define the bar width and spacing
      const barWidth = 22;
      const spacing = 24;
      const chartHeight = 400;

      const scaleFactor = chartType === "year" ? 2 : 15; // if years chart view scale factor is 2
      const tooltipHeight = 80;

      const x = index * (barWidth + spacing) + barWidth / 2;

      // calculate the y position
      let y =
        chartHeight - (expectedHours + overHours) * scaleFactor - tooltipHeight;

      // adjust the x position
      let adjustedX = x;
      if (x < 40) adjustedX += 50;
      if (x > 300) adjustedX -= 50;

      // set the tooltip data
      setTooltipData({
        date: item.label,
        expectedHours,
        overHours,
        x: adjustedX,
        y: y,
      });
    }
  };

  // function to filter the data by chart type
  const filterDataByChartType = (data: any, type: string) => {
    // get the current date
    const today = new Date();
    // filter the data
    return data.filter((item: { workDay: string }) => {
      // convert the workDay string to a Date object
      const itemDate = new Date(item.workDay);
      // condition to check the chart type
      if (type === "week") {
        // determine the beginning and end of the week (Monday-Sunday)
        const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, ...
        const startOfWeek = new Date(today);
        startOfWeek.setDate(
          today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1) // define the start of the week
        );
        // set the hours, minutes, seconds, and milliseconds to 0
        startOfWeek.setHours(0, 0, 0, 0);
        // determine the end of the week
        const endOfWeek = new Date(startOfWeek);
        // define the end of the week
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        // set the hours, minutes, seconds, and milliseconds to 23:59:59
        endOfWeek.setHours(23, 59, 59, 999);

        return itemDate >= startOfWeek && itemDate <= endOfWeek; // if the itemDate is between the start and end of the week
      }
      // condition to check the chart type else if (type === "month")
      else if (type === "month") {
        return (
          itemDate.getMonth() === today.getMonth() &&
          itemDate.getFullYear() === today.getFullYear()
        );
        // condition to check the chart type else if (type === "year")
      } else if (type === "year") {
        return itemDate.getFullYear() === today.getFullYear();
      }
      return false;
    });
  };

  const filteredData = filterDataByChartType(data, chartType);

  // help function to formate the x-axis label in the different chart modes
  const formatDate = (dateString: string, viewMode: string) => {
    const date = new Date(dateString);
    if (viewMode === "year") {
      return date
        .toLocaleDateString("de-DE", { month: "short" })
        .replace(".", "");
    } else if (viewMode === "month") {
      return date.toLocaleDateString("de-DE", { day: "2-digit" });
    }
    // Week-Chart is the default
    return date.toLocaleDateString("de-DE", { day: "2-digit" });
  };

  // section that maps the data to the bar chart and calculates the year chart bar for every month
  let stackData = [];

  if (chartType === "year") {
    // define the monthly sums for each year as an object
    const monthlySums: { [key: string]: { expected: number; over: number } } =
      {};
    // filter the data with the definitions above and calculate the monthly sums
    filteredData.forEach((item: any) => {
      const month = new Date(item.workDay).getMonth();
      const year = new Date(item.workDay).getFullYear();
      const key = `${year}-${month}`;

      if (!monthlySums[key]) {
        monthlySums[key] = { expected: 0, over: 0 };
      }

      monthlySums[key].expected += Number(item.expectedHours) || 0;
      monthlySums[key].over += Number(item.overHours) || 0;
    });
    // map the monthly sums to the bar chart and format the x-axis labels
    stackData = Object.keys(monthlySums).map((key) => {
      const [year, month] = key.split("-");
      const monthName = new Date(Number(year), Number(month), 1)
        .toLocaleDateString("de-DE", { month: "short" })
        .replace(".", "");

      return {
        label: monthName,
        stacks: [
          { value: monthlySums[key].expected, color: "gray" },
          { value: monthlySums[key].over, color: "aqua", marginBottom: 2 },
        ],
      };
    });
  } else {
    // filter and map the data
    stackData = filteredData
      .filter((item: any) => item.elapsedTime > 0)
      .map((item: any) => {
        if (!item.workDay || isNaN(new Date(item.workDay).getTime())) {
          console.warn("Invalid or missing day:", item);
          return null;
        }
        const formattedDate = formatDate(item.workDay, chartType);
        return {
          label: formattedDate,
          stacks: [
            { value: Number(item.expectedHours) || 0, color: "gray" },
            {
              value: Number(item.overHours) || 0,
              color: "aqua",
              marginBottom: 2,
            },
          ],
        };
      })
      .filter((item: any) => item !== null);
  }

  return (
    // TouchableWithoutFeedback to close the tooltip
    <TouchableWithoutFeedback onPress={() => setTooltipData(null)}>
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
        {/* Title */}
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
        <ChartRadioButtons
          chartType={chartType as "week" | "month" | "year"}
          setChartType={(type) => {
            setChartType(type);
            setTooltipData(null); // let the tooltip close if the chart type changes
          }}
        />
        {/* Stacked Bar Chart */}
        <BarChart
          width={290}
          maxValue={Math.max(
            ...stackData.map(
              (item: { stacks: { value: number }[] }) =>
                item.stacks[0].value + item.stacks[1].value
            )
          )}
          noOfSections={6}
          stackData={stackData}
          barWidth={30}
          initialSpacing={5}
          spacing={8}
          barBorderRadius={2.5}
          isAnimated
          yAxisColor={"darkgray"}
          xAxisColor={"darkgray"}
          xAxisLabelTextStyle={{ color: "white" }}
          yAxisTextStyle={{ color: "white" }}
          onPress={(item: any, index: number) => handleBarPress(item, index)}
        />

        {/* Legend Container */}
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
        {/* Tooltip Box */}
        {tooltipData && (
          <View
            style={{
              position: "absolute",
              width: 115,
              height: 90,
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
              {`📅 ${formatTooltipDate(tooltipData.date)}`}
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
    </TouchableWithoutFeedback>
  );
};

export default WorkHoursChart;

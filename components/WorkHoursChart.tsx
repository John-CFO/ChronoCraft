//////////////////////////////////////////////////WorkHoursChart Component////////////////////////////

// This file mounts the WorkHoursChart in the WorkHoursScreen
// It includes the bar chart and the tooltip with the position options and the data mapping function

//////////////////////////////////////////////////////////////////////////////////////////////////////

import React, { useState, useRef, useEffect } from "react";
import {
  ScrollView,
  View,
  Text,
  TouchableWithoutFeedback,
  LayoutChangeEvent,
} from "react-native";
import { BarChart } from "react-native-gifted-charts";

import WorkHoursState from "../components/WorkHoursState";
import ChartRadioButtons from "./ChartRadioButtons";
import { formatTooltipDate } from "../components/FormatToolTip";

///////////////////////////////////////////////////////////////////////////////////////////////////////

const WorkHoursChart = () => {
  // get the data from the WorkHoursState
  const { data } = WorkHoursState();
  // initialstate for the chart type
  const [chartType, setChartType] = useState("week");
  // state and types for the tooltip
  const [tooltipData, setTooltipData] = useState<{
    date: string;
    expectedHours: number;
    overHours: number;
    x: number;
    y: number;
  } | null>(null);
  // ref for the scrollview
  const scrollViewRef = useRef<ScrollView>(null);
  // state for the card width
  const [cardWidth, setCardWidth] = useState<number>(0);

  // card padding in px to calculate the inner width for the frame
  const cardPadding = 16;
  // state for the scrollX to save the tooltip position in the chart
  const [scrollX, setScrollX] = useState(0);

  // calculate the inner width for the frame
  const innerWidth = cardWidth > 0 ? cardWidth - 2 * cardPadding : 0;

  // set scrollview back if the chart type changes
  useEffect(() => {
    scrollViewRef.current?.scrollTo({ x: 0, animated: true });
  }, [chartType]);

  // function to handel the press of the bars
  const handleBarPress = (item: any, index: number) => {
    if (item?.stacks) {
      const expectedHours = item.stacks[0]?.value || 0;
      const overHours = item.stacks[1]?.value || 0;

      const barWidth = 22;
      const spacing = 24;
      const chartHeight = 400;
      const scaleFactor = chartType === "year" ? 2 : 15; // skale factor if chart type is year 2 else 15
      const tooltipHeight = 80;
      const tooltipWidth = 115;

      // calculate the absolute X-Position of the bar relative to the chart content container
      const absoluteX = index * (barWidth + spacing) + barWidth / 2;

      // use the scrollX offset and the card padding to calculate the relative X position in the scrollview container
      const relativeX = absoluteX + cardPadding - scrollX;

      // define the inner frame
      const frameLeft = cardPadding;
      const frameRight = cardWidth - cardPadding;

      // caluclate the adjusted X position to ensure the tooltip is fully within the inner frame
      let adjustedX = relativeX;
      if (adjustedX < frameLeft) {
        adjustedX = frameLeft;
      }
      if (adjustedX + tooltipWidth > frameRight) {
        adjustedX = frameRight - tooltipWidth;
      }

      // calculate the Y position of the tooltip whit the skale factor
      const y =
        chartHeight - (expectedHours + overHours) * scaleFactor - tooltipHeight;

      setTooltipData({
        date: item.originalDate,
        expectedHours,
        overHours,
        x: adjustedX,
        y,
      });
    }
  };

  // function to filter data by chart type
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
        // if the itemDate is between the start and end of the week
        return itemDate >= startOfWeek && itemDate <= endOfWeek;
        // condition to check the chart type
      } else if (type === "month") {
        return (
          itemDate.getMonth() === today.getMonth() &&
          itemDate.getFullYear() === today.getFullYear()
        );
        // condition to check the chart type
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
  let stackData: any[] = [];

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
          originalDate: item.workDay,
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

  // define fix values for bars and spacing
  const barWidth = 30;
  const spacing = 8;
  const initialSpacing = 5;

  // define the number of label sections
  const noOfSections = 6;
  // use the width of the screen to calculate the width of the chart
  const computedChartWidth =
    innerWidth > 0
      ? Math.max(
          innerWidth,
          initialSpacing + stackData.length * (barWidth + spacing) + spacing
        )
      : initialSpacing + stackData.length * (barWidth + spacing) + spacing;
  // calculate the maximum value
  const actualMax = Math.max(
    ...stackData.map(
      (item: { stacks: { value: number }[] }) =>
        item.stacks[0].value + item.stacks[1].value
    )
  );
  // define the maximum value if it is less than 10
  const computedMaxValue = actualMax < 10 ? 10 : actualMax;

  // calculate the maximum value and round it
  const step = Math.ceil(computedMaxValue / (noOfSections - 1));
  // generate an array that starts at 0 and increments in equal steps
  const yAxisLabelTexts = Array.from({ length: noOfSections }, (_, i) =>
    (i * step).toString()
  );

  return (
    // TouchableWithoutFeedback to close the tooltip
    <TouchableWithoutFeedback onPress={() => setTooltipData(null)}>
      <View
        onLayout={(event: LayoutChangeEvent) =>
          setCardWidth(event.nativeEvent.layout.width)
        }
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
        {/* Titel */}
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
            setTooltipData(null); // close tooltip if chart type changes
          }}
        />
        {/* Frame-Container with horizontal scrollbar */}
        <View style={{ paddingHorizontal: cardPadding }}>
          {/* Horizontal scrollbarer container for the BarChart */}
          <ScrollView
            horizontal
            ref={scrollViewRef}
            onScroll={(e) => setScrollX(e.nativeEvent.contentOffset.x)}
            scrollEventThrottle={16}
            contentContainerStyle={{ paddingRight: spacing + barWidth / 2 }}
          >
            <BarChart
              width={computedChartWidth}
              maxValue={computedMaxValue}
              noOfSections={noOfSections}
              yAxisLabelTexts={yAxisLabelTexts}
              stackData={stackData}
              barWidth={barWidth}
              initialSpacing={initialSpacing}
              spacing={spacing}
              barBorderRadius={2.5}
              isAnimated
              yAxisColor={"darkgray"}
              xAxisColor={"darkgray"}
              xAxisLabelTextStyle={{ color: "white" }}
              yAxisTextStyle={{ color: "white" }}
              onPress={(item: any, index: number) =>
                handleBarPress(item, index)
              }
            />
          </ScrollView>
        </View>
        {/* Legend */}
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
        {/* Tooltip */}
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

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
  Dimensions,
} from "react-native";
import { BarChart } from "react-native-gifted-charts";
import { CopilotStep, walkthroughable } from "react-native-copilot";
import { useTranslation } from "react-i18next";

import WorkHoursState from "../components/WorkHoursState";
import ChartRadioButtons from "./ChartRadioButtons";
import YearSelector from "./YearSelector";
import { formatTooltipDate } from "../components/FormatToolTip";
import { formatTime } from "../components/WorkTimeCalc";
import { useAccessibilityStore } from "../components/services/accessibility/accessibilityStore";
import { logWarn } from "../lib/loggerClient";

///////////////////////////////////////////////////////////////////////////////////////////////////////

// modified walkthroughable for copilot tour
const CopilotWalkthroughView = walkthroughable(View);

// "round" Steps – will try to round to the nearest step
const NICE_STEPS = [0.5, 1, 2, 5, 10, 20, 25, 50, 100, 200, 500, 1000];
// chart dimensions
const TOOLTIP_WIDTH = 150;
const TOOLTIP_HEIGHT = 105;
// define fix values for bars and spacing
const BAR_WIDTH = 30;
const BAR_SPACING = 8;
const INITIAL_SPACING = 5;

const WorkHoursChart = () => {
  // useTranslation hook to access translations
  const { t, i18n } = useTranslation();

  // get the data from the WorkHoursState
  const { data } = WorkHoursState();

  // initialize the accessibility store
  const accessMode = useAccessibilityStore(
    (state) => state.accessibilityEnabled,
  );

  // initialstate for the chart type
  const [chartType, setChartType] = useState("week");

  // state and types for the tooltip
  const [tooltipData, setTooltipData] = useState<{
    date: string;
    baseValue: number;
    overHours: number;
    plannedHours: number;
    x: number;
    y: number;
  } | null>(null);

  // ref for the scrollview
  const scrollViewRef = useRef<ScrollView>(null);

  // state for the card width
  const [cardWidth, setCardWidth] = useState<number>(0);

  // state for the chartHight
  const [chartHeight, setChartHeight] = useState<number>(200);

  // screensize for dynamic size calculation
  const screenWidth = Dimensions.get("window").width;

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
      // the values from the stack as above calculated
      const baseValue = item.stacks[0]?.value || 0;
      const overHours = item.stacks[1]?.value || 0;
      const plannedHours = item.plannedHours || 0;

      const barWidth = 22;
      const spacing = 24;
      const tooltipHeight = TOOLTIP_HEIGHT;
      const tooltipWidth = TOOLTIP_WIDTH;
      const max = yAxisConfig.maxValue || 1;

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
      const rawY =
        chartHeight -
        ((baseValue + overHours) / max) * chartHeight -
        tooltipHeight;

      // keep the tooltip within the inner frame
      const y = Math.max(0, rawY);

      setTooltipData({
        date: item.originalDate,
        baseValue,
        overHours,
        plannedHours, // planed value from Firestore
        x: adjustedX,
        y, // <- the clamped y position
      });
    }
  };

  // state to hold the selected year
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

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
          today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1), // define the start of the week
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
        return itemDate.getFullYear() === selectedYear;
      }
      return false;
    });
  };

  // function to calculate the accessibility bar label
  const getAccessibilityBarLabel = (item: any) => {
    const baseValue = item.stacks?.[0]?.value || 0;
    const overHours = item.stacks?.[1]?.value || 0;
    const planned = item.plannedHours || 0;

    return t("workHoursChart.accessibilityBar", {
      date: formatTooltipDate(item.originalDate, chartType, i18n.language),
      worked: formatTime(baseValue),
      expected: formatTime(planned),
      over: formatTime(overHours),
    });
  };

  // filter the data by chart type
  const filteredData = filterDataByChartType(data, chartType);

  // help function to formate the x-axis label in the different chart modes
  const formatDate = (dateString: string, viewMode: string) => {
    const date = new Date(dateString);
    if (viewMode === "year") {
      return date
        .toLocaleDateString("en-GB", { month: "short" })
        .replace(".", "");
    } else if (viewMode === "month") {
      return date.toLocaleDateString("en-GB", { day: "2-digit" });
    }
    // Week-Chart is the default
    return date.toLocaleDateString("en-GB", { day: "2-digit" });
  };

  // section that maps the data to the bar chart and calculates the year chart bar for every month
  let stackData: any[] = [];

  if (chartType === "year") {
    // define the monthly sums for each year as an object
    const monthlySums: {
      [key: string]: { expected: number; over: number; planned: number };
    } = {};
    // filter the data with the definitions above and calculate the monthly sums
    filteredData.forEach((item: any) => {
      const month = new Date(item.workDay).getMonth();
      const year = new Date(item.workDay).getFullYear();
      const key = `${year}-${month}`;

      if (!monthlySums[key]) {
        monthlySums[key] = { expected: 0, over: 0, planned: 0 };
      }

      const worked = Number(item.elapsedTime) || 0;
      const planned = Number(item.expectedHours) || 0;

      // worked-part, max. planed hours
      const base = worked < planned ? worked : planned;

      // Overhours only if more worked than planned
      const extra = worked > planned ? worked - planned : 0;

      monthlySums[key].expected += base; // really worked hours
      monthlySums[key].over += extra; // really over hours
      monthlySums[key].planned += planned; // planned hours
    });
    // map the monthly sums to the bar chart and format the x-axis labels
    stackData = Object.keys(monthlySums).map((key) => {
      // split the key into year and month
      const [year, month] = key.split("-");
      // create a date object for the month
      const dateForMonth = new Date(Number(year), Number(month), 1);
      // format the date
      const monthName = dateForMonth
        .toLocaleDateString(i18n.language, { month: "short" })
        .replace(".", "");
      const chartItem = {
        label: monthName,
        originalDate: dateForMonth.toISOString(),
        plannedHours: monthlySums[key].planned,
        stacks: [
          { value: monthlySums[key].expected, color: "gray" },
          { value: monthlySums[key].over, color: "aqua", marginBottom: 2 },
        ],
      };

      return {
        ...chartItem,
        accessibilityLabel: getAccessibilityBarLabel(chartItem),
      };
    });
  } else {
    // filter and map the data
    stackData = filteredData
      .filter((item: any) => item.elapsedTime > 0)
      .map((item: any) => {
        if (!item.workDay || isNaN(new Date(item.workDay).getTime())) {
          logWarn("WorkHoursChart.invalidWorkDay", {
            item,
            workDay: item?.workDay,
          });
          return null;
        }
        const formattedDate = formatDate(item.workDay, chartType);
        const workedDuration = Number(item.elapsedTime) || 0;
        const plannedHours = Number(item.expectedHours) || 0;
        // Basis: up to a maximum of the planned hours (expectedHours) or the actual time worked, if this is less
        const baseValue =
          workedDuration < plannedHours ? workedDuration : plannedHours;
        // Excess: only if the time worked exceeds the planned hours
        const extraValue =
          workedDuration > plannedHours ? workedDuration - plannedHours : 0;
        const chartItem = {
          label: formattedDate,
          originalDate: item.workDay,
          plannedHours,
          stacks: [
            { value: baseValue, color: "gray" },
            { value: extraValue, color: "aqua", marginBottom: 2 },
          ],
        };

        return {
          ...chartItem,
          accessibilityLabel: getAccessibilityBarLabel(chartItem),
        };
      })
      .filter((item: any) => item !== null);
  }

  // use the width of the screen to calculate the width of the chart
  const computedChartWidth =
    innerWidth > 0
      ? Math.max(
          innerWidth,
          INITIAL_SPACING +
            stackData.length * (BAR_WIDTH + BAR_SPACING) +
            BAR_SPACING,
        )
      : INITIAL_SPACING +
        stackData.length * (BAR_WIDTH + BAR_SPACING) +
        BAR_SPACING;

  // function to calculate the available years
  const availableYears = [
    ...new Set(data.map((item) => new Date(item.workDay).getFullYear())),
  ].sort((a, b) => b - a);

  // function to calculate the yAxisConfig
  const getYAxisConfig = () => {
    // 1) determine the maximum stacked value across stackData
    let maxSum = 0;
    let maxPlanned = 0;

    stackData.forEach((item) => {
      const sum =
        (item.stacks || []).reduce(
          (acc: number, curr: { value: number }) => acc + (curr?.value || 0),
          0,
        ) || 0;
      if (sum > maxSum) maxSum = sum;

      const planned = Number(item.plannedHours) || 0;
      if (planned > maxPlanned) maxPlanned = planned;
    });

    // empty data -> Chart should scale automatically
    if (maxSum === 0) {
      return { maxValue: undefined, noOfSections: 4 };
    }

    // 2) conditional scaling if the chart type is "year"
    let raw: number;
    if (chartType === "year") {
      // Year-Chart: skale with monthly capacity
      // so that the bars are proportional to the "utilization" for the month
      const reference = Math.max(maxSum, maxPlanned);
      raw = reference * 1.05;
    } else {
      // little buffer, so that the highest bar doesn't stick to the edge
      raw = maxSum * 1.1;
    }

    // 3) Initial step size & maximum number of sections per chart type
    // Year = Monthly totals -> coarse steps, few lines
    // Week/Month = Hourly values ​​-> fine steps
    let step = chartType === "year" ? 5 : 1;
    const maxSections = chartType === "year" ? 6 : 10;

    // 4) Increase the step size until the lines are no longer too close together
    let noOfSections = Math.ceil(raw / step);
    while (noOfSections > maxSections) {
      const next = NICE_STEPS.find((s) => s > step);
      if (!next) break;
      step = next;
      noOfSections = Math.ceil(raw / step);
    }

    // 5) maxValue = step * noOfSections -> smooth section values
    return { maxValue: step * noOfSections, noOfSections };
  };

  // calculate the Y-Axis config
  const yAxisConfig = getYAxisConfig();

  // function to calculate the accessibility entry label
  const getAccessibilityEntryLabel = (item: any) => {
    const baseValue = item.stacks?.[0]?.value || 0;
    const overHours = item.stacks?.[1]?.value || 0;
    const planned = item.plannedHours || 0;

    return t("workHoursChart.accessibilityEntry", {
      date: formatTooltipDate(item.originalDate, chartType),
      expected: formatTime(planned),
      worked: formatTime(baseValue),
      over:
        overHours > 0
          ? t("workHoursChart.accessibilityOverHours", {
              hours: formatTime(overHours),
            })
          : "",
    });
  };

  return (
    <>
      {/* Worktime-Tracker Screen copilot tour step 2 */}
      <CopilotStep
        name="Work-Hours Chart"
        order={3}
        text={t("workHoursChart.copilotDescription")}
      >
        <CopilotWalkthroughView>
          {/* TouchableWithoutFeedback to close the tooltip */}
          <TouchableWithoutFeedback onPress={() => setTooltipData(null)}>
            <View
              onLayout={(event: LayoutChangeEvent) =>
                setCardWidth(event.nativeEvent.layout.width)
              }
              style={{
                width: screenWidth * 0.9, // dynamic 90% of the screen width
                maxWidth: 600,
                height: "auto",
                borderWidth: 1,
                borderColor: "aqua",
                borderRadius: 12,
                paddingBottom: 20,
                backgroundColor: "#191919",
                overflow: "hidden",
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
                {t("workHoursChart.title")}
              </Text>

              <ChartRadioButtons
                chartType={chartType as "week" | "month" | "year"}
                setChartType={(type) => {
                  setChartType(type);
                  setTooltipData(null); // close tooltip if chart type changes
                }}
              />

              {chartType === "year" && (
                <YearSelector
                  years={availableYears}
                  selectedYear={selectedYear}
                  onChange={setSelectedYear}
                />
              )}
              {/* Frame-Container with horizontal scrollbar */}
              <View style={{ paddingHorizontal: cardPadding }}>
                {/* Horizontal scrollbarer container for the BarChart */}
                <ScrollView
                  horizontal
                  ref={scrollViewRef}
                  onScroll={(e) => setScrollX(e.nativeEvent.contentOffset.x)}
                  scrollEventThrottle={16}
                  contentContainerStyle={{
                    paddingRight: BAR_SPACING + BAR_WIDTH / 2,
                  }}
                >
                  <View
                    onLayout={(e) =>
                      setChartHeight(e.nativeEvent.layout.height)
                    }
                  >
                    <BarChart
                      key={`${chartType}-${selectedYear}-${stackData.length}`}
                      width={computedChartWidth}
                      yAxisLabelSuffix="h"
                      stackData={stackData}
                      maxValue={yAxisConfig.maxValue} // regulate the size of the Y-Axis
                      noOfSections={yAxisConfig.noOfSections}
                      barWidth={BAR_WIDTH}
                      initialSpacing={INITIAL_SPACING}
                      spacing={BAR_SPACING}
                      barBorderRadius={2.5}
                      isAnimated
                      yAxisColor={"white"}
                      xAxisColor={"white"}
                      rulesColor={"dimgray"} // color for the horizontal break lines
                      xAxisLabelTextStyle={{ color: "white" }}
                      yAxisTextStyle={{ color: "white" }}
                      onPress={(item: any, index: number) =>
                        handleBarPress(item, index)
                      }
                    />
                  </View>
                </ScrollView>

                {/* Tooltip */}
                {tooltipData && (
                  <View
                    style={{
                      position: "absolute",
                      width: 150,
                      height: 105,
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
                    <Text
                      style={{
                        fontSize: 14,
                        color: "white",
                        fontWeight: "bold",
                      }}
                    >
                      {`📅 ${formatTooltipDate(tooltipData.date, chartType, i18n.language)}`}
                    </Text>

                    <Text style={{ fontSize: 11, color: "white" }}>
                      {tooltipData.baseValue < tooltipData.plannedHours
                        ? t("workHoursChart.tooltipWorked", {
                            hours: formatTime(tooltipData.baseValue),
                          })
                        : t("workHoursChart.tooltipExpected", {
                            hours: formatTime(tooltipData.baseValue),
                          })}
                    </Text>

                    <Text style={{ fontSize: 11, color: "aqua" }}>
                      {t("workHoursChart.tooltipOver", {
                        hours: formatTime(tooltipData.overHours || 0),
                      })}
                    </Text>
                  </View>
                )}
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
                  <Text
                    style={{
                      marginLeft: 5,
                      fontSize: accessMode ? 18 : 14,
                      color: "white",
                    }}
                  >
                    {t("workHoursChart.expectedHours")}
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
                  <Text
                    style={{
                      marginLeft: 5,
                      fontSize: accessMode ? 18 : 14,
                      color: "white",
                    }}
                  >
                    {t("workHoursChart.overHours")}
                  </Text>
                </View>
              </View>

              {/* Listed Worktime Overview */}
              <View
                style={{ paddingHorizontal: cardPadding, alignItems: "center" }}
              >
                <View
                  style={{
                    minWidth: 320,
                    width: screenWidth * 0.8,
                    maxWidth: 500,
                    borderRadius: 10,
                    backgroundColor: "#191919",
                    marginVertical: 10,
                    shadowColor: "#ffffff",
                    elevation: 2,
                    shadowOffset: { width: 2, height: 2 },
                    shadowOpacity: 0.3,
                    shadowRadius: 3,
                    paddingHorizontal: 8,
                  }}
                  accessible={true}
                  accessibilityLabel={t("workHoursChart.accessibilityOverview")}
                >
                  {/* Header */}
                  <View style={{ width: "100%", alignItems: "center" }}>
                    <Text
                      style={{
                        color: "white",
                        fontWeight: "bold",
                        fontSize: accessMode ? 18 : 16,
                        padding: 12,
                        paddingBottom: 10,
                      }}
                      accessibilityRole="header"
                    >
                      {t("workHoursChart.overview")}
                    </Text>
                  </View>

                  {/* Listed-Values */}
                  {stackData.map((item, index) => {
                    const baseValue = item.stacks?.[0]?.value || 0;
                    const overHours = item.stacks?.[1]?.value || 0;
                    const planned = item.plannedHours || 0;

                    return (
                      <View
                        key={index}
                        style={{
                          padding: 16,
                          borderBottomWidth:
                            index < stackData.length - 1 ? 1 : 0,
                          borderBottomColor: "#333",
                          flexDirection: "row",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                        accessible={true}
                        accessibilityLabel={getAccessibilityEntryLabel(item)}
                      >
                        {/* Date */}
                        <View
                          style={{
                            alignItems: "flex-start",
                          }}
                        >
                          <Text
                            style={{
                              color: "white",
                              fontWeight: "bold",
                              fontSize: 16,
                            }}
                            accessibilityRole="header"
                          >
                            📅
                          </Text>

                          <Text
                            style={{
                              color: "white",
                              fontWeight: "bold",
                              fontSize: 16,
                            }}
                          >
                            {formatTooltipDate(
                              item.originalDate,
                              chartType,
                              i18n.language,
                            )}
                          </Text>
                        </View>

                        {/* Hour-Data */}
                        <View style={{ marginLeft: 8 }}>
                          <View
                            style={{
                              flexDirection: "row",
                              marginBottom: 4,
                              justifyContent: "flex-end",
                            }}
                          >
                            <Text
                              style={{
                                color: "white",
                                fontWeight: "600",
                                width: 100,
                                fontSize: accessMode ? 16 : 14,
                              }}
                            >
                              {t("workHoursChart.expected")}:
                            </Text>
                            <Text
                              style={{
                                color: "white",
                                fontSize: accessMode ? 16 : 14,
                              }}
                            >
                              {formatTime(planned)}h
                            </Text>
                          </View>

                          <View
                            style={{
                              flexDirection: "row",
                              marginBottom: 4,
                              justifyContent: "flex-end",
                            }}
                          >
                            <Text
                              style={{
                                color: "white",
                                fontWeight: "600",
                                width: 100,
                                fontSize: accessMode ? 16 : 14,
                              }}
                            >
                              {t("workHoursChart.worked")}:
                            </Text>
                            <Text
                              style={{
                                color: "white",
                                fontSize: accessMode ? 16 : 14,
                              }}
                            >
                              {formatTime(baseValue)}h
                            </Text>
                          </View>

                          {overHours > 0 && (
                            <View
                              style={{
                                flexDirection: "row",
                                justifyContent: "flex-end",
                              }}
                            >
                              <Text
                                style={{
                                  color: "aqua",
                                  fontWeight: "600",
                                  width: 100,
                                  fontSize: accessMode ? 16 : 14,
                                }}
                              >
                                {t("workHoursChart.over")}:
                              </Text>
                              <Text
                                style={{
                                  color: "aqua",
                                  fontSize: accessMode ? 16 : 14,
                                }}
                              >
                                {formatTime(overHours)}h
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </CopilotWalkthroughView>
      </CopilotStep>
    </>
  );
};

export default WorkHoursChart;

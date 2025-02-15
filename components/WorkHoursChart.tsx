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

const WorkHoursChart = () => {
  // Hole die Daten aus dem WorkHoursState
  const { data } = WorkHoursState();
  // State für den initialen Chart-Typ
  const [chartType, setChartType] = useState("week");
  // State für das Tooltip
  const [tooltipData, setTooltipData] = useState<{
    date: string;
    expectedHours: number;
    overHours: number;
    x: number;
    y: number;
  } | null>(null);
  // Ref für den ScrollView, um die Scrollposition zu steuern
  const scrollViewRef = useRef<ScrollView>(null);
  // State, um die Breite der Card zu messen
  const [cardWidth, setCardWidth] = useState<number>(0);

  // Padding, der als "Frame" dient
  const cardPadding = 16;

  // Berechne die innere Breite (Frame-Breite) der Card
  const innerWidth = cardWidth > 0 ? cardWidth - 2 * cardPadding : 0;

  // Zurücksetzen der Scrollposition, wenn der Charttyp wechselt
  useEffect(() => {
    scrollViewRef.current?.scrollTo({ x: 0, animated: true });
  }, [chartType]);

  // Funktion zur Behandlung eines Balken-Taps
  const handleBarPress = (item: any, index: number) => {
    if (item?.stacks) {
      const expectedHours = item.stacks[0]?.value || 0;
      const overHours = item.stacks[1]?.value || 0;

      const barWidth = 22;
      const spacing = 24;
      const chartHeight = 400;
      const scaleFactor = chartType === "year" ? 2 : 15; // Skalierungsfaktor anpassen
      const tooltipHeight = 80;

      const x = index * (barWidth + spacing) + barWidth / 2;
      let y =
        chartHeight - (expectedHours + overHours) * scaleFactor - tooltipHeight;

      // Passe die x-Position an, damit das Tooltip nicht abgeschnitten wird
      let adjustedX = x;
      if (x < 40) adjustedX += 50;
      if (x > 300) adjustedX -= 50;

      setTooltipData({
        date: item.label,
        expectedHours,
        overHours,
        x: adjustedX,
        y,
      });
    }
  };

  // Funktion zum Filtern der Daten je nach Chart-Typ
  const filterDataByChartType = (data: any, type: string) => {
    const today = new Date();
    return data.filter((item: { workDay: string }) => {
      const itemDate = new Date(item.workDay);
      if (type === "week") {
        const dayOfWeek = today.getDay(); // 0 = Sonntag, 1 = Montag, ...
        const startOfWeek = new Date(today);
        startOfWeek.setDate(
          today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1)
        );
        startOfWeek.setHours(0, 0, 0, 0);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);
        return itemDate >= startOfWeek && itemDate <= endOfWeek;
      } else if (type === "month") {
        return (
          itemDate.getMonth() === today.getMonth() &&
          itemDate.getFullYear() === today.getFullYear()
        );
      } else if (type === "year") {
        return itemDate.getFullYear() === today.getFullYear();
      }
      return false;
    });
  };

  const filteredData = filterDataByChartType(data, chartType);

  // Hilfsfunktion zum Formatieren des x-Achsen-Labels
  const formatDate = (dateString: string, viewMode: string) => {
    const date = new Date(dateString);
    if (viewMode === "year") {
      return date
        .toLocaleDateString("de-DE", { month: "short" })
        .replace(".", "");
    } else if (viewMode === "month") {
      return date.toLocaleDateString("de-DE", { day: "2-digit" });
    }
    return date.toLocaleDateString("de-DE", { day: "2-digit" });
  };

  // Mapping der Daten für den BarChart
  let stackData: any[] = [];

  if (chartType === "year") {
    const monthlySums: { [key: string]: { expected: number; over: number } } =
      {};
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

  // Definiere feste Werte für Balken & Spacing
  const barWidth = 30;
  const spacing = 8;
  const initialSpacing = 5;
  // Verwende die gemessene cardWidth als Mindestbreite (falls bereits vorhanden)
  const computedChartWidth =
    innerWidth > 0
      ? Math.max(
          innerWidth,
          initialSpacing + stackData.length * (barWidth + spacing) + spacing
        )
      : initialSpacing + stackData.length * (barWidth + spacing) + spacing;

  return (
    // Mit TouchableWithoutFeedback schließen wir das Tooltip beim Tippen außerhalb
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
            setTooltipData(null); // Tooltip schließen beim Wechsel des Chart-Typs
          }}
        />
        {/* Frame-Container mit horizontalem Padding */}
        <View style={{ paddingHorizontal: cardPadding }}>
          {/* Horizontal scrollbarer Container für den BarChart */}
          <ScrollView
            horizontal
            ref={scrollViewRef}
            contentContainerStyle={{ paddingRight: spacing + barWidth / 2 }}
          >
            <BarChart
              width={computedChartWidth}
              maxValue={Math.max(
                ...stackData.map(
                  (item: { stacks: { value: number }[] }) =>
                    item.stacks[0].value + item.stacks[1].value
                )
              )}
              noOfSections={6}
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

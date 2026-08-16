//////////////////////////////////ChartRadioButtons Component////////////////////////////////

// This component is used to show the chart radio buttons in the WorkHours Chart card

/////////////////////////////////////////////////////////////////////////////////////////////

import { View, Text, TouchableOpacity } from "react-native";
import React from "react";
import { useTranslation } from "react-i18next";

import { useAccessibilityStore } from "../components/services/accessibility/accessibilityStore";

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
  // useTranslation hook to access translations
  const { t } = useTranslation();

  // initialize the accessibility store
  const accessMode = useAccessibilityStore(
    (state) => state.accessibilityEnabled,
  );

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
        <Text style={{ fontSize: accessMode ? 18 : 16, color: "white" }}>
          {t("chart.week")}
        </Text>
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
        <Text style={{ fontSize: accessMode ? 18 : 16, color: "white" }}>
          {t("chart.month")}
        </Text>
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
        <Text style={{ fontSize: accessMode ? 18 : 16, color: "white" }}>
          {t("chart.year")}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

export default ChartRadioButtons;

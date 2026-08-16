////////////////////////////////// YearSelector Component ////////////////////////////////

// This component is used to select the year in the WorkHours Chart year view

/////////////////////////////////////////////////////////////////////////////////////////

import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useTranslation } from "react-i18next";

import { useAccessibilityStore } from "../components/services/accessibility/accessibilityStore";

/////////////////////////////////////////////////////////////////////////////////////////

interface YearSelectorProps {
  years: number[];
  selectedYear: number;
  onChange: (year: number) => void;
}

/////////////////////////////////////////////////////////////////////////////////////////

const YearSelector: React.FC<YearSelectorProps> = ({
  years,
  selectedYear,
  onChange,
}) => {
  // useTranslation hook to access translations
  const { t } = useTranslation();

  const accessMode = useAccessibilityStore(
    (state) => state.accessibilityEnabled,
  );

  const currentIndex = years.indexOf(selectedYear);

  const selectPreviousYear = () => {
    if (currentIndex < years.length - 1) {
      onChange(years[currentIndex + 1]);
    }
  };

  const selectNextYear = () => {
    if (currentIndex > 0) {
      onChange(years[currentIndex - 1]);
    }
  };

  return (
    <View
      style={{
        alignItems: "center",
        marginBottom: 20,
      }}
    >
      <Text
        accessible={true}
        accessibilityRole="header"
        accessibilityLabel={t("yearSelector.title")}
        style={{
          color: "white",
          fontSize: accessMode ? 18 : 16,
          fontWeight: "bold",
          marginBottom: 8,
        }}
      >
        {t("yearSelector.title")}
      </Text>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <TouchableOpacity
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={t("yearSelector.previousYear")}
          accessibilityHint={
            currentIndex >= years.length - 1
              ? t("yearSelector.previousYearUnavailable")
              : t("yearSelector.previousYearHint")
          }
          accessibilityState={{
            disabled: currentIndex >= years.length - 1,
          }}
          onPress={selectPreviousYear}
          disabled={currentIndex >= years.length - 1}
          style={{
            paddingHorizontal: 15,
            paddingVertical: 5,
          }}
        >
          <Text
            accessible={false}
            style={{
              color: currentIndex >= years.length - 1 ? "gray" : "aqua",
              fontSize: 24,
            }}
          >
            ◀
          </Text>
        </TouchableOpacity>

        <View
          accessible={true}
          accessibilityRole="text"
          accessibilityLabel={t("yearSelector.selectedYear", {
            year: selectedYear,
          })}
          style={{
            minWidth: 90,
            paddingVertical: 8,
            paddingHorizontal: 15,
            borderWidth: 1,
            borderColor: "aqua",
            borderRadius: 8,
            backgroundColor: "#191919",
            alignItems: "center",
          }}
        >
          <Text
            accessible={false}
            style={{
              color: "white",
              fontSize: accessMode ? 18 : 16,
              fontWeight: "bold",
            }}
          >
            {selectedYear}
          </Text>
        </View>

        <TouchableOpacity
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={t("yearSelector.nextYear")}
          accessibilityHint={
            currentIndex <= 0
              ? t("yearSelector.nextYearUnavailable")
              : t("yearSelector.nextYearHint")
          }
          accessibilityState={{
            disabled: currentIndex <= 0,
          }}
          onPress={selectNextYear}
          disabled={currentIndex <= 0}
          style={{
            paddingHorizontal: 15,
            paddingVertical: 5,
          }}
        >
          <Text
            accessible={false}
            style={{
              color: currentIndex <= 0 ? "gray" : "aqua",
              fontSize: 24,
            }}
          >
            ▶
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default YearSelector;

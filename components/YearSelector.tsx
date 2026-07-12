////////////////////////////////// YearSelector Component ////////////////////////////////

// This component is used to select the year in the WorkHours Chart year view

/////////////////////////////////////////////////////////////////////////////////////////

import React from "react";
import { View, Text, TouchableOpacity } from "react-native";

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
        style={{
          color: "white",
          fontSize: accessMode ? 18 : 16,
          fontWeight: "bold",
          marginBottom: 8,
        }}
      >
        Year
      </Text>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <TouchableOpacity
          onPress={selectPreviousYear}
          disabled={currentIndex >= years.length - 1}
          style={{
            paddingHorizontal: 15,
            paddingVertical: 5,
          }}
        >
          <Text
            style={{
              color: currentIndex >= years.length - 1 ? "gray" : "aqua",
              fontSize: 24,
            }}
          >
            ◀
          </Text>
        </TouchableOpacity>

        <View
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
          onPress={selectNextYear}
          disabled={currentIndex <= 0}
          style={{
            paddingHorizontal: 15,
            paddingVertical: 5,
          }}
        >
          <Text
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

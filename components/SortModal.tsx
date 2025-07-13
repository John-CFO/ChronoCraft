// ///////////////////////SortModalFAB Component////////////////////////////

// // This component is used to show a modal to sort the projects

// /////////////////////////////////////////////////////////////////////////

import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Dimensions,
  findNodeHandle,
  AccessibilityInfo,
} from "react-native";
import React, { useEffect, useRef } from "react";
import { LinearGradient } from "expo-linear-gradient";

import { useAccessibilityStore } from "../components/services/accessibility/accessibilityStore";

/////////////////////////////////////////////////////////////////////////////

type SortModalFABProps = {
  currentSort: string;
  onSortChange: (sortValue: string) => void;
  onClose: () => void;
};

/////////////////////////////////////////////////////////////////////////////

// options to sort the projects
const sortOptions = [
  { label: "Newest first", value: "DATE_DESC" },
  { label: "Oldest first", value: "DATE_ASC" },
  { label: "Name A–Z", value: "NAME_ASC" },
  { label: "Name Z–A", value: "NAME_DESC" },
];

const SortModalFAB = ({
  currentSort,
  onSortChange,
  onClose,
}: SortModalFABProps) => {
  // hook to announce accessibility
  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(
      "Sort Modal opened. Please select a sort option."
    );
  }, []);

  // ref to navigate to sort title
  const sortTitleRef = useRef(null);
  // hook to focus the sort title by accessibility
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (sortTitleRef.current) {
        const node = findNodeHandle(sortTitleRef.current);
        if (node) AccessibilityInfo.setAccessibilityFocus(node);
      }
    }, 300); // Delay in milliseconds

    return () => clearTimeout(timeout);
  }, []);

  // screensize for dynamic size calculation
  const screenWidth = Dimensions.get("window").width;

  // function to handle sort selection
  const handleSelect = (value: string) => {
    onSortChange(value);
    onClose();
  };

  // initialize the accessibility store
  const accessMode = useAccessibilityStore(
    (state) => state.accessibilityEnabled
  );
  // console.log("accessMode in LoginScreen:", accessMode);

  return (
    <View
      accessible={true}
      accessibilityViewIsModal={true}
      style={{
        width: screenWidth * 0.9,
        maxWidth: 600,
        backgroundColor: "black",
        padding: 20,
        borderRadius: 15,
        borderWidth: 2,
        borderColor: "lightgrey",
        alignItems: "center",
      }}
    >
      {/* header */}
      <View
        accessibilityRole="header"
        accessibilityLabel="Sort your projects"
        style={{
          width: 330,
          height: 80,
          borderBottomColor: "lightgrey",
          borderBottomWidth: 0.5,
          justifyContent: "flex-end",
          alignItems: "center",
        }}
      >
        <Text
          ref={sortTitleRef}
          style={{
            color: "white",
            fontSize: 32,
            fontFamily: "MPLUSLatin_Bold",
            marginBottom: 11,
            marginRight: 9,
          }}
        >
          Sort your projects
        </Text>
      </View>

      {/* sort options */}
      <FlatList
        style={{ marginTop: 20, marginBottom: 20, width: "100%" }}
        data={sortOptions}
        keyExtractor={(item) => item.value}
        renderItem={({ item }) => {
          const isSelected = item.value === currentSort;

          return (
            <TouchableOpacity
              style={{
                borderRadius: 8,
                overflow: "hidden",
                marginBottom: 8,
                alignItems: "center",
              }}
              onPress={() => handleSelect(item.value)}
              accessibilityRole="button"
              accessibilityLabel={`Sort option: ${item.label}${isSelected ? ", selected" : ""}`}
              accessibilityState={{ selected: isSelected }}
            >
              {isSelected ? (
                <LinearGradient
                  colors={["#00f7f7", "#005757"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    paddingVertical: 12,
                    paddingHorizontal: 10,
                    width: "100%",
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      fontSize: accessMode ? 22 : 16,
                      color: "#191919",
                      fontWeight: "bold",
                    }}
                  >
                    {item.label}
                  </Text>
                </LinearGradient>
              ) : (
                <View
                  style={{
                    paddingVertical: 12,
                    paddingHorizontal: 10,
                    width: "100%",
                    alignItems: "center",
                    backgroundColor: "transparent",
                  }}
                >
                  <Text
                    style={{
                      fontSize: accessMode ? 22 : 16,
                      color: "white",
                    }}
                  >
                    {item.label}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        }}
      />
      {/* navigation tip */}
      <View
        style={{
          height: 45,
          width: 330,
          marginTop: 20,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Text
          accessible
          accessibilityLabel="Navigation tip"
          accessibilityHint="Swipe up or down to close"
          style={{
            fontSize: accessMode ? 20 : 18,
            color: accessMode ? "white" : "lightgrey",
            fontFamily: accessMode
              ? "MPLUSLatin_Regular"
              : "MPLUSLatin_ExtraLight",
          }}
        >
          swipe up or down to close
        </Text>
      </View>
    </View>
  );
};

export default SortModalFAB;

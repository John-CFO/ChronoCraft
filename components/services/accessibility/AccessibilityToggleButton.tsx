////////////////////////////AccessibilityToggleButton Component////////////////////////////////

// This component is used to toggle the accessibility mode on and off when the user clicks on the button

//////////////////////////////////////////////////////////////////////////////////////////////

import React from "react";
import { TouchableOpacity, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAccessibilityStore } from "./accessibilityStore";

//////////////////////////////////////////////////////////////////////////////////////////////

const AccessibilityToggleButton = () => {
  // initialize the useAccessibilityStore hook
  const isAccessible = useAccessibilityStore(
    (state) => state.accessibilityEnabled
  );

  // function to toggle the accessibility mode
  const toggleAccessibility = useAccessibilityStore(
    (state) => state.toggleAccessibility
  );

  return (
    <TouchableOpacity
      onPress={toggleAccessibility}
      accessibilityRole="button"
      accessibilityLabel="Toggle Accessibility Mode"
      accessibilityHint="Activates or deactivates screen reader optimized mode"
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 18,
        paddingVertical: 8,
        gap: 30,
      }}
    >
      {/* button icon */}
      <Ionicons
        name={isAccessible ? "accessibility-sharp" : "accessibility-outline"}
        size={24}
        color={isAccessible ? "aqua" : "darkgrey"}
      />
      {/* button text */}
      <Text
        style={{
          fontSize: 22,
          color: isAccessible ? "aqua" : "darkgrey",
          fontFamily: "MPLUSLatin_Regular",
        }}
      >
        Accessibility {isAccessible ? "On" : "Off"}
      </Text>
    </TouchableOpacity>
  );
};

export default AccessibilityToggleButton;

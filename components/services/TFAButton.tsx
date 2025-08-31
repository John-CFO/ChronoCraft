///////////////////////TFAButton Component////////////////////////////

// THis component creates a button to open the 2FA settings from the drawer

/////////////////////////////////////////////////////////////////////

import { View, Text, TouchableOpacity } from "react-native";
import React from "react";
import { AntDesign } from "@expo/vector-icons";

////////////////////////////////////////////////////////////////////

interface TFAButtonProps {
  onPress: () => void;
  isEnrolled: boolean;
}

////////////////////////////////////////////////////////////////////

const TFAButton: React.FC<TFAButtonProps> = ({ onPress, isEnrolled }) => {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel="Two Factor Authentication Settings"
      onPress={onPress}
    >
      <View
        style={{
          flexDirection: "row",
          paddingVertical: 8,
          gap: 30,
          alignItems: "center",
          paddingHorizontal: 15,
        }}
      >
        <AntDesign
          name="lock"
          size={26}
          color={isEnrolled ? "aqua" : "darkgrey"}
        />
        <Text
          style={{
            color: isEnrolled ? "aqua" : "darkgrey",
            fontFamily: "MPLUSLatin_Regular",
            fontSize: 22,
          }}
        >
          {`2FA Settings ${isEnrolled ? "On" : "Off"}`}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

export default TFAButton;

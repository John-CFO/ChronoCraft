///////////////////////TFAButton Component////////////////////////////

// THis component creates a button to open the 2FA settings from the drawer

/////////////////////////////////////////////////////////////////////

import { View, Text, TouchableOpacity } from "react-native";
import React from "react";
import { AntDesign } from "@expo/vector-icons";

////////////////////////////////////////////////////////////////////

interface MFAButtonProps {
  onPress: () => void;
  isEnrolled: boolean | null;
  disabled?: boolean;
}

////////////////////////////////////////////////////////////////////

const MFAButton: React.FC<MFAButtonProps> = ({
  onPress,
  isEnrolled,
  disabled,
}) => {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel="Multi Factor Authentication Settings"
      onPress={onPress}
      disabled={!!disabled}
      style={{ opacity: disabled ? 0.5 : 1 }}
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
          {`MFA Settings ${isEnrolled ? "On" : "Off"}`}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

export default MFAButton;

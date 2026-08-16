///////////////////////TFAButton Component////////////////////////////

// THis component creates a button to open the 2FA settings from the drawer

/////////////////////////////////////////////////////////////////////

import { View, Text, TouchableOpacity } from "react-native";
import React from "react";
import { AntDesign } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

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
  // useTranslation hook to access translations
  const { t } = useTranslation();

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={t("mfa.accessibility")}
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
          {`${t("mfa.settings")} ${isEnrolled ? t("mfa.on") : t("mfa.off")}`}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

export default MFAButton;

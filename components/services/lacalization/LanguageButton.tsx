import React from "react";
import { TouchableOpacity, Text, View } from "react-native";
import AntDesign from "@expo/vector-icons/AntDesign";
import { useTranslation } from "react-i18next";

//////////////////////////////////////////////////////////////////////////////////////

interface LanguageButtonProps {
  onPress: () => void;
}

//////////////////////////////////////////////////////////////////////////////////////

const LanguageButton: React.FC<LanguageButtonProps> = ({ onPress }) => {
  const { t } = useTranslation();
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={t("drawer.chooseLanguage")}
      accessibilityHint="Opens the language selection"
      onPress={onPress}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingVertical: 8,
          paddingHorizontal: 16,
          gap: 30,
        }}
      >
        <AntDesign name="earth" size={26} color="darkgrey" />

        <Text
          style={{
            color: "darkgrey",
            fontSize: 22,
            fontFamily: "MPLUSLatin_Regular",
          }}
        >
          {t("drawer.language")}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

export default LanguageButton;

//////////////////////////// ErrorBoundaryContent Component////////////////////////////

// This component is used to catch errors in the app and show a message to the user.
// The user can also refresh the page to try again.

///////////////////////////////////////////////////////////////////////////////

import React from "react";
import { Text, View, TouchableOpacity } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";

///////////////////////////////////////////////////////////////////////////////

export const ErrorBoundaryContent: React.FC<{ onRefresh: () => void }> = ({
  onRefresh,
}) => {
  // useTranslation hook to access translations
  const { t } = useTranslation();

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "black",
        width: "100%",
        height: "100%",
      }}
    >
      <Text
        style={{
          fontFamily: "MPLUSLatin_Bold",
          fontSize: 22,
          color: "white",
          marginBottom: 20,
          textAlign: "center",
        }}
      >
        {t("errorBoundary.message")}
      </Text>

      <TouchableOpacity
        onPress={onRefresh}
        accessibilityRole="button"
        accessibilityLabel={t("errorBoundary.refresh")}
        style={{
          marginTop: 30,
          width: 280,
          borderRadius: 12,
          overflow: "hidden",
          borderWidth: 3,
          borderColor: "white",
          marginBottom: 20,
        }}
      >
        <LinearGradient
          colors={["#00FFFF", "#FFFFFF"]}
          style={{
            alignItems: "center",
            justifyContent: "center",
            height: 45,
            width: 280,
          }}
        >
          <Text
            style={{
              color: "grey",
              fontSize: 22,
              fontFamily: "MPLUSLatin_Bold",
              marginBottom: 11,
              marginRight: 9,
            }}
          >
            {t("errorBoundary.refresh")}
          </Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
};

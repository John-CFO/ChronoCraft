/////////////////////////////RestartTourButton Component////////////////////////////////////

// This component is used to restart the copilot tour

////////////////////////////////////////////////////////////////////////////////////////////

import React from "react";
import { TouchableOpacity, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import Entypo from "@expo/vector-icons/Entypo";
import { useTranslation } from "react-i18next";

import { resetTourFlags } from "./TourService";
import { useAlertStore } from "../customAlert/alertStore";
import { logError } from "../../../lib/loggerClient";

////////////////////////////////////////////////////////////////////////////////////////////

interface RestartTourProps {
  userId: string;
}

////////////////////////////////////////////////////////////////////////////////////////////

const RestartTourButton: React.FC<RestartTourProps> = ({ userId }) => {
  // useTranslation hook to access translations
  const { t } = useTranslation();

  // initialize navigation
  const navigation = useNavigation<any>();

  // function to restart tour
  const handleRestartTour = async () => {
    try {
      if (!userId) {
        throw new Error("User ID is not available");
      }
      await resetTourFlags(userId!);

      // feedback to the user
      useAlertStore
        .getState()
        .showAlert(t("tour.restartAlertTitle"), t("tour.restartAlertMessage"));

      //  reload the screen
      navigation.navigate("Inside", {
        screen: "Home",
        params: { triggerReload: Date.now() },
      });
    } catch (error) {
      logError("RestartTourButton/restartTour", error);
    }
  };

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={t("tour.restartAccessibility")}
      onPress={handleRestartTour}
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
        <Entypo name="graduation-cap" size={26} color="darkgrey" />
        <Text
          style={{
            color: "darkgrey",
            fontSize: 22,
            fontFamily: "MPLUSLatin_Regular",
          }}
        >
          {t("tour.restart")}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

export default RestartTourButton;

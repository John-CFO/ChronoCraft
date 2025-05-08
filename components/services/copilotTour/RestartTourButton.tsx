/////////////////////////////RestartTourButton Component////////////////////////////////////

// This component is used to restart the copilot tour

////////////////////////////////////////////////////////////////////////////////////////////

import React from "react";
import { TouchableOpacity, Text, View, Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import Entypo from "@expo/vector-icons/Entypo";

import { resetTourFlags } from "./TourService";

////////////////////////////////////////////////////////////////////////////////////////////

interface RestartTourProps {
  userId: string;
}

////////////////////////////////////////////////////////////////////////////////////////////

const RestartTourButton: React.FC<RestartTourProps> = ({ userId }) => {
  // initialize navigation
  const navigation = useNavigation<any>();

  // function to restart tour
  const handleRestartTour = async () => {
    try {
      if (!userId) {
        throw new Error("User ID is not available");
      }
      await resetTourFlags(userId!);

      // Optional: Feedback to the user
      Alert.alert(
        "Restart Tour",
        "The tour will be shown again when opening the respective screens."
      );

      // Optional: reload the screen
      navigation.navigate("Home"); // or any other screen
    } catch (error) {
      console.log("Error restarting tour:", error);
    }
  };

  return (
    <TouchableOpacity onPress={handleRestartTour}>
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
          Restart Tour
        </Text>
      </View>
    </TouchableOpacity>
  );
};

export default RestartTourButton;

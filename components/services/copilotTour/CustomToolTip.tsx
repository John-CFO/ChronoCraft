///////////////////////////////////CustomTooltip Component////////////////////////////

// This component creates the custom tooltip for the copilot tour

//////////////////////////////////////////////////////////////////////////////////////

import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useCopilot } from "react-native-copilot";
import { LinearGradient } from "expo-linear-gradient";

//////////////////////////////////////////////////////////////////////////////////////

export interface TooltipProps {
  labels: Labels;
}

export type Labels = Partial<
  Record<"skip" | "previous" | "next" | "finish", string>
>;

//////////////////////////////////////////////////////////////////////////////////////

const CustomTooltip = ({ labels }: TooltipProps) => {
  // get copilot hooks
  const { goToNext, goToPrev, stop, currentStep, isFirstStep, isLastStep } =
    useCopilot();

  // functions to navigate to the next or previous step
  const handleStop = () => {
    void stop();
  };

  const handleNext = () => {
    void goToNext();
  };

  const handlePrev = () => {
    void goToPrev();
  };

  return (
    <View
      style={{
        backgroundColor: "#191919",
        borderRadius: 12,
        padding: 16,
        alignItems: "center",
        width: 250,
      }}
    >
      {/* Tooltip Title */}
      <Text
        style={{
          fontWeight: "bold",
          color: "#FFF",
          fontSize: 18,
          marginBottom: 8,
        }}
      >
        {currentStep?.name}
      </Text>

      {/* Tooltip Text */}
      <Text
        style={{
          fontSize: 14,
          color: "#FFF",
          textAlign: "center",
          marginBottom: 16,
        }}
      >
        {currentStep?.text}
      </Text>

      {/* Buttons*/}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {/* Skip-Button, if it is not the last step*/}
        {!isLastStep && (
          <TouchableOpacity
            onPress={handleStop}
            style={{
              height: 40,
              width: 65,
              borderRadius: 8,
              borderWidth: 1.5,
              borderColor: "white",
              backgroundColor: "transparent",
              shadowColor: "black",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.3,
              shadowRadius: 3,
              elevation: 5,
            }}
          >
            <LinearGradient
              colors={["#FFFFFF", "#AAAAAA"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
                borderRadius: 6,
              }}
            >
              <Text style={{ color: "grey", fontSize: 14, fontWeight: "bold" }}>
                {labels.skip ?? "Skip"}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* Previous-Button */}
        {!isFirstStep && (
          <TouchableOpacity
            onPress={handlePrev}
            style={{
              height: 40,
              width: 65,
              borderRadius: 8,
              borderWidth: 1.5,
              borderColor: "aqua",
              backgroundColor: "transparent",
              shadowColor: "black",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.3,
              shadowRadius: 3,
              elevation: 5,
            }}
          >
            <LinearGradient
              colors={["#00f7f7", "#005757"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
                borderRadius: 6,
              }}
            >
              <Text
                style={{ color: "white", fontSize: 14, fontWeight: "bold" }}
              >
                {labels.previous ?? "Previous"}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* Next oder Finish */}
        {!isLastStep ? (
          <TouchableOpacity
            onPress={handleNext}
            style={{
              height: 40,
              width: 65,
              borderRadius: 8,
              borderWidth: 1.5,
              borderColor: "aqua",
              backgroundColor: "transparent",
              shadowColor: "black",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.3,
              shadowRadius: 3,
              elevation: 5,
            }}
          >
            <LinearGradient
              colors={["#00f7f7", "#005757"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
                borderRadius: 6,
              }}
            >
              <Text
                style={{ color: "white", fontSize: 14, fontWeight: "bold" }}
              >
                {labels.next ?? "Next"}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={handleStop}
            style={{
              height: 40,
              width: 80,
              borderRadius: 8,
              borderWidth: 1.5,
              borderColor: "aqua",
              backgroundColor: "transparent",
              shadowColor: "black",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.3,
              shadowRadius: 3,
              elevation: 5,
            }}
          >
            <LinearGradient
              colors={["#00f7f7", "#005757"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
                borderRadius: 6,
              }}
            >
              <Text
                style={{ color: "white", fontSize: 14, fontWeight: "bold" }}
              >
                {labels.finish ?? "Finish"}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

export default CustomTooltip;

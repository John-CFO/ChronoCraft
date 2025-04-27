///////////////////////////////////CustomTooltip Component////////////////////////////

// This component creates the custom tooltip for the copilot tour

//////////////////////////////////////////////////////////////////////////////////////

import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useCopilot } from "react-native-copilot";

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
              borderWidth: 2,
              borderColor: "white",
              backgroundColor: "lightgray",
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 8,
            }}
          >
            <Text style={{ color: "grey", fontSize: 14, fontWeight: "bold" }}>
              {labels.skip ?? "Skip"}
            </Text>
          </TouchableOpacity>
        )}

        {/* Previous-Button */}
        {!isFirstStep && (
          <TouchableOpacity
            onPress={handlePrev}
            style={{
              borderWidth: 2,
              borderColor: "white",
              backgroundColor: "aqua",
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 8,
            }}
          >
            <Text style={{ color: "gray", fontSize: 14, fontWeight: "bold" }}>
              {labels.previous ?? "Previous"}
            </Text>
          </TouchableOpacity>
        )}

        {/* Next oder Finish */}
        {!isLastStep ? (
          <TouchableOpacity
            onPress={handleNext}
            style={{
              borderWidth: 2,
              borderColor: "white",
              backgroundColor: "aqua",
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 8,
            }}
          >
            <Text style={{ color: "grey", fontSize: 14, fontWeight: "bold" }}>
              {labels.next ?? "Next"}
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={handleStop}
            style={{
              borderWidth: 2,
              borderColor: "white",
              backgroundColor: "aqua",
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 8,
            }}
          >
            <Text style={{ color: "grey", fontSize: 14, fontWeight: "bold" }}>
              {labels.finish ?? "Finish"}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

export default CustomTooltip;

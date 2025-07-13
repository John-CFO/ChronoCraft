///////////////////////////////////CustomTooltip Component////////////////////////////

// This component creates the custom tooltip for the copilot tour

//////////////////////////////////////////////////////////////////////////////////////

import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useCopilot } from "react-native-copilot";
import { LinearGradient } from "expo-linear-gradient";

import { useAccessibilityStore } from "../accessibility/accessibilityStore";

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

  // initialize the accessibility store
  const accessMode = useAccessibilityStore(
    (state) => state.accessibilityEnabled
  );
  // console.log("accessMode in LoginScreen:", accessMode);

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
      accessible={true}
      accessibilityLabel={`${currentStep?.name}. ${currentStep?.text}`}
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
        accessibilityRole="header"
        style={{
          fontWeight: "bold",
          color: "#FFF",
          fontSize: accessMode ? 28 : 18,
          marginBottom: 8,
        }}
      >
        {currentStep?.name}
      </Text>

      {/* Tooltip Text */}
      <Text
        style={{
          fontSize: accessMode ? 18 : 14,
          color: "#FFF",
          textAlign: "center",
          marginBottom: 16,
        }}
      >
        {currentStep?.text}
      </Text>

      {/* Buttons*/}
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 8,
          width: "100%",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        {/* Skip-Button, if it is not the last step*/}
        {!isLastStep && (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={labels.skip ?? "Skip"}
            accessibilityHint="End the tour and close the tooltip"
            onPress={handleStop}
            style={{
              height: 40,
              width: accessMode ? 90 : 65,
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
              <Text
                numberOfLines={1}
                style={{
                  color: accessMode ? "black" : "grey",
                  fontSize: accessMode ? 18 : 14,
                  fontWeight: "bold",
                }}
              >
                {labels.skip ?? "Skip"}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* Previous-Button */}
        {!isFirstStep && (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={labels.previous ?? "Previous"}
            accessibilityHint="Back to the previous step"
            onPress={handlePrev}
            style={{
              height: 40,
              width: accessMode ? 90 : 65,
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
                style={{
                  color: "white",
                  fontSize: accessMode ? 18 : 14,
                  fontWeight: "bold",
                }}
              >
                {labels.previous ?? "Previous"}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* Next oder Finish */}
        {!isLastStep ? (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={labels.next ?? "Next"}
            accessibilityHint="Go to the next step"
            onPress={handleNext}
            style={{
              height: 40,
              width: accessMode ? 90 : 65,
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
                numberOfLines={1}
                style={{
                  color: "white",
                  fontSize: accessMode ? 18 : 14,
                  fontWeight: "bold",
                }}
              >
                {labels.next ?? "Next"}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={labels.finish ?? "Finish"}
            accessibilityHint="End the tour and close the tooltip"
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
                numberOfLines={1}
                style={{
                  color: "white",
                  fontSize: accessMode ? 18 : 14,
                  fontWeight: "bold",
                }}
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

/////////////////////////////////////////CheckmarkReminder Component////////////////////////////////

import React, { useRef } from "react";
import { View, TouchableOpacity, Animated, Text } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

////////////////////////////////////////////////////////////////////////////////////////////////////
type CheckmarkReminderProps = {
  selectedOption: number | null;
  onSelect: (index: number) => void;
};

////////////////////////////////////////////////////////////////////////////////////////////////////

const CheckmarkReminder: React.FC<CheckmarkReminderProps> = ({
  onSelect,
  selectedOption,
}) => {
  //function to initialize the animation using useRef
  const animations = Array.from({ length: 3 }, () => ({
    translateYAnim: useRef(new Animated.Value(0)).current, // move up or down animation of the point
    scaleAnim: useRef(new Animated.Value(0)).current, // size of the point when point is moving
  })); // Animationswerte für jeden Punkt

  const handlePress = (index: number) => {
    onSelect(index); // active the selected point

    animations.forEach((anim, i) => {
      if (i === index) {
        // start animation for selected point
        Animated.sequence([
          Animated.parallel([
            Animated.timing(anim.translateYAnim, {
              toValue: -100, // hight of the point movement
              duration: 300,
              useNativeDriver: true,
            }),
            Animated.timing(anim.scaleAnim, {
              toValue: 1, // point will be visible
              duration: 300,
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(anim.translateYAnim, {
              toValue: 0, // back to center
              duration: 300,
              useNativeDriver: true,
            }),
            Animated.timing(anim.scaleAnim, {
              toValue: 2.5, // point is filling the circle with color
              duration: 300,
              useNativeDriver: true,
            }),
          ]),
        ]).start();
      } else {
        // set default animation for other points
        Animated.timing(anim.scaleAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start();
      }
    });
  };

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
        marginTop: 50,
      }}
    >
      {/* animated checkmark points */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          marginBottom: 20,
          width: "80%",
        }}
      >
        {animations.map((anim, index) => (
          <TouchableOpacity
            key={index}
            onPress={() => handlePress(index)}
            style={{
              height: 50,
              width: 50,
              borderWidth: 2,
              borderColor: "lightgray",
              borderRadius: 25,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Animated.View
              style={{
                transform: [
                  { translateY: anim.translateYAnim },
                  { scale: anim.scaleAnim },
                ],
              }}
            >
              {/* gradiant color of the point */}
              <LinearGradient
                colors={["#00FFFF", "#FFFFFF"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ width: 20, height: 20, borderRadius: 25 }}
              />
            </Animated.View>
          </TouchableOpacity>
        ))}
      </View>

      {/* checkmark options text */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          width: "80%",
        }}
      >
        {["1 Day", "3 Days", "7 Days"].map((label, index) => (
          <Text
            key={index}
            style={[
              {
                fontSize: 16,
                color: "lightgray",
                fontWeight: "200",
              },
              selectedOption === index && {
                fontWeight: "bold",
                color: "aqua",
              },
            ]}
          >
            {label}
          </Text>
        ))}
      </View>
    </View>
  );
};

export default CheckmarkReminder;

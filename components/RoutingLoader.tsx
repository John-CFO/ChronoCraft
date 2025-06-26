////////////////////////////////////RoutingLoader.tsx///////////////////////////////////////////////

// This animation is originally created by mobinkakei (Mobeen) on UIverse.io
// The original animation is MIT licensed and can be found here: https://uiverse.io/Li-Deheng/bright-firefox-37
// Converted in jsx and to use react-native-reanimated for smooth, long-running animations

////////////////////////////////////////////////////////////////////////////////////////////////////
import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withRepeat,
  withTiming,
  interpolate,
  withSequence,
} from "react-native-reanimated";

////////////////////////////////////////////////////////////////////////////////////////////////////

// define the basics of the animation
const JumpingDot = ({
  delay = 0,
  variant = "circle",
  customStyle,
}: {
  delay?: number;
  variant?: "circle" | "shadow";
  customStyle?: any;
}) => {
  const progress = useSharedValue(0);

  // hook to start the animation
  useEffect(() => {
    progress.value = withRepeat(
      withSequence(
        // 1) in every iteration, delay for `delay` ms
        withDelay(delay, withTiming(1, { duration: 500 })),
        // 2) back to 0 (here withTiming for smooth transition)
        withTiming(0, { duration: 500 })
      ),
      -1
    );
    return () => {
      progress.value = 0; // stop the animation on unmount
    };
  }, [delay, progress]);

  // define the animation with useAnimatedStyle
  const animatedStyle = useAnimatedStyle(() => {
    if (variant === "circle") {
      return {
        top: interpolate(progress.value, [0, 1], [60, 0]),
        height: interpolate(progress.value, [0, 0.4, 1], [5, 20, 20]),
        transform: [
          { scaleX: interpolate(progress.value, [0, 0.4, 1], [1.7, 1, 1]) },
        ],
      };
    } else if (variant === "shadow") {
      return {
        transform: [
          { scaleX: interpolate(progress.value, [0, 0.4, 1], [1.5, 1, 0.2]) },
        ],
        opacity: interpolate(progress.value, [0, 0.4, 1], [1, 0.7, 0.4]),
      };
    }
    return {};
  });

  return (
    <Animated.View
      style={[
        customStyle,
        animatedStyle,
        variant === "circle" ? styles.circleBase : styles.shadowBase,
      ]}
    />
  );
};

const RoutingLoader = () => {
  return (
    <View style={styles.wrapper}>
      {/* three cycles */}
      <JumpingDot delay={0} variant="circle" customStyle={styles.circleLeft} />
      <JumpingDot
        delay={200}
        variant="circle"
        customStyle={styles.circleCenter}
      />
      <JumpingDot
        delay={300}
        variant="circle"
        customStyle={styles.circleRight}
      />

      {/* three shadows */}
      <JumpingDot delay={0} variant="shadow" customStyle={styles.shadowLeft} />
      <JumpingDot
        delay={200}
        variant="shadow"
        customStyle={styles.shadowCenter}
      />
      <JumpingDot
        delay={300}
        variant="shadow"
        customStyle={styles.shadowRight}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    width: 200,
    height: 60,
    position: "relative",
    zIndex: 1,
  },
  // basic style for the circles
  circleBase: {
    position: "absolute",
    width: 20,
    backgroundColor: "#fff",
    borderRadius: 10,
  },
  // basic style for the shadows
  shadowBase: {
    position: "absolute",
    width: 20,
    height: 2,
    backgroundColor: "rgba(255,255,255,0.3)",
    top: 62,
    zIndex: -1,
  },
  // position of the circles
  circleLeft: {
    left: 0.15 * 200,
  },
  circleCenter: {
    left: 0.45 * 200,
  },
  circleRight: {
    right: 0.15 * 200,
  },
  // position of the shadows
  shadowLeft: {
    left: 0.15 * 200,
  },
  shadowCenter: {
    left: 0.45 * 200,
  },
  shadowRight: {
    right: 0.15 * 200,
  },
});

export default RoutingLoader;

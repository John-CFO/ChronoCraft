////////////////////////////////////////////////WorkTimeAnimation.tsx///////////////////////////////////////

// This animation is originally created by Li-Deheng(李德恒) on UIverse.io
// The original animation is MIT licensed and can be found here: https://uiverse.io/Li-Deheng/bright-firefox-37
// Converted to use react-native-reanimated for smooth, long-running animations

////////////////////////////////////////////////////////////////////////////////////////////////////////////

import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  Easing,
  interpolate,
} from "react-native-reanimated";
import type { SharedValue } from "react-native-reanimated";

////////////////////////////////////////////////////////////////////////////////////////////////////////////

const ANIMATION_DURATION = 2000; // 2 seconds per full cycle
const CIRCLE_SIZE = 20;
const DOT_SIZE = 16;
const LOADER_COLOR = "#DEDEDE"; // is equivalent to ca. hsl(0,0%,87%)

// the Circle component receives a shared animation value and individual offsets
const Circle = ({
  sharedProgress,
  circleOffset,
  outlineOffset,
}: {
  sharedProgress: SharedValue<number>;
  circleOffset: number;
  outlineOffset: number;
}) => {
  // animated style for the circle ( scale and opacity)
  const circleStyle = useAnimatedStyle(() => {
    const progress = (sharedProgress.value + circleOffset) % 1;
    const scale = interpolate(progress, [0, 0.5, 1], [1, 1.5, 1]);
    const opacity = interpolate(progress, [0, 0.5, 1], [1, 0.5, 1]);
    return {
      transform: [{ scale }],
      opacity,
    };
  });

  // animated style for the inner dot
  const dotStyle = useAnimatedStyle(() => {
    const progress = (sharedProgress.value + circleOffset) % 1;
    const scale = interpolate(progress, [0, 0.5, 1], [1, 0, 1]);
    return {
      transform: [{ scale }],
    };
  });

  // animated style for the outline
  const outlineStyle = useAnimatedStyle(() => {
    const progress = (sharedProgress.value + outlineOffset) % 1;
    const scale = interpolate(progress, [0, 0.5, 1], [0, 1, 0]);
    const opacity = interpolate(progress, [0, 0.5, 1], [1, 0, 1]);
    return {
      transform: [{ scale }],
      opacity,
    };
  });

  return (
    <View style={styles.circleContainer}>
      <Animated.View style={[styles.circle, circleStyle]} />
      <Animated.View style={[styles.dot, dotStyle]} />
      <Animated.View style={[styles.outline, outlineStyle]} />
    </View>
  );
};

const WorkTimeAnimation = () => {
  // shared animation value from 0 to 1
  const sharedProgress = useSharedValue(0);
  // hook to start the animation
  useEffect(() => {
    sharedProgress.value = withRepeat(
      withTiming(1, {
        duration: ANIMATION_DURATION,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      false
    );
  }, [sharedProgress]);

  return (
    <View style={styles.loader}>
      <Circle
        sharedProgress={sharedProgress}
        circleOffset={0 / ANIMATION_DURATION}
        outlineOffset={900 / ANIMATION_DURATION}
      />
      <Circle
        sharedProgress={sharedProgress}
        circleOffset={300 / ANIMATION_DURATION}
        outlineOffset={1200 / ANIMATION_DURATION}
      />
      <Circle
        sharedProgress={sharedProgress}
        circleOffset={600 / ANIMATION_DURATION}
        outlineOffset={1500 / ANIMATION_DURATION}
      />
      <Circle
        sharedProgress={sharedProgress}
        circleOffset={900 / ANIMATION_DURATION}
        outlineOffset={1800 / ANIMATION_DURATION}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  loader: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  circleContainer: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    marginHorizontal: 10,
    position: "relative",
  },
  circle: {
    position: "absolute",
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    borderWidth: 2,
    borderColor: LOADER_COLOR,
    backgroundColor: "transparent",
    top: 0,
    left: 0,
  },
  dot: {
    position: "absolute",
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    backgroundColor: LOADER_COLOR,
    top: (CIRCLE_SIZE - DOT_SIZE) / 2,
    left: (CIRCLE_SIZE - DOT_SIZE) / 2,
  },
  outline: {
    position: "absolute",
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    borderWidth: 2,
    borderColor: LOADER_COLOR,
    backgroundColor: "transparent",
    top: 0,
    left: 0,
  },
});

export default WorkTimeAnimation;

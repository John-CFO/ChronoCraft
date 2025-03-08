////////////////////////////////////////////////WorkTimeAnimation.tsx///////////////////////////////////////

// This animation is originally created by Li-Deheng(李德恒) on UIverse.io
// The original animation is MIT licensed and can be found here: https://uiverse.io/Li-Deheng/bright-firefox-37
// Converted to use react-native-reanimated for smooth, long-running animations

// It uses React.memo to avoid unnecessary re-renders and improves performance
// It also uses useDerivedValue to calculate progress once per component and avoid unnecessary re-renders

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
  useDerivedValue,
} from "react-native-reanimated";
import type { SharedValue } from "react-native-reanimated";

////////////////////////////////////////////////////////////////////////////////////////////////////////////

// constants
const ANIMATION_DURATION = 2000; // 2 seconds per full cycle
const CIRCLE_SIZE = 20;
const DOT_SIZE = 16;
const LOADER_COLOR = "#DEDEDE";

// constants for interpolation (only created once)
const INTERPOLATION_INPUT = [0, 0.5, 1];
const CIRCLE_SCALE_OUTPUT = [1, 1.5, 1];
const CIRCLE_OPACITY_OUTPUT = [1, 0.5, 1];
const DOT_SCALE_OUTPUT = [1, 0, 1];
const OUTLINE_SCALE_OUTPUT = [0, 1, 0];
const OUTLINE_OPACITY_OUTPUT = [1, 0, 1];

/////////////////////////////////////////////////////////////////////////////////////////////////////////////

type CircleProps = {
  sharedProgress: SharedValue<number>;
  circleOffset: number;
  outlineOffset: number;
};

/////////////////////////////////////////////////////////////////////////////////////////////////////////////

const Circle: React.FC<CircleProps> = ({
  sharedProgress,
  circleOffset,
  outlineOffset,
}) => {
  // calculate progress once per component
  const circleProgress = useDerivedValue(
    () => (sharedProgress.value + circleOffset) % 1
  );
  const outlineProgress = useDerivedValue(
    () => (sharedProgress.value + outlineOffset) % 1
  );

  // animated style for the outer circle
  const circleStyle = useAnimatedStyle(() => {
    const progress = circleProgress.value;
    return {
      transform: [
        {
          scale: interpolate(
            progress,
            INTERPOLATION_INPUT,
            CIRCLE_SCALE_OUTPUT
          ),
        },
      ],
      opacity: interpolate(
        progress,
        INTERPOLATION_INPUT,
        CIRCLE_OPACITY_OUTPUT
      ),
    };
  });

  // animation for the inner dot
  const dotStyle = useAnimatedStyle(() => {
    const progress = circleProgress.value;
    return {
      transform: [
        { scale: interpolate(progress, INTERPOLATION_INPUT, DOT_SCALE_OUTPUT) },
      ],
    };
  });

  // animation for the outer circle
  const outlineStyle = useAnimatedStyle(() => {
    const progress = outlineProgress.value;
    return {
      transform: [
        {
          scale: interpolate(
            progress,
            INTERPOLATION_INPUT,
            OUTLINE_SCALE_OUTPUT
          ),
        },
      ],
      opacity: interpolate(
        progress,
        INTERPOLATION_INPUT,
        OUTLINE_OPACITY_OUTPUT
      ),
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

// memorize the Circle component to avoid unnecessary re-renders
const MemoizedCircle = React.memo(Circle);

const WorkTimeAnimation = () => {
  // common animation value from 0 to 1
  const sharedProgress = useSharedValue(0);

  // hook to start the animation on mount
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
      <MemoizedCircle
        sharedProgress={sharedProgress}
        circleOffset={0 / ANIMATION_DURATION}
        outlineOffset={900 / ANIMATION_DURATION}
      />
      <MemoizedCircle
        sharedProgress={sharedProgress}
        circleOffset={300 / ANIMATION_DURATION}
        outlineOffset={1200 / ANIMATION_DURATION}
      />
      <MemoizedCircle
        sharedProgress={sharedProgress}
        circleOffset={600 / ANIMATION_DURATION}
        outlineOffset={1500 / ANIMATION_DURATION}
      />
      <MemoizedCircle
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

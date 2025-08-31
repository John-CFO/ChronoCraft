/////////////////////////////OTPInput.tsx///////////////////////////////////

// This component is used to display and handle the OTP input field in the TwoFactorModal component
// It displays 6 input fields and allows the user to enter a code from the authenticator app
// If one of the input fields is filled in, the next input will be focused automatically

///////////////////////////////////////////////////////////////////////////

import React, { useRef, useState, useEffect } from "react";
import { View, TextInput, Animated, TouchableOpacity } from "react-native";

///////////////////////////////////////////////////////////////////////////

type Props = {
  length?: number;
  onChangeCode: (code: string) => void;
  autoFocus?: boolean;
};

///////////////////////////////////////////////////////////////////////////

const OTPInput: React.FC<Props> = ({
  length = 6,
  onChangeCode,
  autoFocus = true,
}) => {
  // declare states
  const [values, setValues] = useState<string[]>(
    Array.from({ length }, () => "")
  );
  const [shouldAutoFocus, setShouldAutoFocus] = useState(false);

  //declare refs
  const inputs = useRef<(TextInput | null)[]>([]);
  const anims = useRef(
    Array.from({ length }, () => new Animated.Value(0))
  ).current;

  // hook to auto focus
  useEffect(() => {
    const timer = setTimeout(() => {
      setShouldAutoFocus(autoFocus);
    }, 500);
    return () => clearTimeout(timer);
  }, [autoFocus]);

  // function to focus the next input
  const focusNext = (index: number) => {
    if (index < length - 1) inputs.current[index + 1]?.focus();
  };

  // function to handle input change
  const handleChange = (raw: string, index: number) => {
    const digit = raw.replace(/\D/g, "").slice(0, 1);
    const next = [...values];
    next[index] = digit;
    setValues(next);
    onChangeCode(next.join(""));
    if (digit) focusNext(index);
  };

  // function to handle key press
  const handleKeyPress = (
    e: { nativeEvent: { key: string } },
    index: number
  ) => {
    if (e.nativeEvent.key === "Backspace") {
      if (values[index]) {
        const next = [...values];
        next[index] = "";
        setValues(next);
        onChangeCode(next.join(""));
      } else if (index > 0) {
        inputs.current[index - 1]?.focus();
        const next = [...values];
        next[index - 1] = "";
        setValues(next);
        onChangeCode(next.join(""));
      }
    }
  };

  // function to animate the inputs
  const animateTo = (i: number, to: 0 | 1) => {
    Animated.timing(anims[i], {
      toValue: to,
      duration: 180,
      useNativeDriver: false,
    }).start();
  };

  return (
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      {Array.from({ length }).map((_, index) => {
        const glowOpacity = anims[index].interpolate({
          inputRange: [0, 1],
          outputRange: [0, 0.15],
        });
        const borderColor = anims[index].interpolate({
          inputRange: [0, 1],
          outputRange: ["rgba(150,150,150,1)", "#00ffff"],
        });
        const backgroundColor = anims[index].interpolate({
          inputRange: [0, 1],
          outputRange: ["#000000ff", "#191919"],
        });

        return (
          <TouchableOpacity
            accessible={false}
            key={index}
            activeOpacity={0.9}
            onPress={() => inputs.current[index]?.focus()}
            style={{ marginRight: index === length - 1 ? 0 : 10 }}
          >
            <Animated.View
              style={{
                width: 45,
                height: 50,
                borderRadius: 12,
                justifyContent: "center",
                alignItems: "center",
                marginBottom: 20,
              }}
            >
              {/* Glow behind the input */}
              <Animated.View
                accessibilityElementsHidden={true} // iOS: hide decoration
                importantForAccessibility="no-hide-descendants"
                pointerEvents="none"
                style={{
                  position: "absolute",
                  top: -5,
                  left: -5,
                  right: -5,
                  bottom: -5,
                  borderRadius: 15,
                  backgroundColor: "#00ffff",
                  opacity: glowOpacity,
                }}
              />

              <Animated.View
                style={{
                  width: "100%",
                  height: "100%",
                  borderWidth: 2,
                  borderRadius: 12,
                  backgroundColor: backgroundColor,
                  justifyContent: "center",
                  alignItems: "center",
                  borderColor: borderColor as any, // TS workaround
                }}
              >
                {/* input field */}
                <TextInput
                  accessible={true}
                  accessibilityLabel={`Number ${index + 1} from ${length}`}
                  accessibilityHint="Add a number"
                  ref={(r) => (inputs.current[index] = r)}
                  value={values[index]}
                  onChangeText={(t) => handleChange(t, index)}
                  onKeyPress={(e) => handleKeyPress(e, index)}
                  onFocus={() => animateTo(index, 1)}
                  onBlur={() => animateTo(index, 0)}
                  maxLength={1}
                  keyboardType="number-pad"
                  autoFocus={shouldAutoFocus && index === 0}
                  style={{
                    width: "100%",
                    height: "100%",
                    textAlign: "center",
                    fontSize: 30,
                    color: "#fff",
                    backgroundColor: "transparent",
                    padding: 0,
                    margin: 0,
                  }}
                />
              </Animated.View>
            </Animated.View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

export default OTPInput;

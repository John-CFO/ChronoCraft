////////////////////////////Help Menu Component////////////////////////////////

// this is the help menu component and contains a little text with the social media buttons

////////////////////////////////////////////////////////////////////////////////

import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Linking,
  ImageBackground,
  findNodeHandle,
  AccessibilityInfo,
  Animated,
  Easing,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Foundation } from "@expo/vector-icons";

import { useAccessibilityStore } from "./services/accessibility/accessibilityStore";

/////////////////////////////////////////////////////////////////////////////////////

//typeinterface for close function
interface HelpMenuProps {
  onClose: () => void;
}

/////////////////////////////////////////////////////////////////////////////////////

// defines the dimensions of the help menu
const MENU_WIDTH = 250;
const MENU_HEIGHT = 400;
const OFFSCREEN_X = MENU_WIDTH + 24; // start slightly offscreen

const HelpMenu: React.FC<HelpMenuProps> = ({ onClose }) => {
  // ref  to animate the help menu sliding
  const translateX = useRef(new Animated.Value(OFFSCREEN_X)).current;
  // ref to manage opacity
  const opacity = useRef(new Animated.Value(0)).current;
  // ref to get the node for accessibility
  const helpTitleRef = useRef<any>(null);

  // function to get accessibility mode
  const accessMode = useAccessibilityStore(
    (state) => state.accessibilityEnabled
  );

  // open animation
  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(
      "Help menu opened. You can close it by pressing the close button."
    );
    // animate the sliding
    Animated.parallel([
      Animated.timing(translateX, {
        toValue: 0,
        duration: 270,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 270,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // set accessibility focus after open animation finished
      const node = findNodeHandle(helpTitleRef.current);
      if (node) AccessibilityInfo.setAccessibilityFocus(node);
    });

    // no cleanup needed for animation on unmount here
  }, [translateX, opacity]);

  // close with animation, then call onClose
  const closeWithAnimation = () => {
    AccessibilityInfo.announceForAccessibility("Closing help menu.");
    Animated.parallel([
      Animated.timing(translateX, {
        toValue: OFFSCREEN_X,
        duration: 220,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  // functions to open as extern the social buttons
  const openFacebook = () => Linking.openURL("https://www.facebook.com/");
  const openLinkedIn = () => Linking.openURL("https://www.linkedin.com/");
  const openGithub = () => Linking.openURL("https://github.com/");

  return (
    <View
      style={{
        position: "absolute",
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        elevation: 9999,
        justifyContent: "flex-start",
        alignItems: "flex-end",
      }}
      accessibilityViewIsModal={true}
    >
      {/* Backdrop */}
      <TouchableWithoutFeedback onPress={closeWithAnimation} accessible={false}>
        <Animated.View
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: "black",
            opacity: opacity.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 0.6],
            }),
          }}
        />
      </TouchableWithoutFeedback>

      {/* Animated menu panel */}
      <Animated.View
        accessibilityViewIsModal={true}
        accessible={false}
        style={{
          width: MENU_WIDTH,
          height: MENU_HEIGHT,
          marginRight: 16,
          marginTop: 56, // anpassen an deine Header-Höhe
          borderRadius: 17,
          overflow: "hidden",
          borderWidth: 2,
          borderColor: "aqua",
          zIndex: 10000,
          elevation: 10000,
          transform: [{ translateX }],
        }}
      >
        <ImageBackground
          source={require("../assets/black-image.jpg")}
          blurRadius={3}
          style={{
            flex: 1,
            width: "100%",
            height: "100%",
            overflow: "hidden",
          }}
        >
          <View
            style={{
              width: MENU_WIDTH,
              alignItems: "flex-end",
              paddingRight: 10,
              paddingTop: 5,
            }}
          >
            {/* Close Button */}
            <TouchableOpacity
              onPress={closeWithAnimation}
              accessibilityRole="button"
              accessibilityLabel="Close"
              accessibilityHint="Closes the help menu"
              activeOpacity={0.7}
              style={{
                position: "absolute",
                top: 10,
                right: 12,
                width: 32,
                height: 32,
                borderRadius: 16,
                borderWidth: 1.5,
                borderColor: "aqua",
                backgroundColor: "transparent",
                justifyContent: "center",
                alignItems: "center",
                zIndex: 999,
                shadowColor: "black",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.3,
                shadowRadius: 3,
                elevation: 4,
                overflow: "hidden",
              }}
            >
              <LinearGradient
                colors={["#00f7f7", "#005757"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  alignItems: "center",
                  justifyContent: "center",
                  height: "100%",
                  width: "100%",
                  borderRadius: 16,
                }}
              >
                <Text
                  style={{
                    color: "lightgray",
                    fontSize: 24,
                    fontWeight: "bold",
                    lineHeight: 26,
                  }}
                >
                  ×
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <View
            style={{
              width: 240,
              height: 160,
              justifyContent: "space-between",
              alignItems: "center",
              paddingHorizontal: 5,
            }}
          >
            {/* header text */}
            <View
              ref={helpTitleRef}
              accessible
              accessibilityRole="header"
              accessibilityLabel="Help Menu"
              style={{ alignItems: "center" }}
            >
              <Text
                style={{
                  paddingBottom: 5,
                  color: "white",
                  fontSize: 32,
                  fontFamily: "MPLUSLatin_Bold",
                }}
              >
                Help
              </Text>
            </View>

            {/* info text */}
            <Text
              accessible
              accessibilityLabel="Info Text"
              accessibilityHint="If you encounter issues or have suggestions for improvements, feel free to hit a Logo and reach out to us:"
              style={{
                textAlign: "center",
                fontFamily: accessMode
                  ? "MPLUSLatin_Bold"
                  : "MPLUSLatin_ExtraLight",
                color: "white",
                fontSize: accessMode ? 18 : 16,
              }}
            >
              If you encounter issues or have suggestions for improvements, feel
              free to hit a Logo and reach out to us:
            </Text>
          </View>

          {/* social buttons */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-evenly",
              paddingTop: 20,
            }}
          >
            <TouchableOpacity
              onPress={openFacebook}
              accessibilityRole="button"
              accessibilityLabel="Open Facebook"
              accessibilityHint="Opens our Facebook page in an external browser"
            >
              <Foundation name="social-facebook" size={55} color="white" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={openLinkedIn}
              accessibilityRole="button"
              accessibilityLabel="Open LinkedIn"
              accessibilityHint="Opens our LinkedIn profile in an external browser"
            >
              <Foundation name="social-linkedin" size={55} color="white" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={openGithub}
              accessibilityRole="button"
              accessibilityLabel="Open GitHub"
              accessibilityHint="Opens our GitHub repository in an external browser"
            >
              <Foundation name="social-github" size={55} color="white" />
            </TouchableOpacity>
          </View>

          <View
            style={{
              width: 240,
              paddingTop: 50,
              alignItems: "center",
            }}
          >
            <Text
              accessibilityLabel="Thanks Text"
              accessibilityHint="Thanks for your feedback!"
              style={{
                textAlign: "center",
                fontFamily: accessMode
                  ? "MPLUSLatin_Bold"
                  : "MPLUSLatin_ExtraLight",
                color: "white",
                fontSize: accessMode ? 18 : 14,
              }}
            >
              Thanks for your feedback! 🚀
            </Text>
          </View>
        </ImageBackground>
      </Animated.View>
    </View>
  );
};

export default HelpMenu;

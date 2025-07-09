////////////////////////////Help Menu Component////////////////////////////////

// this is the help menu component and contains a little text with the social media buttons

import {
  View,
  Text,
  TouchableOpacity,
  Linking,
  ImageBackground,
} from "react-native";
import React from "react";
import { LinearGradient } from "expo-linear-gradient";
import { Foundation } from "@expo/vector-icons";

import { useAccessibilityStore } from "./services/accessibility/accessibilityStore";

/////////////////////////////////////////////////////////////////////////////

//typeinterface for close function
interface HelpMenuProps {
  onClose: () => void;
}

/////////////////////////////////////////////////////////////////////////////

const HelpMenu: React.FC<HelpMenuProps> = ({ onClose }) => {
  // function to close the menu
  const closeMenu = () => {
    onClose();
  };

  // functions to open as extern the social buttons
  const openFacebook = () => {
    Linking.openURL("https://www.facebook.com/");
  };

  const openLinkedIn = () => {
    Linking.openURL("https://www.linkedin.com/");
  };

  const openGithub = () => {
    Linking.openURL("https://github.com/");
  };

  // initialize the accessibility store
  const accessMode = useAccessibilityStore(
    (state) => state.accessibilityEnabled
  );

  return (
    <View
      style={{
        width: 250,
        height: 400,
        borderRadius: 17,
        overflow: "hidden",
        borderWidth: 2,
        borderColor: "aqua",
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
            width: 250,
            alignItems: "flex-end",
            paddingRight: 10,
            paddingTop: 5,
          }}
        >
          {/* Close Button */}
          <TouchableOpacity
            onPress={closeMenu}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Close Button"
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
          {/* info text */}
          <Text
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
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Open Facebook"
            accessibilityHint="Opens our Facebook page in an external browser"
          >
            <Foundation name="social-facebook" size={55} color="white" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={openLinkedIn}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Open LinkedIn"
            accessibilityHint="Opens our LinkedIn profile in an external browser"
          >
            <Foundation name="social-linkedin" size={55} color="white" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={openGithub}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Open GitHub"
            accessibilityHint="Opens our GitHub repository in an external browser"
          >
            <Foundation name="social-github" size={55} color="white" />
          </TouchableOpacity>
        </View>

        <View style={{ width: 240, paddingTop: 50, alignItems: "center" }}>
          {/* thanks text */}
          <Text
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
    </View>
  );
};

export default HelpMenu;

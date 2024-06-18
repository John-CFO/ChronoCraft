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
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Foundation } from "@expo/vector-icons";

/////////////////////////////////////////////////////////////////////////////

//typeinterface for close function
interface HelpMenuProps {
  onClose: () => void;
}

/////////////////////////////////////////////////////////////////////////////

const HelpMenu: React.FC<HelpMenuProps> = ({ onClose }) => {
  //function to close the menu
  const closeMenu = () => {
    onClose();
  };

  //functions to open as extern the social buttons
  const openFacebook = () => {
    Linking.openURL("https://www.facebook.com/");
  };

  const openLinkedIn = () => {
    Linking.openURL("https://www.linkedin.com/");
  };

  const openGithub = () => {
    Linking.openURL("https://github.com/");
  };

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
        blurRadius={10}
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
          <TouchableOpacity onPress={closeMenu}>
            <MaterialCommunityIcons
              name="close-circle"
              size={38}
              color="white"
            />
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
          {/*-- header text --*/}
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
          {/*-- info text --*/}
          <Text
            style={{
              textAlign: "center",
              fontFamily: "MPLUSLatin_ExtraLight",
              color: "white",
              fontSize: 16,
            }}
          >
            If you encounter issues or have suggestions for improvements, feel
            free to hit a Logo and reach out to us:
          </Text>
        </View>

        {/*-- social buttons --*/}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-evenly",
            paddingTop: 20,
          }}
        >
          <TouchableOpacity onPress={openFacebook}>
            <Foundation name="social-facebook" size={55} color="white" />
          </TouchableOpacity>
          <TouchableOpacity onPress={openLinkedIn}>
            <Foundation name="social-linkedin" size={55} color="white" />
          </TouchableOpacity>
          <TouchableOpacity onPress={openGithub}>
            <Foundation name="social-github" size={55} color="white" />
          </TouchableOpacity>
        </View>

        <View style={{ width: 240, paddingTop: 50, alignItems: "center" }}>
          {/*-- thanks text --*/}
          <Text
            style={{
              textAlign: "center",
              fontFamily: "MPLUSLatin_ExtraLight",
              color: "white",
              fontSize: 14,
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

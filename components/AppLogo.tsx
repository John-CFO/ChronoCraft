import React from "react";
import { View, Text } from "react-native";

////////////////////////////////////////////////////////////////

const AppLogo = () => {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text
        style={{
          fontFamily: "MPLUSLatin_Bold",
          fontSize: 52,
          color: "aqua",
          letterSpacing: 2,
          textShadowColor: "rgba(0, 0, 0, 0.8)",
          textShadowOffset: { width: 2, height: 2 },
          textShadowRadius: 4,
        }}
      >
        Chrono
      </Text>
      <View
        style={{
          width: 20,
          height: 30,
          borderStyle: "solid",
          borderBottomWidth: 20,
          borderBottomColor: "aqua",
          borderLeftWidth: 10,
          borderLeftColor: "transparent",
          borderRightWidth: 10,
          borderRightColor: "transparent",
        }}
      ></View>
      <Text
        style={{
          fontFamily: "MPLUSLatin_Bold",
          //fontFamily: "",
          fontSize: 52,
          color: "aqua",
          letterSpacing: 2,
          textShadowColor: "rgba(0, 0, 0, 0.8)",
          textShadowOffset: { width: 2, height: 2 },
          textShadowRadius: 4,
        }}
      >
        Craft
      </Text>
    </View>
  );
};

export default AppLogo;

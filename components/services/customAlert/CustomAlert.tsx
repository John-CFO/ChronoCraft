/////////////////////////////////CUSTOM ALERT/////////////////////////////////////

// This component is used to show an customised alert to the user

//////////////////////////////////////////////////////////////////////////////////

import React from "react";
import { Modal, View, Text, TouchableOpacity, Dimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { useAlertStore } from "./alertStore";

//////////////////////////////////////////////////////////////////////////////////

const CustomAlert = () => {
  // get the state from the store
  const { visible, title, message, hideAlert, buttons } = useAlertStore();

  // define the width of the screen
  const screenWidth = Dimensions.get("window").width;
  const screenHeight = Dimensions.get("window").height;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "rgba(0, 0, 0, 0.6)",
          // transform: [{ translateY }],
          // opacity,
          zIndex: 2,
        }}
      >
        <View
          style={{
            width: screenWidth * 0.9,
            maxWidth: 600,
            backgroundColor: "#191919",
            padding: 20,
            borderRadius: 15,
            borderWidth: 2,
            borderColor: "aqua",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 2,
          }}
        >
          <Text
            style={{
              color: "white",
              fontSize: 28,
              fontFamily: "MPLUSLatin_Bold",
              marginBottom: 20,
              textAlign: "center",
            }}
          >
            {title}
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: "#FFF",
              textAlign: "center",
              marginBottom: 16,
            }}
          >
            {message}
          </Text>
          {/* Ok Button */}
          <View style={{ flexDirection: "row", gap: 12, marginTop: 12 }}>
            {(buttons || [{ text: "OK", onPress: hideAlert }]).map(
              (button, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => {
                    if (button.onPress) {
                      button.onPress();
                    } else {
                      hideAlert(); // fallback if onPress is not provided
                    }
                  }}
                  style={{
                    borderColor: "white",
                    backgroundColor:
                      button.style === "destructive" ? "red" : "aqua",
                    borderRadius: 12,
                    overflow: "hidden",
                    borderWidth: 3,
                    height: 45,
                    width: 120,
                  }}
                >
                  <LinearGradient
                    colors={
                      button.style === "destructive"
                        ? ["red", "#FF9999"]
                        : ["#00FFFF", "#FFFFFF"]
                    }
                    style={{
                      alignItems: "center",
                      justifyContent: "center",
                      height: "100%",
                      width: "100%",
                    }}
                  >
                    <Text
                      style={{
                        color:
                          button.style === "destructive" ? "white" : "grey",
                        fontSize: 20,
                        fontFamily: "MPLUSLatin_Bold",
                      }}
                    >
                      {button.text}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              )
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default CustomAlert;

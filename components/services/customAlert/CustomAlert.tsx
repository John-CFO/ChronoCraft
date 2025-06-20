/////////////////////////////////CUSTOM ALERT/////////////////////////////////////

// This component is used to show an customised alert modal to the user
// It includes a fade in and fade out animation and a map of conditionally rendered buttons

//////////////////////////////////////////////////////////////////////////////////

import React, { useEffect, useRef } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  Animated,
  Easing,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { useAlertStore } from "./alertStore";

//////////////////////////////////////////////////////////////////////////////////

const CustomAlert = () => {
  // get the state from the store
  const { visible, title, message, hideAlert, buttons } = useAlertStore();

  // define the width of the screen
  const screenWidth = Dimensions.get("window").width;

  // state to show the modal
  const [showModal, setShowModal] = React.useState(visible);

  // states for the animation
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0)).current;

  // hook to open the modal with animation
  useEffect(() => {
    if (visible) {
      setShowModal(true);

      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
          easing: Easing.out(Easing.bezier(0.25, 0.1, 0.25, 1)),
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
          easing: Easing.out(Easing.bezier(0.25, 0.1, 0.25, 1)),
        }),
      ]).start();
    }
  }, [visible]);

  // function to close the modal with animation
  const handleCloseWithAnimation = (callback?: () => void) => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
        easing: Easing.in(Easing.bezier(0.25, 0.1, 0.25, 1)),
      }),
      Animated.timing(scale, {
        toValue: 0.5,
        duration: 500,
        useNativeDriver: true,
        easing: Easing.in(Easing.bezier(0.25, 0.1, 0.25, 1)),
      }),
    ]).start(() => {
      setShowModal(false);
      hideAlert();
      if (callback) callback(); // important to ensure asyncronous execution after animation
    });
  };

  if (!showModal) return null;

  return (
    <Modal visible={visible} transparent animationType="none">
      <View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.6)",
          justifyContent: "center",
          alignItems: "center",
          paddingTop: 50,
          zIndex: 2,
        }}
      >
        <Animated.View
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
            // animation properties
            transform: [{ scale }],
            opacity,
          }}
        >
          {/* Alert Title */}
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
          {/* Alert Message */}
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
          {/* conditionally render buttons */}
          <View style={{ flexDirection: "row", gap: 12, marginTop: 12 }}>
            {(buttons || [{ text: "OK", onPress: hideAlert }]).map(
              (button, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => {
                    if (button.onPress) {
                      handleCloseWithAnimation(button.onPress);
                    } else {
                      handleCloseWithAnimation();
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
        </Animated.View>
      </View>
    </Modal>
  );
};

export default CustomAlert;

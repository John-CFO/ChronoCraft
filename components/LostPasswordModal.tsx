////////////////////////////////LostPasswordModal Component////////////////////////////

// this component is used to reset the password of the user
// it will send an email to the user with instructions on how to reset the password

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  Dimensions,
} from "react-native";
import { sendPasswordResetEmail } from "firebase/auth";
import { LinearGradient } from "expo-linear-gradient";
import Modal from "react-native-modal";

import { FIREBASE_AUTH } from "../firebaseConfig";

////////////////////////////////////////////////////////////////////////////////////////

interface LostPasswordModalProps {
  visible: boolean;
  onClose: () => void;
}

////////////////////////////////////////////////////////////////////////////////////////

const LostPasswordModal: React.FC<LostPasswordModalProps> = ({
  visible,
  onClose,
}) => {
  // screensize for dynamic size calculation
  const screenWidth = Dimensions.get("window").width;

  // state to hold the email
  const [email, setEmail] = useState("");

  // function to handle the password reset
  const handlePasswordReset = async () => {
    // condition: if no email is entered show an alert
    if (!email) {
      Alert.alert("Error", "Please enter your email.");
      return;
    }
    // try to send the password reset email, if it was successful show an alert with instructions
    try {
      await sendPasswordResetEmail(FIREBASE_AUTH, email);
      Alert.alert(
        "E-Mails sent",
        "An E-Mail has been sent to you with instructions on how to reset your password."
      );
      onClose(); // close the modal
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "There was an error resetting your password.");
    }
  };

  // dot animation for TextInput
  const [dots, setDots] = useState(".");

  useEffect(() => {
    // initial count
    let count = 0;

    // setInterval condition
    const interval = setInterval(() => {
      if (count === 0) {
        setDots(".");
      } else if (count === 1) {
        setDots("..");
      } else if (count === 2) {
        setDots("...");
      } else {
        setDots("");
        count = -1; // restart the animation
      }

      count += 1;
    }, 700); // handle animation time

    // clear the interval
    return () => clearInterval(interval);
  }, []);

  return (
    <Modal
      isVisible={visible}
      backdropColor="black"
      onBackdropPress={onClose}
      swipeDirection={["up", "down"]}
      onSwipeComplete={onClose}
    >
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        {/* modal header */}
        <View
          style={{
            width: screenWidth * 0.9, // use 90% of the screen width
            maxWidth: 600,
            height: "auto",
            backgroundColor: "black",
            alignItems: "center",
            padding: 20,
            borderRadius: 15,
            borderWidth: 2,
            borderColor: "lightgrey",
          }}
        >
          <Text
            style={{
              color: "white",
              fontSize: 32,
              fontFamily: "MPLUSLatin_Bold",
              marginBottom: 11,
            }}
          >
            Reset Password
          </Text>

          {/* email input */}
          <View
            style={{
              flexDirection: "row",
              borderTopWidth: 0.5,
              borderTopColor: "lightgrey",
              width: 330,
              height: 80,
              padding: 5,
              justifyContent: "center",
              alignItems: "center",
              backgroundColor: "transparent",
            }}
          ></View>

          <View
            style={{
              width: screenWidth * 0.7, // use 70% of the screen width
              maxWidth: 400,
              height: 50,
              borderWidth: 2,
              marginBottom: 20,
              borderRadius: 12,
            }}
          >
            <TextInput
              placeholder={`E-Mail Adress${dots}`}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor="#ccc"
              style={{
                borderColor: "aqua",
                borderWidth: 1.5,
                borderRadius: 12,
                paddingLeft: 15,
                paddingRight: 40,
                paddingBottom: 5,
                fontSize: 22,
                height: 50,
                color: "white",
                backgroundColor: "#191919",
              }}
            />
          </View>

          {/* reset password button */}
          <TouchableOpacity
            onPress={handlePasswordReset}
            style={{
              width: screenWidth * 0.7, // use 70% of the screen width
              maxWidth: 400,
              borderRadius: 12,
              overflow: "hidden",
              borderWidth: 3,
              borderColor: "white",
              marginBottom: 20,
            }}
          >
            <LinearGradient
              colors={["#00FFFF", "#FFFFFF"]}
              style={{
                alignItems: "center",
                justifyContent: "center",
                height: 45,
                width: screenWidth * 0.7, // use 70% of the screen width
                maxWidth: 400,
              }}
            >
              <Text
                style={{
                  color: "grey",
                  fontSize: 22,
                  fontFamily: "MPLUSLatin_Bold",
                  marginBottom: 11,
                  marginRight: 9,
                }}
              >
                Send
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* navigation tip */}
          <Text
            style={{
              marginTop: 20,
              fontSize: 18,
              color: "lightgrey",
              fontFamily: "MPLUSLatin_ExtraLight",
            }}
          >
            swipe up or down to close
          </Text>
        </View>
      </View>
    </Modal>
  );
};

export default LostPasswordModal;

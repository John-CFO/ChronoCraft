////////////////////////////////LostPasswordModal Component////////////////////////////

// this component is used to reset the password of the user
// it will send an email to the user with instructions on how to reset the password

////////////////////////////////////////////////////////////////////////////////////////

import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { sendPasswordResetEmail } from "firebase/auth";
import { LinearGradient } from "expo-linear-gradient";
import Modal from "react-native-modal";

import { FIREBASE_AUTH } from "../firebaseConfig";
import { useAlertStore } from "./services/customAlert/alertStore";
import { useDotAnimation } from "../components/DotAnimation";
import { useAccessibilityStore } from "./services/accessibility/accessibilityStore";

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
  const [sending, setSending] = useState(false);
  const handlePasswordReset = async () => {
    // condition: if no email is entered show an alert
    if (!email) {
      useAlertStore.getState().showAlert("Error", "Please enter your email.");
      return;
    }
    // try to send the password reset email, if it was successful show an alert with instructions
    setSending(true);
    try {
      await sendPasswordResetEmail(FIREBASE_AUTH, email);
      useAlertStore
        .getState()
        .showAlert(
          "E-Mails sent",
          "An E-Mail has been sent to you with instructions on how to reset your password."
        );
      onClose(); // close the modal
    } catch (error) {
      console.error(error);
      useAlertStore
        .getState()
        .showAlert("Error", "There was an error resetting your password.");
    }
    setSending(false);
  };

  // define the dot animation with a delay
  const [loading, setLoading] = useState(true);
  const dots = useDotAnimation(loading, 700);

  // initialize the accessibility store
  const accessMode = useAccessibilityStore(
    (state) => state.accessibilityEnabled
  );
  // console.log("accessMode in LoginScreen:", accessMode);

  return (
    <Modal
      accessible={true}
      accessibilityViewIsModal={true}
      accessibilityLabel="Reset password modal"
      accessibilityHint="Modal dialog to reset your password."
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
              placeholderTextColor={accessMode ? "white" : "grey"}
              accessible={true}
              importantForAccessibility="yes"
              returnKeyType="next"
              accessibilityLabel="Email input"
              accessibilityHint="Please enter your email address to receive a password reset link."
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
            accessibilityRole="button"
            accessibilityLabel="Reset Password"
            accessibilityHint="Send E-Mail to get a reset link"
            accessibilityState={{ disabled: sending ? true : false }}
            style={{
              width: screenWidth * 0.7, // use 70% of the screen width
              maxWidth: 400,
              borderRadius: 12,
              overflow: "hidden",
              borderWidth: 1.5,
              borderColor: "aqua",
              marginBottom: 20,
            }}
          >
            <LinearGradient
              colors={["#00f7f7", "#005757"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
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
                  color: "white",
                  fontSize: 22,
                  fontFamily: "MPLUSLatin_Bold",
                  marginBottom: 5,
                  marginRight: 9,
                }}
              >
                {sending ? "Sending..." : "Send Reset Link"}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* navigation tip */}
          <Text
            accessible
            accessibilityLabel="Navigation tip"
            accessibilityHint="Swipe up or down to close"
            style={{
              marginTop: 20,
              fontSize: accessMode ? 20 : 18,
              color: accessMode ? "white" : "lightgrey",
              fontFamily: accessMode
                ? "MPLUSLatin_Regular"
                : "MPLUSLatin_ExtraLight",
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

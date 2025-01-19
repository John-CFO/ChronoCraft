////////////////////////////////LostPasswordModal Component////////////////////////////

import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert } from "react-native";
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
  const [email, setEmail] = useState("");

  const handlePasswordReset = async () => {
    if (!email) {
      Alert.alert("Error", "Please enter your email.");
      return;
    }

    try {
      await sendPasswordResetEmail(FIREBASE_AUTH, email);
      Alert.alert(
        "E-Mails sent",
        "An E-Mail has been sent to you with instructions on how to reset your password."
      );
      onClose(); // Modal schließen
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "There was an error resetting your password.");
    }
  };

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
        <View
          style={{
            width: "90%",
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
              width: 280,
              height: 50,
              borderWidth: 2,
              marginBottom: 20,
              borderRadius: 12,
            }}
          >
            <TextInput
              placeholder="E-Mail-Adress"
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

          <TouchableOpacity
            onPress={handlePasswordReset}
            style={{
              width: 280,
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
                width: 280,
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

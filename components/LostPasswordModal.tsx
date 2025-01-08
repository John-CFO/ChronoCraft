////////////////////////////////LostPasswordModal Component////////////////////////////

import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  Modal,
  StyleSheet,
} from "react-native";
import { sendPasswordResetEmail } from "firebase/auth";
import { LinearGradient } from "expo-linear-gradient";

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
    <Modal visible={visible} transparent animationType="slide">
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "rgba(0, 0, 0, 0.7)",
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
              marginBottom: 60,
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
              height: 45,
              width: 120,

              borderRadius: 12,
              borderWidth: 3,
              borderColor: "white",
              overflow: "hidden",
            }}
          >
            <LinearGradient
              colors={["#00FFFF", "#FFFFFF"]}
              style={{
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 8,
                height: 45,
                width: 120,
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

          <TouchableOpacity
            onPress={onClose}
            style={{
              padding: 10,
              marginTop: 20,
              width: "100%",
              alignItems: "center",
            }}
          >
            <Text style={{ color: "lightgrey", fontWeight: "bold" }}>
              Cancel
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default LostPasswordModal;

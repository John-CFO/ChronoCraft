///////////////////////TotopCodeModal.tsx////////////////////////////

// This component is used to display a modal to enter the TOTP code from the authenticator app inside the LoginScreen

/////////////////////////////////////////////////////////////////////

import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  AccessibilityInfo,
  findNodeHandle,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { useAccessibilityStore } from "../components/services/accessibility/accessibilityStore";
import OTPInput from "./OTPInput";

/////////////////////////////////////////////////////////////////////

interface Props {
  visible: boolean;
  onSubmit: (code: string) => void;
  onCancel: () => void;
  loading?: boolean;
}
/////////////////////////////////////////////////////////////////////

const TotpCodeModal: React.FC<Props> = ({
  visible,
  onSubmit,
  onCancel,
  loading,
}) => {
  // declare state and ref
  const [code, setCode] = useState("");
  const titleRef = useRef<any>(null);

  // screensize for dynamic size calculation
  const screenWidth = Dimensions.get("window").width;

  // hook to focus the input when the modal is opened
  useEffect(() => {
    if (visible) {
      setCode("");
      // accessibility focus
      setTimeout(() => {
        if (titleRef.current) {
          const node = findNodeHandle(titleRef.current);
          if (node) AccessibilityInfo.setAccessibilityFocus(node);
        }
      }, 300);
    }
  }, [visible]);

  // function to get the accessibility mode
  const accessMode = useAccessibilityStore(
    (state) => state.accessibilityEnabled
  );

  return (
    <Modal
      accessibilityViewIsModal={true}
      accessibilityLabel="TotpCodeModal"
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.6)",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <View
          style={{
            width: "90%",
            maxWidth: 420,
            backgroundColor: "black",
            padding: 20,
            borderRadius: 12,
            borderWidth: 2,
            borderColor: "white",
          }}
        >
          {/* Confirm TOTP header */}
          <Text
            accessible={true}
            accessibilityRole="header"
            accessibilityLabel="2FA: add TOTP Code"
            ref={titleRef}
            style={{
              textAlign: "center",
              color: "white",
              fontSize: 32,
              fontFamily: "MPLUSLatin_Bold",
              marginBottom: 11,
            }}
          >
            2FA: add TOTP Code
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
          {/* information text */}
          <Text
            accessible={true}
            accessibilityRole="text"
            accessibilityLabel="Please enter the 6-digit code from your authenticator app."
            style={{
              marginBottom: 20,
              textAlign: "center",
              marginTop: accessMode ? 10 : 20,
              fontSize: accessMode ? 20 : 18,
              color: accessMode ? "white" : "lightgrey",
              fontFamily: accessMode
                ? "MPLUSLatin_Regular"
                : "MPLUSLatin_ExtraLight",
            }}
          >
            Please enter the 6-digit code from your authenticator app.
          </Text>
          <View style={{ width: "100%", alignItems: "center" }}>
            {/* TOTP Input component */}
            <OTPInput
              length={6}
              onChangeCode={(val) => setCode(val)}
              autoFocus={true}
            />
            {/* Confirm BTN */}
            <TouchableOpacity
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Confirm"
              accessibilityHint="Button to confirm the TOTP code"
              accessibilityState={{
                disabled: loading || code.trim().length < 6,
              }}
              onPress={() => onSubmit(code.trim())}
              disabled={loading || code.trim().length < 6}
              style={{
                width: screenWidth * 0.7,
                maxWidth: 400,
                borderRadius: 12,
                overflow: "hidden",
                borderWidth: 2,
                borderColor: "aqua",
                marginBottom: 20,
              }}
            >
              <LinearGradient
                colors={["#00f7f7", "#005757"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  paddingVertical: 6,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text
                    style={{
                      fontFamily: "MPLUSLatin_Bold",
                      fontSize: 22,
                      color: "white",
                      marginBottom: 5,
                      paddingRight: 10,
                    }}
                  >
                    CONFIRM
                  </Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
            {/* Skip BTN */}
            <TouchableOpacity
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Skip"
              onPress={onCancel}
              style={{
                width: screenWidth * 0.7,
                maxWidth: 400,
                borderRadius: 12,
                overflow: "hidden",
                borderWidth: 2,
                borderColor: "white",
                marginBottom: 30,
              }}
            >
              <LinearGradient
                colors={["#FFFFFF", "#AAAAAA"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  paddingVertical: 6,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    fontFamily: "MPLUSLatin_Bold",
                    fontSize: 22,
                    color: "black",
                    marginBottom: 5,
                    paddingRight: 10,
                    textAlign: "center",
                  }}
                >
                  SKIP
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default TotpCodeModal;

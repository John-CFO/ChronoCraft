////////////////////////////////LostPasswordModal Component////////////////////////////

// this component is used to reset the password of the user
// it will send an email to the user with instructions on how to reset the password

////////////////////////////////////////////////////////////////////////////////////////

import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Modal from "react-native-modal";
import { httpsCallable } from "firebase/functions";
import { useTranslation } from "react-i18next";

import { FIREBASE_FUNCTIONS } from "../firebaseConfig";
import { useAlertStore } from "./services/customAlert/alertStore";
import { useDotAnimation } from "../components/DotAnimation";
import { useAccessibilityStore } from "./services/accessibility/accessibilityStore";
import { validateEmail } from "../validation/passwordResetSchemas";

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
  // useTranslation hook to access translations
  const { t } = useTranslation();

  // screensize for dynamic size calculation
  const screenWidth = Dimensions.get("window").width;

  // state to hold the email
  const [email, setEmail] = useState("");

  const sendingRef = useRef(false);

  // state to handle the password reset
  const [sending, setSending] = useState(false);

  //state to handle the cooldown
  const [cooldown, setCooldown] = useState<number | null>(null);

  const handlePasswordReset = async () => {
    if (sendingRef.current || cooldown) return; // prevent floods
    sendingRef.current = true;
    setSending(true);
    // validate the email
    const normalized = validateEmail(email);
    if (!normalized) {
      // condition: if no email is entered show an alert
      useAlertStore
        .getState()
        .showAlert(
          t("passwordReset.alerts.error"),
          t("passwordReset.alerts.invalidEmail"),
        );
      sendingRef.current = false;
      setSending(false);
      return;
    }
    // try to send the password reset email, if it was successful show an alert with instructions
    try {
      const requestReset = httpsCallable(
        FIREBASE_FUNCTIONS,
        "requestPasswordResetFunction",
      );

      await requestReset({ email: normalized });

      useAlertStore
        .getState()
        .showAlert(
          t("passwordReset.alerts.emailSent"),
          t("passwordReset.alerts.emailSentMessage"),
        );

      onClose();

      // cooldown for 1 minute
      setCooldown(60);
      const cooldownInterval = setInterval(
        () => setCooldown((c) => (c && c > 0 ? c - 1 : null)),
        1000,
      );

      setTimeout(() => {
        clearInterval(cooldownInterval);
        setCooldown(null);
      }, 60000);
    } catch (err: any) {
      const code = err?.code;
      //rate-limit error message
      if (code === "functions/resource-exhausted") {
        useAlertStore
          .getState()
          .showAlert(
            t("passwordReset.alerts.tooManyAttempts"),
            t("passwordReset.alerts.rateLimitMessage"),
          );
        return;
      }

      useAlertStore
        .getState()
        .showAlert(
          t("passwordReset.alerts.error"),
          t("passwordReset.alerts.generalError"),
        );
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  };

  // define the dot animation with a delay
  const [loading, setLoading] = useState(true);
  const dots = useDotAnimation(loading, 700);

  // initialize the accessibility store
  const accessMode = useAccessibilityStore(
    (state) => state.accessibilityEnabled,
  );

  return (
    <Modal
      accessible={true}
      accessibilityViewIsModal={true}
      accessibilityLabel={t("passwordReset.modal")}
      accessibilityHint={t("passwordReset.modalHint")}
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
              textAlign: "center",
              color: "white",
              fontSize: 32,
              fontFamily: "MPLUSLatin_Bold",
              marginBottom: 11,
            }}
          >
            {t("passwordReset.title")}
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
              placeholder={`${t("passwordReset.emailPlaceholder")}${dots}`}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor={accessMode ? "white" : "grey"}
              accessible={true}
              importantForAccessibility="yes"
              returnKeyType="next"
              accessibilityLabel={t("passwordReset.emailInput")}
              accessibilityHint={t("passwordReset.emailInputHint")}
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
            accessibilityLabel={t("passwordReset.resetButton")}
            accessibilityHint={t("passwordReset.resetButtonHint")}
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
              <View
                style={{
                  height: 50,
                  width: 200,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                {sending ? (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text
                      style={{
                        marginLeft: 100,
                        transform: [{ translateY: -3 }],
                        fontFamily: "MPLUSLatin_Bold",
                        fontSize: 22,
                        color: "white",
                        textAlign: "center",
                        width: 100,
                      }}
                    >
                      {t("passwordReset.sending")}
                    </Text>
                    <Text
                      style={{
                        transform: [{ translateY: -3 }],
                        fontFamily: "MPLUSLatin_Bold",
                        fontSize: 22,
                        color: "white",
                        width: 100,
                        textAlign: "left",
                      }}
                    >
                      {dots}
                    </Text>
                  </View>
                ) : (
                  <Text
                    style={{
                      transform: [{ translateY: -3 }],
                      fontFamily: "MPLUSLatin_Bold",
                      fontSize: 22,
                      color: "white",
                      textAlign: "center",
                    }}
                  >
                    {t("passwordReset.sendResetLink")}
                  </Text>
                )}
              </View>
            </LinearGradient>
          </TouchableOpacity>

          {/* navigation tip */}
          <Text
            accessible
            accessibilityLabel={t("passwordReset.navigationTip")}
            accessibilityHint={t("passwordReset.navigationHint")}
            style={{
              marginTop: 20,
              fontSize: accessMode ? 20 : 18,
              color: accessMode ? "white" : "lightgrey",
              fontFamily: accessMode
                ? "MPLUSLatin_Regular"
                : "MPLUSLatin_ExtraLight",
            }}
          >
            {t("passwordReset.navigationTip")}
          </Text>
        </View>
      </View>
    </Modal>
  );
};

export default LostPasswordModal;

///////////////////////// MfaScreen.tsx //////////////////////////////////////

// This component is used to display a screen to enter the TOTP code from the authenticator app

///////////////////////////////////////////////////////////////////////////////

import React, { useState, useContext } from "react";
import { View, Text, TouchableOpacity, Dimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { getFunctions, httpsCallable } from "firebase/functions";
import { getAuth, signOut } from "firebase/auth";
import { useTranslation } from "react-i18next";

import { AuthContext } from "../components/contexts/AuthContext";
import { FIREBASE_APP } from "../firebaseConfig";
import OTPInput from "../components/OTPInput";
import { useAlertStore } from "../components/services/customAlert/alertStore";
import { useDotAnimation } from "../components/DotAnimation";
import { useAccessibilityStore } from "../components/services/accessibility/accessibilityStore";
import { logError } from "../lib/loggerClient";

/////////////////////////////////////////////////////////////////////////////////

// Types for authValidator Response
interface AuthValidatorResponse {
  success?: boolean;
  valid?: boolean;
  message?: string;
}

///////////////////////////////////////////////////////////////////////////////////

const MfaScreen: React.FC = () => {
  // useTranslation hook to access translations
  const { t } = useTranslation();

  // declare variables
  const auth = getAuth(FIREBASE_APP);
  const functions = getFunctions(FIREBASE_APP);
  const user = auth.currentUser;

  // get the auth context
  const { setUser, setStage } = useContext(AuthContext);

  // declare tokenInput state
  const [tokenInput, setTokenInput] = useState("");

  // declare loading state
  const [loading, setLoading] = useState(false);

  // declare the dot animation values
  const DOT_INTERVAL_MS = 500;
  const dots = useDotAnimation(loading, DOT_INTERVAL_MS);

  // initialize the accessibility mode
  const accessMode = useAccessibilityStore(
    (state) => state.accessibilityEnabled,
  );

  // declare the visible dots
  const visibleDots = dots;

  // declare the screen width
  const screenWidth = Dimensions.get("window").width;

  // function to verify the TOTP
  const verifyTotp = async () => {
    if (!user || tokenInput.length !== 6) {
      useAlertStore
        .getState()
        .showAlert(
          t("common:mfa.alerts.error"),
          t("common:mfa.alerts.invalidCode"),
        );
      return;
    }

    setLoading(true);
    try {
      const verifyTotpLoginCallable = httpsCallable<
        { token: string },
        AuthValidatorResponse
      >(functions, "verifyTotpLogin");

      const res = await verifyTotpLoginCallable({ token: tokenInput });

      if (!res.data) {
        logError(
          "MfaScreen/verifyTotp/noResponse",
          new Error("verifyTotpLogin returned no data"),
        );
        useAlertStore
          .getState()
          .showAlert(
            t("common:mfa.alerts.error"),
            t("common:mfa.alerts.noServerResponse"),
          );
        return;
      }

      if (res.data.valid) {
        await user?.getIdToken(true);

        useAlertStore
          .getState()
          .showAlert(
            t("common:mfa.alerts.success"),
            t("common:mfa.alerts.authenticationSuccessful"),
          );

        setStage("authenticated");
      } else {
        useAlertStore
          .getState()
          .showAlert(
            "Error",
            res.data.message ||
              t("common:mfa.alerts.invalidAuthenticationCode"),
          );
      }
    } catch (e: any) {
      logError("MfaScreen/verifyTotp", e);

      let errorMessage = t("common:mfa.alerts.invalidAuthenticationCode");

      if (e.code === "functions/failed-precondition") {
        errorMessage = e.message || t("common:mfa.alerts.totpNotEnabled");
      } else if (e.code === "functions/not-found") {
        errorMessage = t("common:mfa.alerts.userNotFound");
      } else if (e.code === "functions/unauthenticated") {
        errorMessage = t("common:mfa.alerts.sessionExpired");
        setStage("loggedOut");
      } else if (e.code === "functions/invalid-argument") {
        errorMessage = e.message || t("common:mfa.alerts.invalidTotpFormat");
      } else if (e.code === "rate-limit-exceeded") {
        // UX-Alert for RateLimit
        const retry = e.retryAfterSeconds
          ? ` ${t("common:mfa.alerts.rateLimitWait", {
              seconds: e.retryAfterSeconds,
            })}`
          : "";
        errorMessage = e.userMessage + retry;
      }

      useAlertStore.getState().showAlert("Error", errorMessage);
    } finally {
      setLoading(false);
      setTokenInput("");
    }
  };

  // function to handle the cancel button
  const handleCancel = async () => {
    await signOut(auth);
    setUser(null);
    setStage("loggedOut");
  };

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "black",
        padding: 20,
      }}
    >
      <Text
        accessibilityRole="header"
        style={{
          color: "white",
          fontSize: accessMode ? 32 : 28,
          fontFamily: "MPLUSLatin_Bold",
          marginBottom: 20,
          textAlign: "center",
        }}
      >
        {t("common:mfa.screenTitle")}
      </Text>

      <Text
        style={{
          color: accessMode ? "white" : "lightgrey",
          fontSize: accessMode ? 20 : 18,
          fontFamily: accessMode
            ? "MPLUSLatin_Regular"
            : "MPLUSLatin_ExtraLight",
          textAlign: "center",
          marginBottom: 20,
        }}
      >
        {t("common:mfa.screenDescription")}
      </Text>

      <OTPInput length={6} onChangeCode={setTokenInput} />

      {/* Confirm Button */}
      <TouchableOpacity
        onPress={verifyTotp}
        accessibilityRole="button"
        accessibilityLabel={t("common:mfa.confirmAccessibility")}
        accessibilityHint={t("common:mfa.confirmHint")}
        accessibilityState={{
          busy: loading,
          disabled: tokenInput.length !== 6 || loading,
        }}
        style={{
          width: screenWidth * 0.7,
          maxWidth: 400,
          borderRadius: 12,
          overflow: "hidden",
          borderWidth: 2,
          borderColor: tokenInput.length === 6 ? "#00f7f7" : "#666666",
          marginTop: 20,
        }}
      >
        <LinearGradient
          colors={
            tokenInput.length === 6
              ? ["#00f7f7", "#005757"]
              : ["#666666", "#333333"]
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            alignItems: "center",
            justifyContent: "center",
            height: 50,
            width: "100%",
          }}
        >
          {loading ? (
            <View
              style={{
                flexDirection: "row",
                justifyContent: "center",
                alignItems: "center",
                paddingHorizontal: 12,
                overflow: "hidden",
              }}
            >
              <Text
                style={{
                  fontFamily: "MPLUSLatin_Bold",
                  fontSize: accessMode ? 24 : 22,
                  color: "white",
                  textAlign: "center",
                  flexShrink: 0,
                }}
              >
                {t("common:mfa.verifying")}
              </Text>
              <Text
                style={{
                  marginLeft: 4,
                  fontFamily: "MPLUSLatin_Bold",
                  fontSize: accessMode ? 20 : 18,
                  color: "white",
                  textAlign: "left",
                  minWidth: 36,
                  flexShrink: 0,
                }}
              >
                {visibleDots}
              </Text>
            </View>
          ) : (
            <Text
              style={{
                fontFamily: "MPLUSLatin_Bold",
                fontSize: accessMode ? 24 : 22,
                color: "white",
                textAlign: "center",
              }}
            >
              {t("common:mfa.confirm")}
            </Text>
          )}
        </LinearGradient>
      </TouchableOpacity>

      {/* Cancel Button */}
      <TouchableOpacity
        onPress={handleCancel}
        accessibilityRole="button"
        accessibilityLabel={t("common:mfa.cancelLoginAccessibility")}
        style={{
          marginTop: 20,
          padding: 10,
        }}
      >
        <Text
          accessibilityHint={t("common:mfa.cancelLoginHint")}
          style={{
            color: accessMode ? "white" : "#999",
            fontSize: accessMode ? 20 : 16,
            fontFamily: "MPLUSLatin_Regular",
          }}
        >
          {t("common:mfa.cancelLogin")}
        </Text>
      </TouchableOpacity>

      {/* Information-Text */}
      <View style={{ marginTop: 30, paddingHorizontal: 20 }}>
        <Text
          style={{
            color: accessMode ? "white" : "#888",
            fontSize: accessMode ? 18 : 14,
            textAlign: "center",
            fontFamily: accessMode
              ? "MPLUSLatin_Regular"
              : "MPLUSLatin_ExtraLight",
          }}
        >
          Note: This screen cannot be bypassed. You must enter the correct TOTP
          code to continue.
        </Text>
      </View>
    </View>
  );
};

export default MfaScreen;

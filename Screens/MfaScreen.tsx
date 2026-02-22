///////////////////////// MfaScreen.tsx //////////////////////////////////////

// This component is used to display a screen to enter the TOTP code from the authenticator app

///////////////////////////////////////////////////////////////////////////////

import React, { useState, useContext } from "react";
import { View, Text, TouchableOpacity, Dimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { getFunctions, httpsCallable } from "firebase/functions";
import { getAuth, signOut } from "firebase/auth";

import { AuthContext } from "../components/contexts/AuthContext";
import { FIREBASE_APP } from "../firebaseConfig";
import OTPInput from "../components/OTPInput";
import { useAlertStore } from "../components/services/customAlert/alertStore";
import { useDotAnimation } from "../components/DotAnimation";
import { useAccessibilityStore } from "../components/services/accessibility/accessibilityStore";

/////////////////////////////////////////////////////////////////////////////////

// Types for authValidator Response
interface AuthValidatorResponse {
  success?: boolean;
  valid?: boolean;
  message?: string;
}

///////////////////////////////////////////////////////////////////////////////////

const MfaScreen: React.FC = () => {
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
        .showAlert("Error", "Please enter a valid 6-digit code.");
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
        console.warn("No data returned from verifyTotpLogin");
        useAlertStore
          .getState()
          .showAlert("Error", "No response from server. Please try again.");
        return;
      }

      if (res.data.valid) {
        useAlertStore
          .getState()
          .showAlert("Success", "Authentication successful.");
        setStage("authenticated");
      } else {
        useAlertStore
          .getState()
          .showAlert(
            "Error",
            res.data.message || "Invalid authentication code.",
          );
      }
    } catch (e: any) {
      console.error("verifyTotp error", e);

      let errorMessage = "Invalid authentication code.";
      if (e.code === "functions/failed-precondition") {
        errorMessage = e.message || "TOTP is not enabled for your account.";
      } else if (e.code === "functions/not-found") {
        errorMessage = "User not found. Please try logging in again.";
      } else if (e.code === "functions/unauthenticated") {
        errorMessage = "Session expired. Please log in again.";
        useAlertStore
          .getState()
          .showAlert("Success", "Authentication successful.");
        setStage("loggedOut");
      } else if (e.code === "functions/invalid-argument") {
        errorMessage = e.message || "Invalid TOTP code format.";
      }
      // Bei anderen Fehlern ggf. allgemeinen Alert anzeigen (optional)
      if (!e.code) {
        useAlertStore.getState().showAlert("Error", errorMessage);
      }
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
        style={{
          color: "white",
          fontSize: 28,
          fontFamily: "MPLUSLatin_Bold",
          marginBottom: 20,
          textAlign: "center",
        }}
      >
        Two-Factor Authentication Required
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
        Enter the 6-digit code from your authenticator app.
      </Text>

      <OTPInput length={6} onChangeCode={setTokenInput} />

      {/* Confirm Button */}
      <TouchableOpacity
        onPress={verifyTotp}
        accessibilityRole="button"
        accessibilityLabel="Confirm TOTP"
        accessibilityHint="Confirms the TOTP code"
        accessibilityState={{ busy: loading }}
        style={{
          width: screenWidth * 0.7,
          maxWidth: 400,
          borderRadius: 12,
          overflow: "hidden",
          borderWidth: 2,
          borderColor: tokenInput.length === 6 ? "#00f7f7" : "#666666",
          marginTop: 20,
        }}
        disabled={tokenInput.length !== 6 || loading}
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
                  fontSize: 22,
                  color: "white",
                  textAlign: "center",
                  flexShrink: 0,
                }}
              >
                Verifying
              </Text>
              <Text
                style={{
                  marginLeft: 4,
                  fontFamily: "MPLUSLatin_Bold",
                  fontSize: 18,
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
                fontSize: 22,
                color: "white",
                textAlign: "center",
              }}
            >
              CONFIRM
            </Text>
          )}
        </LinearGradient>
      </TouchableOpacity>

      {/* Cancel Button */}
      <TouchableOpacity
        onPress={handleCancel}
        accessibilityRole="button"
        accessibilityLabel="Cancel and go back to login"
        style={{
          marginTop: 20,
          padding: 10,
        }}
      >
        <Text
          style={{
            color: "#999",
            fontSize: 16,
            fontFamily: "MPLUSLatin_Regular",
          }}
        >
          Cancel and return to login
        </Text>
      </TouchableOpacity>

      {/* Information-Text */}
      <View style={{ marginTop: 30, paddingHorizontal: 20 }}>
        <Text
          style={{
            color: "#888",
            fontSize: 14,
            textAlign: "center",
            fontFamily: "MPLUSLatin_ExtraLight",
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

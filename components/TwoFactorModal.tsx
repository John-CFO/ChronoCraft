////////////////////////// TwoFactorModal.tsx //////////////////////////////

// Two-Factor Authentication modal with TOTP via Cloud Functions
// Handles enable/disable, QR code display, OTP input, confirm, skip

////////////////////////////////////////////////////////////////////////////

import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  Dimensions,
  TouchableOpacity,
  InteractionManager,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import QRCode from "react-native-qrcode-svg";
import { getAuth } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";

import {
  FIREBASE_APP,
  FIREBASE_FIRESTORE,
  FIREBASE_FUNCTIONS,
} from "../firebaseConfig";
import { useAlertStore } from "../components/services/customAlert/alertStore";
import { useAccessibilityStore } from "../components/services/accessibility/accessibilityStore";
import OTPInput from "./OTPInput";
import DismissKeyboard from "../components/DismissKeyboard";
import { useDotAnimation } from "../components/DotAnimation";

///////////////////////////////////////////////////////////////////////////////

// Props Interface
interface Props {
  onClose: () => void;
  isEnrolled: boolean;
  setIsEnrolled: React.Dispatch<React.SetStateAction<boolean>>;
}

// Typen für die Responses
interface CreateTotpSecretResponse {
  otpAuthUrl: string;
  enrollmentId: string;
  message: string;
}

interface VerifyTotpTokenResponse {
  valid: boolean;
  message: string;
}

interface DisableTotpResponse {
  success: boolean;
  message?: string;
}

/////////////////////////////////////////////////////////////////////////////////

const TwoFactorModal: React.FC<Props> = ({
  onClose,
  isEnrolled,
  setIsEnrolled,
}) => {
  // declarations
  const auth = getAuth(FIREBASE_APP);
  const user = auth.currentUser;
  const [loading, setLoading] = useState(false);
  const [otpUrl, setOtpUrl] = useState<string | null>(null);
  const [tokenInput, setTokenInput] = useState("");
  const [initialized, setInitialized] = useState(false);
  const [enrollmentStarted, setEnrollmentStarted] = useState(false);
  const [enrollmentId, setEnrollmentId] = useState<string | null>(null);

  const screenWidth = Dimensions.get("window").width;
  const DOT_INTERVAL_MS = 500;
  const dots = useDotAnimation(loading, DOT_INTERVAL_MS);
  const visibleDots = dots;

  const isMounted = useRef<boolean>(true);
  // hook to check if component is mounted
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Hook to check if user is enrolled
  useEffect(() => {
    (async () => {
      if (!user) {
        setInitialized(true);
        return;
      }
      try {
        const userRef = doc(FIREBASE_FIRESTORE, "Users", user.uid);
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          const data = snap.data();
          setIsEnrolled(!!data?.totp?.enabled);
        }
      } catch (e) {
        console.error("Error loading TOTP enrollment", e);
        setIsEnrolled(false);
      } finally {
        setInitialized(true);
      }
    })();
  }, [user]);

  // Function to start TOTP enrollment using Cloud Functions
  const startEnroll = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // CreateTOTP Secret Callable Function
      const createTotpSecretFunction = httpsCallable<
        {},
        CreateTotpSecretResponse
      >(FIREBASE_FUNCTIONS, "createTotpSecret");

      const result = await createTotpSecretFunction();
      const data = result.data;

      // Set OTP URL for QR code display
      if (data.otpAuthUrl) {
        setOtpUrl(data.otpAuthUrl);
        setEnrollmentId(data.enrollmentId);
        setEnrollmentStarted(true);

        // Show informational alert
        InteractionManager.runAfterInteractions(() => {
          useAlertStore
            .getState()
            .showAlert(
              "TOTP Enrollment Started",
              "Scan the QR code with your authenticator app.",
              [
                {
                  text: "OK",
                  style: "default",
                },
              ],
            );
        });
      } else {
        throw new Error("No OTP URL received from server");
      }
    } catch (error: any) {
      console.error("startEnroll error", error);

      let errorMessage =
        error.message || "Cannot start TOTP enrollment. Please try again.";

      // spezific error handling messages
      if (error.code === "functions/not-found") {
        errorMessage =
          "Function not found. Please make sure the function is deployed.";
      } else if (error.code === "functions/permission-denied") {
        errorMessage = "Permission denied. Please log in again.";
      }

      InteractionManager.runAfterInteractions(() => {
        useAlertStore.getState().showAlert("Error", errorMessage);
      });
    } finally {
      setLoading(false);
    }
  };

  // Function to confirm TOTP enrollment using Cloud Functions
  const confirmEnroll = async () => {
    if (!user) return;
    if (tokenInput.length !== 6) {
      useAlertStore
        .getState()
        .showAlert("Error", "Please enter a valid 6-digit code.");
      return;
    }

    setLoading(true);
    try {
      const id = enrollmentId;
      if (!id) {
        console.error("Enrollment ID missing");
        return;
      }

      // Verify TOTP Token Callable Function
      const verifyTotpTokenFunction = httpsCallable<
        { token: string; enrollmentId: string },
        VerifyTotpTokenResponse
      >(FIREBASE_FUNCTIONS, "verifyTotpToken");

      const result = await verifyTotpTokenFunction({
        token: tokenInput,
        enrollmentId: id,
      });
      const data = result.data;

      if (data.valid) {
        setIsEnrolled(true);
        setOtpUrl(null);
        setEnrollmentStarted(false);
        setTokenInput("");
        useAlertStore
          .getState()
          .showAlert("Success", "TOTP enabled successfully!");
        onClose();
      } else {
        useAlertStore
          .getState()
          .showAlert("Error", data.message || "Invalid TOTP code");
      }
    } catch (error: any) {
      console.error("confirmEnroll error", error);

      let errorMessage = error.message || "Failed to verify TOTP";

      // spezific error handling messages
      if (error.code === "functions/invalid-argument") {
        errorMessage =
          "Invalid TOTP code. Please enter a valid 6-digit number.";
      } else if (error.code === "functions/failed-precondition") {
        errorMessage = "TOTP not initialized. Please activate TOTP first.";
      }

      useAlertStore.getState().showAlert("Error", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Function to disable TOTP using Cloud Functions
  const disableTotp = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const disableTotpFn = httpsCallable<{}, DisableTotpResponse>(
        FIREBASE_FUNCTIONS,
        "disableTotp",
      );
      const res = await disableTotpFn();
      const data = res.data;

      if (data.success) {
        setIsEnrolled(false);
        setOtpUrl(null);
        setEnrollmentStarted(false);
        setTokenInput("");

        useAlertStore
          .getState()
          .showAlert(
            "2FA Deactivated",
            data.message ||
              "TOTP successfully disabled. You will need to set it up again to use it.",
          );
      } else {
        throw new Error(data.message || "Disabling TOTP failed");
      }
    } catch (err: any) {
      console.error("disableTotp error", err);
      useAlertStore
        .getState()
        .showAlert("Error", err.message || "Cannot disable TOTP.");
    } finally {
      setLoading(false);
    }
  };

  // function to handle the accessibility mode
  const accessMode = useAccessibilityStore(
    (state) => state.accessibilityEnabled,
  );

  if (!initialized) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "rgba(0,0,0,0.5)",
        }}
      >
        <ActivityIndicator size="large" color="white" />
      </View>
    );
  }

  return (
    <DismissKeyboard>
      <View
        accessibilityViewIsModal={true}
        accessible={true}
        accessibilityLabel="Two-Factor-Authentication Dialog"
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "rgba(0, 0, 0, 0.5)",
        }}
      >
        <View
          accessibilityViewIsModal={true}
          style={{
            width: screenWidth * 0.9,
            maxWidth: 600,
            height: "auto",
            backgroundColor: "black",
            padding: 20,
            borderRadius: 15,
            borderWidth: 2,
            borderColor: "lightgrey",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* Header */}
          <Text
            style={{
              textAlign: "center",
              color: "white",
              fontSize: 32,
              fontFamily: "MPLUSLatin_Bold",
              marginBottom: 11,
            }}
          >
            Two Factor Authentication
          </Text>

          <View
            accessible={false}
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
          />

          {isEnrolled ? (
            <>
              <Text
                accessibilityRole="text"
                accessibilityLabel="Two-Factor Authentication is currently enabled."
                style={{
                  textAlign: "center",
                  marginBottom: accessMode ? 20 : 10,
                  fontSize: accessMode ? 20 : 18,
                  color: accessMode ? "white" : "lightgrey",
                  fontFamily: accessMode
                    ? "MPLUSLatin_Regular"
                    : "MPLUSLatin_ExtraLight",
                }}
              >
                Two-Factor Authentication is currently enabled.
              </Text>

              {/* DISABLE Button */}
              <TouchableOpacity
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel="Disable Two Factor"
                accessibilityHint="Disables two factor authentication"
                accessibilityState={{ busy: loading }}
                onPress={disableTotp}
                style={{
                  width: screenWidth * 0.7,
                  maxWidth: 400,
                  borderRadius: 12,
                  overflow: "hidden",
                  borderWidth: 1.5,
                  borderColor: "#FF4C4C",
                  marginBottom: 20,
                }}
              >
                <LinearGradient
                  colors={["#ff4c4cff", "#FF9999"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    alignItems: "center",
                    justifyContent: "center",
                    height: 45,
                    maxWidth: 600,
                  }}
                >
                  <View
                    style={{
                      height: 45,
                      width: 200,
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    {loading ? (
                      <View
                        style={{
                          height: 45,
                          width: "100%",
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "center",
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
                          Disabling
                        </Text>

                        <Text
                          style={{
                            marginLeft: 2,
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
                          marginBottom: 5,
                          fontFamily: "MPLUSLatin_Bold",
                          fontSize: 22,
                          color: "white",
                          textAlign: "center",
                        }}
                      >
                        DISABLE
                      </Text>
                    )}
                  </View>
                </LinearGradient>
              </TouchableOpacity>

              {/* CLOSE */}
              <TouchableOpacity
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel="Close"
                onPress={onClose}
                style={{
                  width: screenWidth * 0.7,
                  maxWidth: 600,
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
                    height: 45,
                    maxWidth: 600,
                  }}
                >
                  <Text
                    style={{
                      marginBottom: 5,
                      fontFamily: "MPLUSLatin_Bold",
                      fontSize: 22,
                      color: "black",
                      textAlign: "center",
                    }}
                  >
                    CLOSE
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </>
          ) : (
            <>
              {!enrollmentStarted ? (
                <>
                  <Text
                    accessibilityRole="text"
                    accessibilityLabel="Setting up TOTP with an authenticator app (Google Authenticator, Authy)."
                    style={{
                      marginBottom: 30,
                      textAlign: "center",
                      marginTop: accessMode ? 10 : 20,
                      fontSize: accessMode ? 20 : 18,
                      color: accessMode ? "white" : "lightgrey",
                      fontFamily: accessMode
                        ? "MPLUSLatin_Regular"
                        : "MPLUSLatin_ExtraLight",
                    }}
                  >
                    Setting up TOTP with an authenticator app (Google
                    Authenticator, Authy).
                  </Text>

                  {/* ACTIVATE */}
                  <TouchableOpacity
                    accessible={true}
                    accessibilityRole="button"
                    accessibilityLabel="Activate Two Factor"
                    accessibilityHint="Activates two factor authentication"
                    accessibilityState={{ busy: loading }}
                    onPress={startEnroll}
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
                        alignItems: "center",
                        justifyContent: "center",
                        height: 45,
                        maxWidth: 600,
                      }}
                    >
                      <View
                        style={{
                          height: 45,
                          width: 200,
                          justifyContent: "center",
                          alignItems: "center",
                        }}
                      >
                        {/* loading dots while activating */}
                        {loading ? (
                          <View
                            style={{
                              height: 45,
                              width: "100%",
                              flexDirection: "row",
                              alignItems: "center",
                              justifyContent: "center",
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
                              Activating
                            </Text>

                            <Text
                              style={{
                                marginLeft: 2,
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
                              marginBottom: 5,
                              fontFamily: "MPLUSLatin_Bold",
                              fontSize: 22,
                              color: "white",
                              textAlign: "center",
                            }}
                          >
                            ACTIVATE
                          </Text>
                        )}
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>

                  {/* SKIP */}
                  <TouchableOpacity
                    accessible={true}
                    accessibilityRole="button"
                    accessibilityLabel="Skip"
                    onPress={onClose}
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
                        alignItems: "center",
                        justifyContent: "center",
                        height: 45,
                        maxWidth: 600,
                      }}
                    >
                      <View
                        style={{
                          height: 45,
                          width: 200,
                          justifyContent: "center",
                          alignItems: "center",
                        }}
                      >
                        <Text
                          style={{
                            marginBottom: 5,
                            fontFamily: "MPLUSLatin_Bold",
                            fontSize: 22,
                            color: "black",
                            textAlign: "center",
                          }}
                        >
                          SKIP
                        </Text>
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  {/* QR Code Display */}
                  {otpUrl && (
                    <View
                      accessible={true}
                      accessibilityLabel="QR Code for the Two Factor Authentication"
                      accessibilityRole="image"
                      style={{
                        marginBottom: 20,
                      }}
                    >
                      <QRCode value={otpUrl} size={220} />
                    </View>
                  )}

                  <Text
                    style={{
                      color: "white",
                      textAlign: "center",
                      marginBottom: 20,
                      fontSize: 16,
                      paddingHorizontal: 10,
                    }}
                  >
                    Scan this QR code with your authenticator app (Google
                    Authenticator, Authy, etc.)
                  </Text>

                  <OTPInput
                    length={6}
                    onChangeCode={(code) => setTokenInput(code)}
                  />

                  {/* CONFIRM Button */}
                  <TouchableOpacity
                    accessible={true}
                    accessibilityRole="button"
                    accessibilityLabel="Confirm TOTP"
                    accessibilityHint="Confirms the TOTP code"
                    accessibilityState={{ busy: loading }}
                    onPress={confirmEnroll}
                    style={{
                      width: screenWidth * 0.7,
                      maxWidth: 400,
                      borderRadius: 12,
                      overflow: "hidden",
                      borderWidth: 2,
                      borderColor: "aqua",
                      marginBottom: 20,
                      marginTop: 20,
                    }}
                    disabled={tokenInput.length !== 6 || !enrollmentId}
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
                        height: 45,
                        maxWidth: 600,
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
                        {loading ? (
                          <View
                            style={{
                              height: 45,
                              width: "100%",
                              flexDirection: "row",
                              alignItems: "center",
                              justifyContent: "center",
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
                              Confirming
                            </Text>

                            <Text
                              style={{
                                marginLeft: 2,
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
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>

                  {/* CANCEL (reset) */}
                  <TouchableOpacity
                    accessible={true}
                    accessibilityRole="button"
                    accessibilityLabel="Cancel TOTP enrollment"
                    onPress={() => {
                      setOtpUrl(null);
                      setEnrollmentStarted(false);
                      setTokenInput("");
                    }}
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
                        alignItems: "center",
                        justifyContent: "center",
                        paddingVertical: 6,
                        maxWidth: 600,
                        height: 45,
                      }}
                    >
                      <Text
                        style={{
                          marginBottom: 5,
                          fontFamily: "MPLUSLatin_Bold",
                          fontSize: 22,
                          color: "black",
                          textAlign: "center",
                        }}
                      >
                        CANCEL
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </>
              )}
            </>
          )}
        </View>
      </View>
    </DismissKeyboard>
  );
};

export default TwoFactorModal;

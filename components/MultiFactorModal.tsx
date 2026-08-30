////////////////////////// MultiFactorModal.tsx //////////////////////////////

// Multi-Factor Authentication modal with TOTP via Cloud Functions
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
import { httpsCallable } from "firebase/functions";
import { useTranslation } from "react-i18next";

import { FIREBASE_APP, FIREBASE_FUNCTIONS } from "../firebaseConfig";
import { useAlertStore } from "../components/services/customAlert/alertStore";
import { useAccessibilityStore } from "../components/services/accessibility/accessibilityStore";
import OTPInput from "./OTPInput";
import DismissKeyboard from "../components/DismissKeyboard";
import { useDotAnimation } from "../components/DotAnimation";
import { ensureAuthReady } from "../services/ensureAuthToken";
import { logError } from "../lib/loggerClient";

///////////////////////////////////////////////////////////////////////////////

// Props Interface
interface Props {
  onClose: () => void;
  isEnrolled: boolean | null;
  setIsEnrolled?: React.Dispatch<React.SetStateAction<boolean>>;
  //callbacks:
  onEnrolled?: () => void;
  onDisabled?: () => void;
}

// Types for Cloud Function responses
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

const MultiFactorModal: React.FC<Props> = ({
  onClose,
  isEnrolled,
  setIsEnrolled,
  onEnrolled,
  onDisabled,
}) => {
  // useTranslation hook to access translations
  const { t } = useTranslation();

  // declarations
  const auth = getAuth(FIREBASE_APP);
  const user = auth.currentUser;
  const [loading, setLoading] = useState(false);
  const [otpUrl, setOtpUrl] = useState<string | null>(null);
  const [tokenInput, setTokenInput] = useState("");
  const [enrollmentStarted, setEnrollmentStarted] = useState(false);
  const [enrollmentId, setEnrollmentId] = useState<string | null>(null);
  const freezeRef = useRef(false);

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

  // Function to start TOTP enrollment using Cloud Functions
  const startEnroll = async () => {
    const user = await ensureAuthReady();
    if (!user) return;
    setLoading(true);
    try {
      // CreateTOTP Secret Callable Function
      const createTotpSecretFunction = httpsCallable<
        {},
        CreateTotpSecretResponse
      >(FIREBASE_FUNCTIONS, "createTotpSecret");

      // Call the function
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
              t("mfaModal.enrollmentStarted"),
              t("mfaModal.enrollmentStartedMessage"),
              [
                {
                  text: t("mfaModal.ok"),
                  style: "default",
                },
              ],
            );
        });
      } else {
        throw new Error(t("mfaModal.noOtpUrl"));
      }
    } catch (error: any) {
      logError("MultiFactorModal/startEnroll", error);

      let errorMessage = t("mfaModal.cannotStart");

      // spezific error handling messages
      if (error.code === "functions/not-found") {
        errorMessage = t("mfaModal.functionNotFound");
      } else if (error.code === "functions/permission-denied") {
        errorMessage = t("mfaModal.permissionDenied");
      }

      InteractionManager.runAfterInteractions(() => {
        useAlertStore.getState().showAlert(t("mfaModal.error"), errorMessage);
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
        .showAlert(t("mfaModal.error"), t("mfaModal.invalidCode"));
      return;
    }

    setLoading(true);
    try {
      const id = enrollmentId;
      if (!id) {
        logError(
          "MultiFactorModal/confirmEnroll/missingEnrollmentId",
          new Error("Enrollment ID missing"),
        );
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
        // **Freeze UI immediately**
        freezeRef.current = true;

        // reset local state
        setOtpUrl(null);
        setEnrollmentStarted(false);
        setTokenInput("");
        setLoading(false);

        onClose();

        setTimeout(() => {
          // update parent-state directly
          if (typeof onEnrolled === "function") {
            onEnrolled();
          } else if (typeof setIsEnrolled === "function") {
            setIsEnrolled(true);
          }

          useAlertStore
            .getState()
            .showAlert(t("mfaModal.success"), t("mfaModal.enabled"));
        }, 0);

        return;
      } else {
        useAlertStore
          .getState()
          .showAlert(
            t("mfaModal.error"),
            data.message || t("mfaModal.invalidTotpCode"),
          );
      }
    } catch (error: any) {
      logError("MultiFactorModal/confirmEnroll", error);

      let errorMessage = t("mfaModal.verifyFailed");
      if (error.code === "functions/invalid-argument") {
        errorMessage = t("mfaModal.invalidTotpCodeDetailed");
      } else if (error.code === "functions/failed-precondition") {
        errorMessage = t("mfaModal.totpNotInitialized");
      }

      useAlertStore.getState().showAlert(t("mfaModal.error"), errorMessage);
    } finally {
      if (isMounted.current) setLoading(false);
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
        // **Freeze UI immediately**
        freezeRef.current = true;

        // reset local state
        setOtpUrl(null);
        setEnrollmentStarted(false);
        setTokenInput("");
        setLoading(false);

        // update parent-state directly
        if (typeof onDisabled === "function") {
          onDisabled();
        } else if (typeof setIsEnrolled === "function") {
          setIsEnrolled(false);
        }

        // close modal and show alert after interactions to ensure smooth UI transition
        setTimeout(() => {
          try {
            onClose();
          } catch (e) {
            logError("MultiFactorModal/onClose", e);
          }

          useAlertStore
            .getState()
            .showAlert(t("mfaModal.disabled"), t("mfaModal.disabledMessage"));

          // release UI freeze after alert is shown
          freezeRef.current = false;
        }, 0);

        return;
      } else {
        throw new Error(data.message || "Disabling MFA failed");
      }
    } catch (err: any) {
      logError("MultiFactorModal/disableTotp", err);
      useAlertStore
        .getState()
        .showAlert(t("mfaModal.error"), t("mfaModal.cannotDisable"));
    } finally {
      if (isMounted.current) setLoading(false);
    }
  };

  // function to handle the accessibility mode
  const accessMode = useAccessibilityStore(
    (state) => state.accessibilityEnabled,
  );

  // Activity indicator with frozen UI when processing enable/disable actions to prevent multiple submissions and ensure smooth transitions
  if (freezeRef.current) {
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
        accessibilityLabel={t("mfa.modal")}
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
            {t("mfa.modal")}
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
                accessibilityLabel={t("mfa.enabled")}
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
                {t("mfa.enabled")}
              </Text>

              {/* DISABLE Button */}
              <TouchableOpacity
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel={t("mfa.disableAccessibility")}
                accessibilityHint={t("mfa.disableHint")}
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
                          paddingHorizontal: 8,
                          overflow: "hidden",
                        }}
                      >
                        <Text
                          numberOfLines={1}
                          adjustsFontSizeToFit
                          style={{
                            fontFamily: "MPLUSLatin_Bold",
                            fontSize: 22,
                            color: "white",
                            textAlign: "center",
                            transform: [{ translateY: -3 }],
                            flexShrink: 1,
                          }}
                        >
                          {t("mfa.disabling")}
                        </Text>

                        <Text
                          style={{
                            marginLeft: 2,
                            fontFamily: "MPLUSLatin_Bold",
                            fontSize: 18,
                            color: "white",
                            textAlign: "left",
                            transform: [{ translateY: -3 }],
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
                          transform: [{ translateY: -3 }],
                        }}
                      >
                        {t("mfa.disable")}
                      </Text>
                    )}
                  </View>
                </LinearGradient>
              </TouchableOpacity>

              {/* CLOSE */}
              <TouchableOpacity
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel={t("mfa.close")}
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
                      fontFamily: "MPLUSLatin_Bold",
                      fontSize: 22,
                      color: "black",
                      textAlign: "center",
                      transform: [{ translateY: -3 }],
                    }}
                  >
                    {t("mfa.close")}
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
                    accessibilityLabel={t("mfa.setupDescription")}
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
                    {t("mfa.setupDescription")}
                  </Text>

                  {/* ACTIVATE */}
                  <TouchableOpacity
                    accessible={true}
                    accessibilityRole="button"
                    accessibilityLabel={t("mfa.activateAccessibility")}
                    accessibilityHint={t("mfa.activateHint")}
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
                                transform: [{ translateY: -3 }],
                                flexShrink: 0,
                              }}
                            >
                              {t("mfa.activating")}
                            </Text>

                            <Text
                              style={{
                                marginLeft: 2,
                                fontFamily: "MPLUSLatin_Bold",
                                fontSize: 18,
                                color: "white",
                                textAlign: "left",
                                transform: [{ translateY: -3 }],
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
                              transform: [{ translateY: -3 }],
                            }}
                          >
                            {t("mfa.activate")}
                          </Text>
                        )}
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>

                  {/* SKIP */}
                  <TouchableOpacity
                    accessible={true}
                    accessibilityRole="button"
                    accessibilityLabel={t("mfa.skip")}
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
                            fontFamily: "MPLUSLatin_Bold",
                            fontSize: 22,
                            color: "black",
                            textAlign: "center",
                            transform: [{ translateY: -3 }],
                          }}
                        >
                          {t("mfa.skip")}
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
                      accessibilityLabel={t("mfa.qrCodeAccessibility")}
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
                    {t("mfa.scanQrCode")}
                  </Text>

                  <OTPInput
                    length={6}
                    onChangeCode={(code) => setTokenInput(code)}
                  />

                  {/* CONFIRM Button */}
                  <TouchableOpacity
                    accessible={true}
                    accessibilityRole="button"
                    accessibilityLabel={t("mfa.confirmAccessibility")}
                    accessibilityHint={t("mfa.confirmHint")}
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
                                transform: [{ translateY: -3 }],
                                flexShrink: 0,
                              }}
                            >
                              {t("mfa.confirming")}
                            </Text>

                            <Text
                              style={{
                                marginLeft: 2,
                                fontFamily: "MPLUSLatin_Bold",
                                fontSize: 18,
                                color: "white",
                                textAlign: "left",
                                transform: [{ translateY: -3 }],
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
                              transform: [{ translateY: -3 }],
                            }}
                          >
                            {t("mfa.confirm")}
                          </Text>
                        )}
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>

                  {/* CANCEL (reset) */}
                  <TouchableOpacity
                    accessible={true}
                    accessibilityRole="button"
                    accessibilityLabel={t("mfa.cancelAccessibility")}
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
                          fontFamily: "MPLUSLatin_Bold",
                          fontSize: 22,
                          color: "black",
                          textAlign: "center",
                          transform: [{ translateY: -3 }],
                        }}
                      >
                        {t("mfa.cancel")}
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

export default MultiFactorModal;

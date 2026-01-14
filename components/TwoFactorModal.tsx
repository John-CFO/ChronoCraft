//////////////////////////TwoFactorModal.tsx/////////////////////////////////////////

// This component is used to display the two-factor authentication modal
// The user can enable or disable two-factor authentication, validate the token
// and enter the TOTP code from the authenticator app

/////////////////////////////////////////////////////////////////////////////////////

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
import { doc, getDoc, updateDoc, deleteField } from "firebase/firestore";

import { FIREBASE_APP, FIREBASE_FIRESTORE } from "../firebaseConfig";
import { useAlertStore } from "../components/services/customAlert/alertStore";
import { useAccessibilityStore } from "../components/services/accessibility/accessibilityStore";
import OTPInput from "./OTPInput";
import DismissKeyboard from "../components/DismissKeyboard";
import { useDotAnimation } from "../components/DotAnimation";

///////////////////////////////////////////////////////////////////////////////////////

interface Props {
  onClose: () => void;
  isEnrolled: boolean;
  setIsEnrolled: React.Dispatch<React.SetStateAction<boolean>>;
}

///////////////////////////////////////////////////////////////////////////////////////

const TwoFactorModal: React.FC<Props> = ({
  onClose,
  isEnrolled,
  setIsEnrolled,
}) => {
  // decare authentication variables
  const auth = getAuth(FIREBASE_APP);
  const user = auth.currentUser;
  // state to handle the loading animation
  const [loading, setLoading] = useState(false);
  // states for TOTP
  const [secret, setSecret] = useState<string | null>(null);
  const [otpUrl, setOtpUrl] = useState<string | null>(null);
  const [tokenInput, setTokenInput] = useState("");
  //state to initialize the component
  const [initialized, setInitialized] = useState(false);

  // screensize for dynamic size calculation
  const screenWidth = Dimensions.get("window").width;

  // define the dot animation with a delay
  const DOT_INTERVAL_MS = 500; // little faster looks fluenter
  const dots = useDotAnimation(loading, DOT_INTERVAL_MS);
  const MIN_ACTION_DURATION_MS = 3000;
  // delay reference
  const isMounted = useRef<boolean>(true);
  // hook to manage the dot animation (delay)
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);
  const wait = (ms: number) => new Promise((res) => setTimeout(res, ms));

  // visibleDots: if hook hasn't produced a value yet, show an immediate "." while loading
  const visibleDots = dots;

  // hook to check if the user is enrolled
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
          // minimal: check only if TOTPenabled exists
          setIsEnrolled(!!data?.totpEnabled);
          // don't set secret locally
          setSecret(null);
        }
      } catch (e) {
        console.error("Error loading TOTP enrollment", e);
        setIsEnrolled(false);
      } finally {
        setInitialized(true);
      }
    })();
  }, [user]);

  // define state to show the secret
  const [showSecret, setShowSecret] = useState(false);

  // function to start TOTP enrollment
  const startEnroll = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Info to user that TOTP is now handled by the backend
      InteractionManager.runAfterInteractions(() => {
        useAlertStore
          .getState()
          .showAlert(
            "Enroll TOTP",
            "TOTP enrollment is now handled by the backend. Please follow the instructions from the server."
          );
      });
    } catch (e) {
      console.error("startEnroll error", e);
      InteractionManager.runAfterInteractions(() => {
        useAlertStore
          .getState()
          .showAlert("Error", "Cannot start TOTP enrollment.");
      });
    } finally {
      setLoading(false);
    }
  };

  // function to confirm TOTP
  const confirmEnroll = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Backend should confirm TOTP
      // Frontend gives only feedback
      InteractionManager.runAfterInteractions(() => {
        useAlertStore
          .getState()
          .showAlert(
            "TOTP Enrollment",
            "Please confirm your TOTP via the backend service."
          );
      });
    } catch (err) {
      console.error("confirmEnroll error", err);
    } finally {
      setLoading(false);
      setTokenInput("");
      setOtpUrl(null);
      onClose();
    }
  };

  // function to disable TOTP
  const disableTotp = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const ref = doc(FIREBASE_FIRESTORE, "Users", user.uid);
      await updateDoc(ref, {
        totpEnabled: false,
        totpSecret: deleteField(),
        totpEncrypted: deleteField(),
      });

      // Eset success directly
      setIsEnrolled(false);
      useAlertStore
        .getState()
        .showAlert("2FA deactivated", "TOTP successfully disabled.");
    } catch (err) {
      console.error("disableTotp error", err);
      useAlertStore.getState().showAlert("Error", "Cannot disable TOTP.");
    } finally {
      setLoading(false);
    }
  };

  // function to get the accessibility mode
  const accessMode = useAccessibilityStore(
    (state) => state.accessibilityEnabled
  );

  if (!initialized) {
    return (
      // Loadingspinner between the modal changing
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

          {/* information text */}
          {isEnrolled ? (
            <>
              <Text
                accessibilityRole="text"
                accessibilityLabel="The Authentication is currently enabled."
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
                The Authentication is currently enabled.
              </Text>

              {/* DISABLE — exakt wie dein FAQ-Button */}
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
                    }}
                  >
                    SKIP
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </>
          ) : (
            <>
              {/* Activate modal */}
              {!secret ? (
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
                  {/* QR */}
                  {otpUrl && (
                    <View
                      accessible={true}
                      accessibilityLabel="QR Code for the Two Factor Authentication"
                      accessibilityRole="image"
                      style={{
                        marginBottom: 8,
                      }}
                    >
                      <QRCode value={otpUrl} size={220} />
                    </View>
                  )}

                  {/* show secret */}
                  <TouchableOpacity
                    accessible={true}
                    accessibilityRole="button"
                    accessibilityLabel={
                      showSecret ? "Hide secret text" : "Display secret text"
                    }
                    accessibilityHint="Display or hide manually entered secret key"
                    onPress={async () => {
                      setShowSecret(!showSecret);
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: "MPLUSLatin_Regular",
                        color: "cyan",
                        textAlign: "center",
                        fontSize: accessMode ? 22 : 18,
                        marginBottom: 10,
                      }}
                    >
                      {showSecret ? secret : "Show secret"}
                    </Text>
                  </TouchableOpacity>

                  <OTPInput
                    length={6}
                    onChangeCode={(code) => setTokenInput(code)}
                  />

                  {/* CONFIRM — wie FAQ-Button (gleiche Struktur wie DISABLE) */}
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

                  {/* SKIP (reset) */}
                  <TouchableOpacity
                    accessible={true}
                    accessibilityRole="button"
                    accessibilityLabel="Skip TOTP"
                    onPress={() => {
                      setSecret(null);
                      setOtpUrl(null);
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
                        SKIP
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

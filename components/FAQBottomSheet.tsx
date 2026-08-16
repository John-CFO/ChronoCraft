/////////////////////////////////// FAQBottomSheet Component ////////////////////////////////////////

// This file is used to create the FAQ bottom sheet modal
// It includes the FAQ sections and the delete account section
// It also includes the functions to open and close the FAQ bottom sheet modal
// And also the answer to change the user´s password

// Important:
// - Firestore deletion logic has been extracted to `firestoreDeleteHelpers.ts`
//   to keep this component small and to allow focused AppSec tests.
// - User-visible messages are surfaced via useAlertStore; internal errors are
//   sanitized before being shown to the user.

///////////////////////////////////////////////////////////////////////////////////////////////////

import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Dimensions,
  AccessibilityInfo,
} from "react-native";
import Collapsible from "react-native-collapsible";
import { LinearGradient } from "expo-linear-gradient";
import { EmailAuthProvider } from "firebase/auth";
import { reauthenticateWithCredential } from "firebase/auth";
import { FontAwesome5 } from "@expo/vector-icons";
import { ScrollView } from "react-native-gesture-handler";
import { getFunctions, httpsCallable } from "firebase/functions";
import { useTranslation } from "react-i18next";

import { FIREBASE_AUTH } from "../firebaseConfig";
import { useAlertStore } from "./services/customAlert/alertStore";
import { useDotAnimation } from "../components/DotAnimation";
import { useAccessibilityStore } from "./services/accessibility/accessibilityStore";
import { logError } from "../lib/loggerClient";

/////////////////////////////////////////////////////////////////////////////////////////////////////

interface FAQBottomSheetProps {
  navigation?: any;
  closeModal: () => void | undefined;
}

//////////////////////////////////////////////////////////////////////////////////////////////////////

const FAQBottomSheet: React.FC<FAQBottomSheetProps> = ({ closeModal }) => {
  // useTranslation hook to access translations
  const { t } = useTranslation();

  // FAQ section states
  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >({
    faq1: false,
    faq2: false,
    faq3: false,
    faq4: false,
  });

  // screensize for dynamic size calculation
  const screenWidth = Dimensions.get("window").width;

  // initialize the accessibility store
  const accessMode = useAccessibilityStore(
    (state) => state.accessibilityEnabled,
  );

  // state for the password visibility
  const [passwordVisibility, setPasswordVisibility] = useState(true);

  // function to open or close a FAQ section
  const toggleSection = (section: string) => {
    setExpandedSections((prevState) => ({
      ...prevState,
      [section]: !prevState[section],
    }));
  };

  // states for delete account
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // get the current user from auth config
  const user = FIREBASE_AUTH.currentUser;

  // function to close the FAQ bottom sheet modal (safe surfaced error)
  const closeFAQSheet = () => {
    try {
      closeModal();
    } catch {
      useAlertStore
        .getState()
        .showAlert(t("faq.alerts.error"), t("faq.alerts.closeFailed"));
    }
  };

  // ref for alert timeout
  const alertTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(
    () => () => {
      if (alertTimeoutRef.current) clearTimeout(alertTimeoutRef.current);
    },
    [],
  );

  // ref for animation timeout
  const animationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(
    () => () => {
      if (animationTimeoutRef.current)
        clearTimeout(animationTimeoutRef.current);
    },
    [],
  );

  // function to delete account (returns boolean success flag)
  const handleDeleteAccount = async (): Promise<boolean> => {
    if (!password?.trim()) {
      useAlertStore
        .getState()
        .showAlert(
          t("faq.alerts.noPassword"),
          t("faq.alerts.passwordRequired"),
        );
      return false;
    }

    if (!user || !user.uid) {
      useAlertStore
        .getState()
        .showAlert(t("faq.alerts.error"), t("faq.alerts.noAuthenticatedUser"));
      return false;
    }

    setLoading(true);
    try {
      const currentUser = FIREBASE_AUTH.currentUser;
      if (!currentUser) {
        useAlertStore
          .getState()
          .showAlert(
            t("faq.alerts.error"),
            t("faq.alerts.noAuthenticatedUser"),
          );
        setLoading(false);
        return false;
      }

      // Reauthenticate user
      const credential = EmailAuthProvider.credential(
        currentUser.email ?? "",
        password,
      );
      await reauthenticateWithCredential(currentUser, credential);

      // Cloud Function to call deleteUserData
      const functions = getFunctions();
      const deleteUserData = httpsCallable(functions, "deleteUserData");
      await deleteUserData({});

      useAlertStore
        .getState()
        .showAlert(t("faq.alerts.success"), t("faq.alerts.accountDeleted"));
      closeFAQSheet();
      setLoading(false);

      // got to login screen after a short delay to allow user to read the success message
      try {
        await FIREBASE_AUTH.signOut();
      } catch (err) {
        logError("FAQBottomSheet/signOut", err);
      }

      return true;
    } catch (error: any) {
      logError("FAQBottomSheet/deleteAccount", error);
      useAlertStore
        .getState()
        .showAlert(t("faq.alerts.error"), t("faq.alerts.deleteFailed"));
      setLoading(false);
      return false;
    }
  };

  // function to handle password visibility toggle
  const deleteAccountVisibility = () =>
    setPasswordVisibility(!passwordVisibility);

  // define the dot animation with a delay
  const dots = useDotAnimation(loading, 700);

  return (
    <View
      accessibilityViewIsModal
      accessible={true}
      accessibilityLabel={t("faq.sheetAccessibility")}
      accessibilityHint={t("faq.sheetHint")}
      style={{
        flex: 1,
        width: "100%",
      }}
    >
      {/* FAQ Header */}
      <View
        accessible={false}
        style={{
          position: "relative",
          height: 50,
          justifyContent: "center",
          borderBottomWidth: 1,
          borderBottomColor: "rgba(255, 255, 255, 0.1)",
        }}
      >
        <Text
          accessibilityRole="header"
          accessibilityLabel={t("faq.titleAccessibility")}
          style={{
            color: accessMode ? "white" : "gray",
            fontSize: accessMode ? 22 : 20,
            fontFamily: "MPLUSLatin_Bold",
            textAlign: "center",
          }}
        >
          {t("faq.title")}
        </Text>
        {/* Close Button */}
        <TouchableOpacity
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={t("faq.close")}
          accessibilityHint={t("faq.closeHint")}
          onPress={closeFAQSheet}
          style={{
            position: "absolute",
            top: 0,
            right: 12,
            width: 32,
            height: 32,
            borderRadius: 16,
            borderColor: "aqua",
            borderWidth: 1,
            backgroundColor: "rgba(0, 0, 0, 0.3)",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 999,
          }}
        >
          <LinearGradient
            colors={["#00f7f7", "#005757"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              alignItems: "center",
              justifyContent: "center",
              height: 30,
              width: 30,
              borderRadius: 16,
            }}
          >
            <Text
              accessible={false}
              style={{
                color: "lightgrey",
                fontSize: 30,
                lineHeight: 32,
                fontWeight: "bold",
              }}
            >
              ×
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }}>
        <View
          style={{
            padding: 20,
            backgroundColor: "#191919",
            borderRadius: 10,
            position: "relative",
            minHeight: 400,
          }}
        >
          {/* FAQ Content */}
          <View style={{ marginTop: 24 }}>
            {/* FAQ 1: How to close workhourschart tooltip */}
            <TouchableOpacity
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={`${t("faq.workhoursTooltip.question")} ${
                expandedSections.faq1 ? t("faq.expanded") : t("faq.collapsed")
              }`}
              accessibilityHint={t("faq.workhoursTooltip.hint")}
              accessibilityState={{ expanded: !!expandedSections.faq1 }}
              onPress={() => {
                // announce planned new state (compute new state before toggle to have correct announcement)
                const willBeExpanded = !expandedSections.faq1;
                toggleSection("faq1");
                AccessibilityInfo.isScreenReaderEnabled().then((enabled) => {
                  if (enabled)
                    AccessibilityInfo.announceForAccessibility(
                      willBeExpanded
                        ? t("faq.answerOpened")
                        : t("faq.answerClosed"),
                    );
                });
              }}
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                paddingVertical: 12,
                borderBottomWidth: 1,
                borderBottomColor: "rgba(255, 255, 255, 0.1)",
              }}
            >
              <Text
                accessible={false}
                style={{
                  fontSize: accessMode ? 18 : 16,
                  fontWeight: "600",
                  color: expandedSections.faq1 ? "aqua" : "white",
                  flex: 1,
                  marginRight: 16,
                }}
              >
                {t("faq.workhoursTooltip.question")}
              </Text>
              <Text style={{ color: "aqua", fontSize: accessMode ? 28 : 20 }}>
                {expandedSections.faq1 ? "−" : "+"}
              </Text>
            </TouchableOpacity>
            <Collapsible collapsed={!expandedSections.faq1}>
              <Text
                accessible={true}
                accessibilityLiveRegion="polite"
                accessibilityLabel={t("faq.workhoursTooltip.answer")}
                style={{
                  paddingTop: 12,
                  fontSize: accessMode ? 18 : 14,
                  color: "#CCCCCC",
                  lineHeight: 20,
                }}
              >
                {t("faq.workhoursTooltip.answer")}
              </Text>
            </Collapsible>
            {/* FAQ 2: How to change your password */}
            <TouchableOpacity
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={`${t("faq.changePassword.question")} ${
                expandedSections.faq2 ? t("faq.expanded") : t("faq.collapsed")
              }`}
              accessibilityHint={t("faq.changePassword.hint")}
              accessibilityState={{ expanded: !!expandedSections.faq2 }}
              onPress={() => {
                const willBeExpanded = !expandedSections.faq2;
                toggleSection("faq2");
                AccessibilityInfo.isScreenReaderEnabled().then((enabled) => {
                  if (enabled)
                    AccessibilityInfo.announceForAccessibility(
                      willBeExpanded
                        ? t("faq.answerOpened")
                        : t("faq.answerClosed"),
                    );
                });
              }}
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                paddingVertical: 12,
                borderBottomWidth: 1,
                borderBottomColor: "rgba(255, 255, 255, 0.1)",
              }}
            >
              <Text
                accessible={false}
                style={{
                  fontSize: accessMode ? 18 : 16,
                  fontWeight: "600",
                  color: expandedSections.faq2 ? "aqua" : "white",
                  flex: 1,
                  marginRight: 16,
                }}
              >
                {t("faq.changePassword.question")}
              </Text>
              <Text
                accessible={false}
                style={{ color: "aqua", fontSize: accessMode ? 28 : 20 }}
              >
                {expandedSections.faq2 ? "−" : "+"}
              </Text>
            </TouchableOpacity>
            <Collapsible collapsed={!expandedSections.faq2}>
              <Text
                accessible={true}
                accessibilityLiveRegion="polite"
                accessibilityLabel={t("faq.changePassword.answer")}
                style={{
                  paddingTop: 12,
                  fontSize: accessMode ? 18 : 14,
                  color: "#CCCCCC",
                  lineHeight: 20,
                }}
              >
                {t("faq.changePassword.answer")}
              </Text>
            </Collapsible>

            {/* FAQ 3: How to delete your account */}
            <TouchableOpacity
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={`${t("faq.deleteAccount.question")} ${
                expandedSections.faq3 ? t("faq.expanded") : t("faq.collapsed")
              }`}
              accessibilityHint={t("faq.deleteAccount.hint")}
              accessibilityState={{ expanded: !!expandedSections.faq3 }}
              onPress={() => {
                const willBeExpanded = !expandedSections.faq3;
                toggleSection("faq3");
                AccessibilityInfo.isScreenReaderEnabled().then((enabled) => {
                  if (enabled)
                    AccessibilityInfo.announceForAccessibility(
                      willBeExpanded
                        ? t("faq.answerOpened")
                        : t("faq.answerClosed"),
                    );
                });
              }}
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                paddingVertical: 12,
                borderBottomWidth: 1,
                borderBottomColor: "rgba(255, 255, 255, 0.1)",
              }}
            >
              <Text
                accessible={false}
                style={{
                  fontSize: accessMode ? 18 : 16,
                  fontWeight: "600",
                  color: expandedSections.faq3 ? "aqua" : "white",
                  flex: 1,
                  marginRight: 16,
                }}
              >
                {t("faq.deleteAccount.question")}
              </Text>
              <Text
                accessible={false}
                style={{ color: "aqua", fontSize: accessMode ? 28 : 20 }}
              >
                {expandedSections.faq3 ? "−" : "+"}
              </Text>
            </TouchableOpacity>
            <Collapsible collapsed={!expandedSections.faq3}>
              <Text
                accessible={true}
                accessibilityLiveRegion="polite"
                accessibilityLabel={t("faq.deleteAccount.answer")}
                style={{
                  paddingTop: 12,
                  fontSize: accessMode ? 18 : 14,
                  color: "#CCCCCC",
                  lineHeight: 20,
                }}
              >
                {t("faq.deleteAccount.answer")}
              </Text>
              <View style={{ alignItems: "center", justifyContent: "center" }}>
                <View
                  style={{
                    width: screenWidth * 0.7, // use 70% of the screen width
                    maxWidth: 400,
                  }}
                >
                  <TextInput
                    accessible={true}
                    accessibilityLabel={t("faq.deleteAccount.passwordInput")}
                    placeholder={t("faq.deleteAccount.passwordPlaceholder")}
                    placeholderTextColor={accessMode ? "white" : "#888"}
                    secureTextEntry={passwordVisibility}
                    value={password}
                    onChangeText={setPassword}
                    style={{
                      width: screenWidth * 0.7, // use 70% of the screen width
                      maxWidth: 400,
                      marginVertical: 10,
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
                  {/* Visibility eye button */}
                  <TouchableOpacity
                    accessible={true}
                    accessibilityRole="button"
                    accessibilityLabel={
                      passwordVisibility
                        ? t("faq.deleteAccount.showPassword")
                        : t("faq.deleteAccount.hidePassword")
                    }
                    accessibilityHint={t("faq.deleteAccount.visibilityHint")}
                    onPress={deleteAccountVisibility}
                    style={{ position: "absolute", right: 15, top: 25 }}
                  >
                    <FontAwesome5
                      name={passwordVisibility ? "eye" : "eye-slash"}
                      size={20}
                      color={accessMode ? "white" : "darkgrey"}
                    />
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel={t("faq.deleteAccount.deleteButton")}
                  accessibilityHint={t("faq.deleteAccount.deleteButtonHint")}
                  accessibilityState={{ busy: loading }}
                  onPress={() =>
                    useAlertStore
                      .getState()
                      .showAlert(
                        t("alerts.deleteAccount.title"),
                        t("alerts.deleteAccount.message"),
                        [
                          {
                            text: t("alerts.cancel"),
                            style: "cancel",
                          },
                          {
                            text: t("alerts.delete"),
                            style: "destructive",
                            onPress: handleDeleteAccount,
                          },
                        ],
                      )
                  }
                  style={{
                    width: screenWidth * 0.7, // use 70% of the screen width
                    maxWidth: 400,
                    borderRadius: 12,
                    overflow: "hidden",
                    borderWidth: 2,
                    borderColor: "aqua",
                    marginBottom: 25,
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
                      // width: screenWidth * 0.7, // use 70% of the screen width
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
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Text
                            style={{
                              marginLeft: 100,
                              marginBottom: 5,
                              fontFamily: "MPLUSLatin_Bold",
                              fontSize: 22,
                              color: "white",
                              textAlign: "center",
                              width: 100,
                            }}
                          >
                            {t("faq.deleteAccount.deleting")}
                          </Text>
                          <Text
                            style={{
                              marginBottom: 5,
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
                            marginBottom: 5,
                            fontFamily: "MPLUSLatin_Bold",
                            fontSize: 22,
                            color: "white",
                            textAlign: "center",
                          }}
                        >
                          {t("faq.deleteAccount.deleteButton")}
                        </Text>
                      )}
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </Collapsible>
            {/* FAQ 4: How can I set up MFA if I only have one smartphone? */}
            <TouchableOpacity
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={`${t("faq.mfaOneDevice.question")} ${
                expandedSections.faq4 ? t("faq.expanded") : t("faq.collapsed")
              }`}
              accessibilityHint={t("faq.mfaOneDevice.hint")}
              accessibilityState={{ expanded: !!expandedSections.faq4 }}
              onPress={() => {
                // announce planned new state (compute new state before toggle to have correct announcement)
                const willBeExpanded = !expandedSections.faq4;
                toggleSection("faq4");
                AccessibilityInfo.isScreenReaderEnabled().then((enabled) => {
                  if (enabled)
                    AccessibilityInfo.announceForAccessibility(
                      willBeExpanded
                        ? t("faq.answerOpened")
                        : t("faq.answerClosed"),
                    );
                });
              }}
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                paddingVertical: 12,
                borderBottomWidth: 1,
                borderBottomColor: "rgba(255, 255, 255, 0.1)",
              }}
            >
              <Text
                accessible={false}
                style={{
                  fontSize: accessMode ? 18 : 16,
                  fontWeight: "600",
                  color: expandedSections.faq4 ? "aqua" : "white",
                  flex: 1,
                  marginRight: 16,
                }}
              >
                {t("faq.mfaOneDevice.question")}
              </Text>
              <Text style={{ color: "aqua", fontSize: accessMode ? 28 : 20 }}>
                {expandedSections.faq4 ? "−" : "+"}
              </Text>
            </TouchableOpacity>
            <Collapsible collapsed={!expandedSections.faq4}>
              <Text
                accessible={true}
                accessibilityLiveRegion="polite"
                accessibilityLabel={t("faq.mfaOneDevice.answer")}
                style={{
                  paddingTop: 12,
                  fontSize: accessMode ? 18 : 14,
                  color: "#CCCCCC",
                  lineHeight: 20,
                }}
              >
                {t("faq.mfaOneDevice.answer")}
              </Text>
            </Collapsible>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

export default FAQBottomSheet;

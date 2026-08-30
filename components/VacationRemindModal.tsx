//////////////////////////VacationRemindModal Component//////////////////////////

// This component is used to show a modal to set a reminder for a vacation
// The user can select a reminder duration and save the reminder to Firestore

////////////////////////////////////////////////////////////////////////////////

import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  findNodeHandle,
  AccessibilityInfo,
} from "react-native";
import Modal from "react-native-modal";
import { LinearGradient } from "expo-linear-gradient";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { useTranslation } from "react-i18next";

import { NotificationManager } from "./services/PushNotifications";
import { FIREBASE_AUTH, FIREBASE_FIRESTORE } from "../firebaseConfig";
import { useService } from "../components/contexts/ServiceContext";
import CheckmarkAnimation from "./Checkmark";
import { useAlertStore } from "./services/customAlert/alertStore";
import { useDotAnimation } from "../components/DotAnimation";
import { useAccessibilityStore } from "./services/accessibility/accessibilityStore";
import { FirestoreVacationSchema } from "../validation/vacationSchemas";
import { logError, logWarn } from "../lib/loggerClient";

/////////////////////////////////////////////////////////////////////////////////

type VacationRemindModalProps = {
  vacationId: string | null;
  isVisible: boolean;
  onClose: () => void;
  onSelect: (index: number) => void;
};

////////////////////////////////////////////////////////////////////////////////

const VacationRemindModal: React.FC<VacationRemindModalProps> = ({
  isVisible,
  onClose,
  vacationId,
}) => {
  // useTranslation hook to access translations
  const { t } = useTranslation();

  // state to handle the dot animation
  const [loading, setLoading] = useState(true);

  // define the dot animation with a delay
  const dots = useDotAnimation(loading, 700);

  // hook to announce accessibility
  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(
      t("vacationReminder.modalOpened"),
    );
  }, []);

  // ref to navigate to remind title
  const remindTitleRef = useRef(null);
  // hook to navigate to the remind title by accessibility
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (remindTitleRef.current) {
        const node = findNodeHandle(remindTitleRef.current);
        if (node) AccessibilityInfo.setAccessibilityFocus(node);
      }
    }, 300); // delay in milliseconds

    return () => clearTimeout(timeout);
  }, []);

  // screensize for dynamic size calculation
  const screenWidth = Dimensions.get("window").width;

  // declare the useService hook
  const { serviceId } = useService();

  // state for selected reminder option
  const [selectedOption, setSelectedOption] = useState<number | null>(null);

  // define reminder durations in days
  const reminderDurations = [1, 3, 7]; // 1 Day, 3 Days, 7 Days

  // function to select a reminder option
  const handleSelectOption = (optionIndex: number) => {
    const selectedDuration = reminderDurations[optionIndex]; // map index to duration
    setSelectedOption(optionIndex); // update selected option
  };

  // reset the selected option when the model will be closed
  const handleCloseModal = () => {
    setSelectedOption(null); // set selected option to null
    onClose();
  };

  // save function with error handling for the button
  const [saving, setSaving] = useState(false);
  const handleSaveReminder = async (
    id: string,
    uid?: string,
    onClose?: () => void,
  ): Promise<void> => {
    setSaving(true);
    try {
      if (!serviceId) {
        logWarn("VacationRemindModal.handleSaveReminder", "Missing serviceId");
        return;
      }

      if (!id) {
        logWarn(
          "VacationRemindModal.handleSaveReminder",
          "Missing vacation id",
        );
        useAlertStore
          .getState()
          .showAlert(
            t("vacationReminder.error"),
            t("vacationReminder.noVacationSelected"),
          );
        return;
      }

      const currentUid = uid || FIREBASE_AUTH.currentUser?.uid;
      if (!currentUid) {
        logWarn("VacationRemindModal.handleSaveReminder", "User not logged in");
        useAlertStore
          .getState()
          .showAlert(
            t("vacationReminder.error"),
            t("vacationReminder.loginRequired"),
          );
        return;
      }

      const chosenIndex = selectedOption;
      if (
        chosenIndex == null ||
        chosenIndex < 0 ||
        chosenIndex >= reminderDurations.length
      ) {
        useAlertStore
          .getState()
          .showAlert(
            t("vacationReminder.error"),
            t("vacationReminder.selectDuration"),
          );
        return;
      }
      const reminderDuration = reminderDurations[chosenIndex];

      // fetch user doc directly
      const userDocRef = doc(FIREBASE_FIRESTORE, "Users", currentUid);
      const userSnap = await getDoc(userDocRef);
      const userDoc = userSnap.exists() ? userSnap.data() : null;

      if (!userDoc) {
        useAlertStore
          .getState()
          .showAlert(
            t("vacationReminder.error"),
            t("vacationReminder.userDocumentMissing"),
          );
        return;
      }

      const pushToken = (userDoc as any).pushToken;
      if (!pushToken) {
        logWarn("VacationRemindModal.handleSaveReminder", "Missing push token");
        useAlertStore
          .getState()
          .showAlert(
            t("vacationReminder.error"),
            t("vacationReminder.pushTokenNotFound"),
          );
        return;
      }

      // fetch vacation doc directly
      const vacationRef = doc(
        FIREBASE_FIRESTORE,
        "Users",
        currentUid,
        "Services",
        serviceId,
        "Vacations",
        id,
      );
      const vacationSnap = await getDoc(vacationRef);
      const vacationRaw = vacationSnap.exists() ? vacationSnap.data() : null;

      if (!vacationRaw) {
        logWarn(
          "VacationRemindModal.handleSaveReminder",
          "Vacation not found in Firestore",
        );
        useAlertStore
          .getState()
          .showAlert(
            t("vacationReminder.error"),
            t("vacationReminder.vacationNotFound"),
          );
        return;
      }

      // optional: parse with FirestoreVacationSchema
      const vacationValidation = FirestoreVacationSchema.safeParse(vacationRaw);
      const vacationDoc = vacationValidation.success
        ? vacationValidation.data
        : vacationRaw; // fallback on raw doc

      if ((vacationDoc as any).reminderDuration) {
        useAlertStore
          .getState()
          .showAlert(
            t("vacationReminder.error"),
            t("vacationReminder.reminderAlreadyExists"),
          );
        return;
      }

      const startDateRaw = (vacationDoc as any).startDate;
      const startDate = new Date(startDateRaw);
      if (isNaN(startDate.getTime())) {
        logWarn(
          "VacationRemindModal.handleSaveReminder",
          "Invalid vacation start date",
        );
        useAlertStore
          .getState()
          .showAlert(
            t("vacationReminder.error"),
            t("vacationReminder.invalidStartDate"),
          );
        return;
      }

      // write reminder (merge)
      await setDoc(
        vacationRef,
        {
          ...vacationDoc,
          reminderDuration,
          createdAt: new Date(),
        },
        { merge: true },
      );

      const reminderDate = new Date(startDate);
      reminderDate.setDate(reminderDate.getDate() - reminderDuration);

      await NotificationManager.scheduleVacationReminder(
        t("vacationReminder.notificationTitle"),
        t("vacationReminder.notificationBody", {
          days: reminderDuration,
        }),
        reminderDate,
        pushToken,
      );

      setSelectedOption(null);
      useAlertStore
        .getState()
        .showAlert(
          t("vacationReminder.success"),
          t("vacationReminder.reminderSaved"),
        );
      if (typeof onClose === "function") onClose();
    } catch (err) {
      logError("VacationRemindModal.handleSaveReminder", err);
      useAlertStore
        .getState()
        .showAlert(
          t("vacationReminder.error"),
          t("vacationReminder.saveFailed"),
        );
    } finally {
      setSaving(false);
    }
  };
  // initialize the accessibility store
  const accessMode = useAccessibilityStore(
    (state) => state.accessibilityEnabled,
  );

  return (
    <Modal
      // modal options
      isVisible={isVisible}
      onSwipeComplete={handleCloseModal}
      onBackdropPress={handleCloseModal}
      swipeDirection={["up", "down"]}
    >
      <View
        accessibilityViewIsModal={true}
        accessibilityLiveRegion="polite"
        style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
      >
        <View
          style={{
            width: "100%",
            height: "70%",
            marginBottom: 20,
            backgroundColor: "black",
            borderWidth: 2,
            borderColor: "lightgrey",
            borderRadius: 15,
            padding: 20,
            alignItems: "center",
          }}
        >
          {/* header*/}

          <View
            accessibilityRole="header"
            accessibilityLabel={t("vacationReminder.title")}
            style={{
              width: 320,
              height: 80,
              borderBottomColor: "lightgrey",
              borderBottomWidth: 0.5,
              backgroundColor: "transparent",
              justifyContent: "flex-end",
              alignItems: "center",
            }}
          >
            <Text
              ref={remindTitleRef}
              accessibilityRole="header"
              accessibilityLabel={t("vacationReminder.title")}
              style={{
                color: "white",
                fontSize: 32,
                fontFamily: "MPLUSLatin_Bold",
                marginBottom: 11,
              }}
            >
              {t("vacationReminder.title")}
            </Text>
          </View>

          {/* checkmark animation*/}
          <CheckmarkAnimation
            selectedOption={selectedOption}
            onSelect={handleSelectOption}
          />

          {/* Save Button */}
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={
              saving ? t("vacationReminder.saving") : t("vacationReminder.save")
            }
            accessibilityHint={
              saving
                ? t("vacationReminder.pleaseWait")
                : t("vacationReminder.saveHint")
            }
            accessibilityState={{ disabled: saving }}
            onPress={() => {
              if (vacationId) {
                handleSaveReminder(
                  vacationId,
                  FIREBASE_AUTH.currentUser?.uid || "",
                  onClose,
                );
              }
            }}
            style={{
              width: screenWidth * 0.7,
              maxWidth: 400,
              borderRadius: 12,
              overflow: "hidden",
              borderWidth: 2,
              borderColor: saving ? "lightgray" : "aqua",
              marginBottom: 30,
            }}
          >
            <LinearGradient
              colors={["#00f7f7", "#005757"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                height: 45,
                justifyContent: "center",
                alignItems: "center",
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
                {saving ? (
                  // animated saving dots
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text
                      // adjust font rendering (if a translation is too long)
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.8}
                      style={{
                        marginBottom: 5,
                        fontFamily: "MPLUSLatin_Bold",
                        fontSize: 22,
                        color: "lightgray",
                        width: 120,
                        textAlign: "right",
                      }}
                    >
                      {t("vacationReminder.saving")}
                    </Text>
                    <Text
                      style={{
                        marginBottom: 5,
                        fontFamily: "MPLUSLatin_Bold",
                        fontSize: 22,
                        color: "lightgray",
                        width: 40,
                        textAlign: "left",
                      }}
                    >
                      {dots}
                    </Text>
                  </View>
                ) : (
                  // regular save button
                  <Text
                    style={{
                      marginBottom: 5,
                      fontFamily: "MPLUSLatin_Bold",
                      fontSize: 22,
                      color: "white",
                      textAlign: "center",
                    }}
                  >
                    {t("vacationReminder.save")}
                  </Text>
                )}
              </View>
            </LinearGradient>
          </TouchableOpacity>

          {/*navigation tip*/}
          <View
            style={{
              height: 45,
              width: 330,
              marginTop: 20,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Text
              accessible
              accessibilityRole="text"
              accessibilityLabel={t(
                "vacationReminder.navigationTipAccessibility",
              )}
              style={{
                fontSize: accessMode ? 20 : 18,
                color: accessMode ? "white" : "lightgrey",
                fontFamily: accessMode
                  ? "MPLUSLatin_Regular"
                  : "MPLUSLatin_ExtraLight",
              }}
            >
              {t("vacationReminder.navigationTip")}
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default VacationRemindModal;

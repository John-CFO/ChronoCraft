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
import { doc, setDoc } from "firebase/firestore";
import { z } from "zod";

import { NotificationManager } from "./services/PushNotifications";
import { FIREBASE_AUTH, FIREBASE_FIRESTORE } from "../firebaseConfig";
import CheckmarkAnimation from "./Checkmark";
import { useAlertStore } from "./services/customAlert/alertStore";
import { useAccessibilityStore } from "./services/accessibility/accessibilityStore";
import { getValidatedDoc } from "../validation/getDocsWrapper.sec";
import { FirestoreVacationSchema } from "../validation/vacationSchemas.sec";

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
  // hook to announce accessibility
  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(
      "Vacation Remind Modal opened. Please select a reminder duration and press save."
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

  // state for selected reminder option
  const [selectedOption, setSelectedOption] = useState<number | null>(null);

  // define reminder durations in days
  const reminderDurations = [1, 3, 7]; // 1 Day, 3 Days, 7 Days

  // function to select a reminder option
  const handleSelectOption = (optionIndex: number) => {
    const selectedDuration = reminderDurations[optionIndex]; // map index to duration
    setSelectedOption(optionIndex); // update selected option
    //console.log("Selected option updated:", selectedDuration);
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
    onClose?: () => void
  ): Promise<void> => {
    setSaving(true);
    try {
      if (!id) {
        useAlertStore.getState().showAlert("Error", "No vacation selected.");
        return;
      }

      // prefer passed uid, otherwise fallback to auth
      const currentUid = uid || FIREBASE_AUTH.currentUser?.uid;
      if (!currentUid) {
        useAlertStore
          .getState()
          .showAlert("Error", "You must be logged in to save a reminder.");
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
          .showAlert("Error", "Please select a reminder duration.");
        return;
      }
      const reminderDuration = reminderDurations[chosenIndex];

      // validate user doc (only pushToken needed)
      const UserPushSchema = z
        .object({ pushToken: z.string().optional() })
        .catchall(z.any());
      const userDocRef = doc(FIREBASE_FIRESTORE, "Users", currentUid);
      const userDoc = await getValidatedDoc(userDocRef, UserPushSchema);

      if (!userDoc) {
        useAlertStore
          .getState()
          .showAlert("Error", "User document invalid or missing.");
        return;
      }
      const pushToken = (userDoc as any).pushToken;
      if (!pushToken) {
        useAlertStore.getState().showAlert("Error", "Push Token not found.");
        return;
      }

      // validate vacation doc
      const vacationRef = doc(
        FIREBASE_FIRESTORE,
        "Users",
        currentUid,
        "Services",
        "AczkjyWoOxdPAIRVxjy3",
        "Vacations",
        id
      );
      const vacationDoc = await getValidatedDoc(
        vacationRef,
        FirestoreVacationSchema
      );

      if (!vacationDoc) {
        useAlertStore
          .getState()
          .showAlert("Error", "Vacation not found or invalid.");
        return;
      }

      if ((vacationDoc as any).reminderDuration) {
        useAlertStore
          .getState()
          .showAlert(
            "Error",
            "Vacation already has a reminder. If you want to change it, delete vacation and create a new one."
          );
        return;
      }

      // parse and validate startDate
      const startDateRaw = (vacationDoc as any).startDate;
      const startDate = new Date(startDateRaw);
      if (isNaN(startDate.getTime())) {
        useAlertStore
          .getState()
          .showAlert("Error", "Invalid vacation start date.");
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
        { merge: true }
      );

      // schedule notification
      const reminderDate = new Date(startDate);
      reminderDate.setDate(reminderDate.getDate() - reminderDuration);

      await NotificationManager.scheduleVacationReminder(
        "Vacation Reminder",
        `Your vacation starts in ${reminderDuration} days.`,
        reminderDate,
        pushToken
      );

      // reset selected option so modal is clean for the next use
      setSelectedOption(null);

      useAlertStore
        .getState()
        .showAlert("Success", "Reminder saved successfully.");
      if (typeof onClose === "function") onClose();
    } catch (err) {
      console.error("Failed to save reminder:", err);
      useAlertStore
        .getState()
        .showAlert("Error", "Failed to save reminder. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // initialize the accessibility store
  const accessMode = useAccessibilityStore(
    (state) => state.accessibilityEnabled
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
            accessibilityLabel="Vacation Reminder"
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
              accessibilityLabel="Vacation Reminder"
              style={{
                color: "white",
                fontSize: 32,
                fontFamily: "MPLUSLatin_Bold",
                marginBottom: 11,
              }}
            >
              Vacation Reminder
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
            accessibilityLabel={saving ? "Saving reminder" : "Save reminder"}
            accessibilityHint={
              saving ? "Please wait" : "Saves the reminder and closes this view"
            }
            accessibilityState={{ disabled: saving }}
            style={{
              width: screenWidth * 0.7, // use 70% of the screen width
              maxWidth: 400,
              borderRadius: 12,
              overflow: "hidden",
              borderWidth: 2,
              borderColor: saving ? "lightgray" : "aqua",
              marginBottom: 30,
            }}
            onPress={() => {
              {
                /* condition to save the reminder */
              }
              if (vacationId) {
                handleSaveReminder(
                  vacationId,
                  FIREBASE_AUTH.currentUser?.uid || "",
                  onClose
                );
              }
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
              <Text
                style={{
                  fontFamily: "MPLUSLatin_Bold",
                  fontSize: 22,
                  color: saving ? "lightgray" : "#ffffff",
                  marginBottom: 5,
                  paddingRight: 10,
                }}
              >
                {saving ? "Saving..." : "Save"}
              </Text>
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
              accessibilityLabel="Navigation tip. Swipe up or down to close."
              style={{
                fontSize: accessMode ? 20 : 18,
                color: accessMode ? "white" : "lightgrey",
                fontFamily: accessMode
                  ? "MPLUSLatin_Regular"
                  : "MPLUSLatin_ExtraLight",
              }}
            >
              Swipe up or down to close
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default VacationRemindModal;

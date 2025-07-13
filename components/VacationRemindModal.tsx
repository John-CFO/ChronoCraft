//////////////////////////VacationRemindModal Component//////////////////////////

// This component is used to show a modal to set a reminder for a vacation
// The user can select a reminder duration and save the reminder to Firestore

////////////////////////////////////////////////////////////////////////////////

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  AccessibilityInfo,
} from "react-native";
import Modal from "react-native-modal";
import { LinearGradient } from "expo-linear-gradient";
import { doc, setDoc, getDoc } from "firebase/firestore";

import { NotificationManager } from "./services/PushNotifications";
import { FIREBASE_AUTH, FIREBASE_FIRESTORE } from "../firebaseConfig";
import CheckmarkAnimation from "./Checkmark";
import { useAlertStore } from "./services/customAlert/alertStore";

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
    id: string, // vacation ID
    uid: string, // user ID
    onClose: () => void // callback to close the modal
  ) => {
    // console.log("Reminder save process started.");
    setSaving(true);
    try {
      // if no vacation is selected send alert
      if (!id) {
        // console.error("No vacation selected.");
        useAlertStore.getState().showAlert("Error", "No vacation selected.");
        return;
      }

      // check if user is logged in
      const user = FIREBASE_AUTH.currentUser;
      //  console.log("Current user:", user);

      // if no user is logged in send alert
      if (!user) {
        useAlertStore
          .getState()
          .showAlert("Error", "You must be logged in to save a reminder.");
        return;
      }

      const reminderDuration = reminderDurations[selectedOption!]; // map index to duration
      //  console.log("Converted reminder duration:", reminderDuration);
      // call user document from firestore
      const userDocRef = doc(FIREBASE_FIRESTORE, "Users", user.uid);
      // console.log("Fetching push token for user:", user.uid);

      // make a snapshot of the user document
      const userSnapshot = await getDoc(userDocRef);
      // if the user document does not exist send alert
      if (!userSnapshot.exists()) {
        // console.error("User document not found in Firestore.");
        useAlertStore
          .getState()
          .showAlert("Error", "User document not found in Firestore.");
        return;
      }
      // exract the push token from the user document
      const userData = userSnapshot.data();
      const pushToken = userData?.pushToken; // call the push token
      //  console.log("Fetched Push Token:", pushToken);
      // if no push token is found send alert
      if (!pushToken) {
        //  console.error("Push Token not found.");
        useAlertStore.getState().showAlert("Error", "Push Token not found.");
        return;
      }

      // get a reference to the vacation document
      const vacationRef = doc(
        FIREBASE_FIRESTORE,
        "Users",
        user.uid,
        "Services",
        "AczkjyWoOxdPAIRVxjy3",
        "Vacations",
        id
      );
      //  console.log("Fetching vacation data for ID:", id);
      // make a snapshot of the vacation document
      const vacationSnapshot = await getDoc(vacationRef);
      // if the vacation document does not exist send alert
      if (!vacationSnapshot.exists()) {
        //  console.error("Vacation not found in Firestore.");
        useAlertStore.getState().showAlert("Error", "Vacation not found.");
        return;
      }
      // make a snapshot of the vacation data
      const vacationData = vacationSnapshot.data();
      //  console.log("Vacation data:", vacationData);

      // if the vacation already has a reminder send alert
      if (vacationData?.reminderDuration) {
        useAlertStore
          .getState()
          .showAlert(
            "Error",
            "Vacation already has a reminder. If   you want to change it, delete vacation and create a new one."
          );
        return; // stop the function if user tries to add a reminder to a vacation that already has one
      }
      // set the start date from the vacation data
      const startDate = new Date(vacationData?.startDate);
      // console.log("Parsed startDate:", startDate);
      // if the start date is invalid send alert
      if (isNaN(startDate.getTime())) {
        // console.error("Invalid vacation start date.");
        useAlertStore
          .getState()
          .showAlert("Error", "Invalid vacation start date.");
        return;
      }
      // console.log("Selected Option for reminderDuration:", selectedOption);
      // if selected option is undefined or invalid send alert
      if (selectedOption == null || selectedOption < 0) {
        // console.error("Selected Option is undefined or invalid.");
        useAlertStore
          .getState()
          .showAlert("Error", "Please select a reminder duration.");
        return;
      }

      // update the reminderDuration in the vacation document
      await setDoc(
        vacationRef,
        {
          reminderDuration, // duraction of the reminder
          createdAt: new Date(),
          ...vacationData, // keep the rest of the data
        },
        { merge: true } // update only the specified fields
      );
      // console.log("Reminder saved successfully.");

      // calculate the reminder date with the selected duration
      const reminderDate = new Date(startDate);
      reminderDate.setDate(reminderDate.getDate() - reminderDuration);
      // console.log("Calculated reminder date:", reminderDate);
      // console.log("Scheduling notification...");

      // plane the notification with the calculated date
      await NotificationManager.scheduleVacationReminder(
        "Vacation Reminder",
        `Your vacation starts in ${reminderDuration} days.`,
        reminderDate,
        pushToken
      );
      // console.log("Notification successfully scheduled.");

      // success alert
      useAlertStore
        .getState()
        .showAlert("Success", "Reminder saved successfully.");
      // console.log("Reminder save process completed.");
      onClose(); // close the modal after saving
    } catch (error) {
      //  console.error("Failed to save reminder:", error);
      useAlertStore
        .getState()
        .showAlert("Error", "Failed to save reminder. Please try again.");
    }
    setSaving(false);
  };

  return (
    <Modal
      // modal options
      isVisible={isVisible}
      onSwipeComplete={handleCloseModal}
      onBackdropPress={handleCloseModal}
      swipeDirection={["up", "down"]}
    >
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
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
                  color: saving ? "lightgray" : "white",
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
              style={{
                fontSize: 18,
                color: "lightgrey",
                fontFamily: "MPLUSLatin_ExtraLight",
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

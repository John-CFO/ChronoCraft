//////////////////////////VacationRemindModal Component//////////////////////////

import React, { useState } from "react";
import { View, Text, TouchableOpacity, Alert } from "react-native";
import Modal from "react-native-modal";
import { LinearGradient } from "expo-linear-gradient";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

import { FIREBASE_AUTH, FIREBASE_FIRESTORE } from "../firebaseConfig";
import CheckmarkAnimation from "./Checkmark";

/////////////////////////////////////////////////////////////////////////////////

type VacationRemindModalProps = {
  isVisible: boolean;
  onClose: () => void;
  onSelect: (value: string) => void;
};

////////////////////////////////////////////////////////////////////////////////

const VacationRemindModal: React.FC<VacationRemindModalProps> = ({
  isVisible,
  onClose,
}) => {
  const [selectedOption, setSelectedOption] = useState<number | null>(null);

  // save function with error handling for the button
  const handleSaveReminder = async () => {
    try {
      // condition to check if selectedOption is´nt selected (give alert back)
      if (selectedOption === null) {
        Alert.alert("Error", "Please select a reminder option before saving.");
        return;
      }

      //  Array of reminder durations (in days)
      const reminderDurations = [1, 3, 7];
      const selectedDuration = reminderDurations[selectedOption];

      // condition to check if user is logged in ( is not give alert back and return)
      const user = FIREBASE_AUTH.currentUser;
      if (!user) {
        Alert.alert("Error", "You must be logged in to save a reminder.");
        return;
      }

      // firebase route
      const reminderRef = doc(
        FIREBASE_FIRESTORE,
        "Services",
        "AczkjyWoOxdPAIRVxjy3",
        "Reminders",
        user.uid
      );
      // add data to firebase with reminderDuration and createdAt
      await setDoc(reminderRef, {
        reminderDuration: selectedDuration,
        createdAt: serverTimestamp(),
      });
      // alert to inform user that reminder has been saved
      Alert.alert("Success", "Reminder saved successfully.");
      onClose();
    } catch (error) {
      console.error("Failed to save reminder:", error);
      Alert.alert("Error", "Failed to save reminder. Please try again.");
    }
  };

  return (
    <Modal
      // modal options
      isVisible={isVisible}
      onSwipeComplete={onClose}
      onBackdropPress={onClose}
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
            onSelect={setSelectedOption}
          />
          {/* Save Button */}
          <TouchableOpacity
            style={{
              height: 45,
              width: 120,
              marginBottom: 60,
              borderRadius: 8,
              borderWidth: 3,
              borderColor: "white",
              overflow: "hidden",
            }}
            onPress={handleSaveReminder as any}
          >
            <LinearGradient
              colors={["#00FFFF", "#FFFFFF"]}
              style={{
                alignItems: "center",
                justifyContent: "center",
                height: 45,
                width: 120,
              }}
            >
              <Text
                style={{
                  color: "grey",
                  fontSize: 18,
                  fontFamily: "MPLUSLatin_Bold",
                  marginBottom: 11,
                  marginRight: 9,
                }}
              >
                Save
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

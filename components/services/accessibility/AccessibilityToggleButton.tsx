////////////////////////////AccessibilityToggleButton Component////////////////////////////////

// This component is used to toggle the accessibility mode on and off when the user clicks on the button

//////////////////////////////////////////////////////////////////////////////////////////////

import React, { useEffect, useState } from "react";
import { TouchableOpacity, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { doc, setDoc, getDoc } from "firebase/firestore";

import { useAccessibilityStore } from "./accessibilityStore";
import { FIREBASE_AUTH, FIREBASE_FIRESTORE } from "../../../firebaseConfig";

//////////////////////////////////////////////////////////////////////////////////////////////

const STORAGE_KEY = "uiAccessibilityMode";

const AccessibilityToggleButton = () => {
  const isAccessible = useAccessibilityStore(
    (state) => state.accessibilityEnabled,
  );
  const setAccessibility = useAccessibilityStore(
    (state) => state.setAccessibility,
  );
  const [loading, setLoading] = useState(true);

  // Load initial value from backend or AsyncStorage
  useEffect(() => {
    const loadAccessibility = async () => {
      const user = FIREBASE_AUTH.currentUser;

      // Backend first
      if (user) {
        try {
          const userRef = doc(FIREBASE_FIRESTORE, "Users", user.uid);
          const snap = await getDoc(userRef);
          const backendValue = snap.data()?.settings?.uiAccessibilityMode;
          if (backendValue !== undefined) {
            setAccessibility(backendValue);
            await AsyncStorage.setItem(STORAGE_KEY, backendValue.toString());
            setLoading(false);
            return;
          }
        } catch (err) {
          console.error("Error loading accessibility from backend:", err);
        }
      }

      // Fallback AsyncStorage
      try {
        const localValue = await AsyncStorage.getItem(STORAGE_KEY);
        setAccessibility(localValue === "true");
      } catch (err) {
        console.error("Error loading accessibility from AsyncStorage:", err);
      }
      setLoading(false);
    };

    loadAccessibility();
  }, [setAccessibility]);

  // Toggle function
  const toggleAccessibility = async () => {
    const newValue = !isAccessible;
    setAccessibility(newValue);

    // Store locally
    try {
      await AsyncStorage.setItem(STORAGE_KEY, newValue.toString());
    } catch (err) {
      console.error("Error saving accessibility locally:", err);
    }

    // Store in backend
    const user = FIREBASE_AUTH.currentUser;
    if (!user) return;
    try {
      const userRef = doc(FIREBASE_FIRESTORE, "Users", user.uid);
      await setDoc(
        userRef,
        { settings: { uiAccessibilityMode: newValue } },
        { merge: true },
      );
    } catch (err) {
      console.error("Error saving accessibility to backend:", err);
    }
  };

  if (loading) return null; // optional: tiny loading state to prevent flicker on initial load

  return (
    <TouchableOpacity
      onPress={toggleAccessibility}
      accessibilityRole="button"
      accessibilityLabel="Toggle Accessibility Mode"
      accessibilityHint="Activates or deactivates screen reader optimized mode"
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 18,
        paddingVertical: 8,
        gap: 30,
      }}
    >
      <Ionicons
        name={isAccessible ? "accessibility-sharp" : "accessibility-outline"}
        size={24}
        color={isAccessible ? "aqua" : "darkgrey"}
      />
      <Text
        style={{
          fontSize: 22,
          color: isAccessible ? "aqua" : "darkgrey",
          fontFamily: "MPLUSLatin_Regular",
        }}
      >
        Accessibility {isAccessible ? "On" : "Off"}
      </Text>
    </TouchableOpacity>
  );
};

export default AccessibilityToggleButton;

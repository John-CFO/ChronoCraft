///////////////////////////////////FAQBottomSheet Component////////////////////////////////////////

import React, { useState, useRef } from "react";
import { View, Text, TouchableOpacity, Alert, TextInput } from "react-native";
import Collapsible from "react-native-collapsible";
import { doc, updateDoc } from "firebase/firestore";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { getStorage, ref, deleteObject } from "firebase/storage";
import { EmailAuthProvider } from "firebase/auth";
import { reauthenticateWithCredential } from "firebase/auth";
import { useNavigation } from "@react-navigation/native";

import { FIREBASE_FIRESTORE, FIREBASE_AUTH } from "../firebaseConfig";

///////////////////////////////////////////////////////////////////////////////////////////////////

const FAQBottomSheet = () => {
  const navigation = useNavigation();
  const [expandedSections, setExpandedSections] = useState<{
    [key: string]: boolean;
  }>({
    accountDeletion: false,
    faq1: false,
    faq2: false,
  });

  const bottomSheetModalRef = useRef<typeof BottomSheetModal>(null);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const user = FIREBASE_AUTH.currentUser;
  const userUid = user ? user.uid : null;

  const toggleSection = (section: string) => {
    setExpandedSections((prevState) => ({
      ...prevState,
      [section]: !prevState[section],
    }));
  };

  const closeFAQSheet = () => {
    //bottomSheetModalRef.current?.dismiss();
    if (bottomSheetModalRef.current) {
      // Falls erforderlich, explizites Casting des Typs
      (bottomSheetModalRef.current as any).close(); // Versuche es mit `close()` oder `dismiss()`
    }
  };
  const reauthenticateUser = async (password: string) => {
    if (!user) {
      throw new Error("No user is signed in.");
    }

    const credential = EmailAuthProvider.credential(user.email!, password);

    try {
      await reauthenticateWithCredential(user, credential);
      console.log("Reauthentication successful");
    } catch (error) {
      console.error("Error during reauthentication:", error);
      throw error;
    }
  };

  const deleteImageFromStorage = async (imagePath: string) => {
    try {
      const storage = getStorage();
      const imageRef = ref(storage, imagePath);
      await deleteObject(imageRef);
      console.log("Image deleted successfully");
    } catch (error) {
      console.error("Error deleting image:", error);
    }
  };

  const markUserDataAsInactive = async (userUid: string) => {
    try {
      const userRef = doc(FIREBASE_FIRESTORE, "Users", userUid);
      await updateDoc(userRef, { isActive: false }); // Marking the data as inactive
      console.log("User data marked as inactive");
    } catch (error) {
      console.error("Error marking user data as inactive:", error);
      throw error;
    }
  };

  const handleDeleteAccount = async () => {
    if (!password) {
      Alert.alert("Error", "Please enter your password.");
      return;
    }

    setLoading(true);

    try {
      if (!userUid) {
        throw new Error("No user is signed in.");
      }

      await reauthenticateUser(password);
      await deleteImageFromStorage(`profilePictures/${userUid}`);
      await markUserDataAsInactive(userUid); // Mark data as inactive before deletion
      await FIREBASE_AUTH.currentUser?.delete();
      Alert.alert("Success", "Your account has been deleted.");

      closeFAQSheet();

      navigation.reset({
        index: 0,
        routes: [{ name: "Login" as never }],
      });
    } catch (error: any) {
      console.error("Fehler beim Löschen des Kontos:", error);
      Alert.alert(
        "Error",
        "There was an issue deleting your account: " + error.message
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ padding: 20, backgroundColor: "white", borderRadius: 10 }}>
      {/* FAQ 1: Beispielinhalt */}
      <TouchableOpacity
        onPress={() => toggleSection("faq1")}
        style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}
      >
        <Text style={{ fontSize: 16, fontWeight: "bold" }}>
          How to change my password?
        </Text>
        <Text style={{ marginLeft: 10, fontSize: 18 }}>
          {expandedSections.faq1 ? "↑" : "↓"}
        </Text>
      </TouchableOpacity>
      <Collapsible collapsed={!expandedSections.faq1}>
        <Text style={{ marginTop: 10, fontSize: 14, color: "#555" }}>
          ........................................
        </Text>
      </Collapsible>

      {/* FAQ 2: Beispielinhalt */}
      <TouchableOpacity
        onPress={() => toggleSection("faq2")}
        style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}
      >
        <Text style={{ fontSize: 16, fontWeight: "bold" }}>
          How to add a project?
        </Text>
        <Text style={{ marginLeft: 10, fontSize: 18 }}>
          {expandedSections.faq2 ? "↑" : "↓"}
        </Text>
      </TouchableOpacity>
      <Collapsible collapsed={!expandedSections.faq2}>
        <Text style={{ marginTop: 10, fontSize: 14, color: "#555" }}>
          .........................................
        </Text>
      </Collapsible>

      {/* FAQ 3: Konto löschen */}
      <TouchableOpacity
        onPress={() => toggleSection("accountDeletion")}
        style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}
      >
        <Text style={{ fontSize: 16, fontWeight: "bold" }}>
          How to delete my account?
        </Text>
        <Text style={{ marginLeft: 10, fontSize: 18 }}>
          {expandedSections.accountDeletion ? "↑" : "↓"}
        </Text>
      </TouchableOpacity>
      <Collapsible collapsed={!expandedSections.accountDeletion}>
        <Text style={{ marginTop: 10, fontSize: 14, color: "#555" }}>
          To delete your account, you must confirm your password. If you delete
          your account, your data will no longer exist the next time you
          register.
        </Text>
        <TextInput
          placeholder="add your password"
          secureTextEntry
          style={{
            borderWidth: 1,
            borderRadius: 5,
            padding: 10,
            marginVertical: 20,
            borderColor: "#ccc",
          }}
          value={password}
          onChangeText={setPassword}
        />
        <TouchableOpacity
          onPress={handleDeleteAccount}
          disabled={loading}
          style={[
            {
              backgroundColor: "red",
              paddingVertical: 12,
              paddingHorizontal: 20,
              borderRadius: 5,
              marginTop: 10,
            },
            loading && { backgroundColor: "#ccc" },
          ]}
        >
          <Text
            style={{ color: "white", textAlign: "center", fontWeight: "bold" }}
          >
            {loading ? "Lösche Konto..." : "Konto löschen"}
          </Text>
        </TouchableOpacity>
      </Collapsible>
    </View>
  );
};

export default FAQBottomSheet;

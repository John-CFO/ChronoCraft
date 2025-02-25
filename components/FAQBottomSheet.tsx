///////////////////////////////////FAQBottomSheet Component////////////////////////////////////////

import React, { useState, useRef } from "react";
import { View, Text, TouchableOpacity, Alert, TextInput } from "react-native";
import Collapsible from "react-native-collapsible";
import { doc, updateDoc } from "firebase/firestore";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { deleteObject, ref, getStorage } from "firebase/storage";
import { EmailAuthProvider } from "firebase/auth";
import { reauthenticateWithCredential } from "firebase/auth";

import { FIREBASE_FIRESTORE, FIREBASE_AUTH } from "../firebaseConfig";

///////////////////////////////////////////////////////////////////////////////////////////////////

const FAQBottomSheet = ({ navigation }: { navigation: any }) => {
  // reference to the bottom sheet modal
  const bottomSheetModalRef = useRef<typeof BottomSheetModal>(null);

  // FAQ section states
  const [expandedSections, setExpandedSections] = useState<{
    [key: string]: boolean;
  }>({
    faq1: false,
    faq2: false,
    faq3: false,
  });

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

  // get the current user
  const user = FIREBASE_AUTH.currentUser;
  const userUid = user ? user.uid : null;

  // function to close the FAQ bottom sheet modal
  const closeFAQSheet = () => {
    // condition to check if the bottomSheetModalRef is defined
    if (bottomSheetModalRef.current) {
      // if defined, close the modal
      (bottomSheetModalRef.current as any).close();
    }
  };

  // reauthenticate the user in Firebase Auth
  const reauthenticateUser = async (password: string) => {
    if (!user) {
      throw new Error("No user is signed in.");
    }
    // create a credential with the user's email and password
    const credential = EmailAuthProvider.credential(user.email!, password);

    try {
      // reauthenticate the user
      await reauthenticateWithCredential(user, credential);
      // console.log("Reauthentication successful");
    } catch (error) {
      console.error("Error during reauthentication:", error);
      throw error;
    }
  };

  // function to delete an image from Firebase Storage
  const deleteImageFromStorage = async (imagePath: string) => {
    // check if Firebase Storage is enabled
    if (process.env.FIREBASE_STORAGE_ENABLED === "false") {
      //  console.log("Skipping image deletion: Firebase Storage is disabled.");
      return;
    }

    const storage = getStorage();
    const imageRef = ref(storage, imagePath);

    try {
      await deleteObject(imageRef);
      // console.log("Image deleted successfully.");
    } catch (error: any) {
      if (error.code === "storage/object-not-found") {
        console.log("Image not found. Skipping delete.");
      } else {
        console.error("Error deleting image:", error);
      }
    }
  };

  // function to mark user data as inactive
  const markUserDataAsInactive = async (userUid: string) => {
    try {
      const userRef = doc(FIREBASE_FIRESTORE, "Users", userUid);
      await updateDoc(userRef, { isActive: false }); // marking the data as inactive
      // console.log("User data marked as inactive");
    } catch (error) {
      console.error("Error marking user data as inactive:", error);
      throw error;
    }
  };

  // function to handle account deletion
  const handleDeleteAccount = async () => {
    // condition to check if no password is entered
    if (!password) {
      Alert.alert("Error", "Please enter your password.");
      return;
    }

    setLoading(true);
    // try to delete the account
    try {
      if (!userUid) {
        throw new Error("No user is signed in.");
      }

      await reauthenticateUser(password);
      await deleteImageFromStorage(`profilePictures/${userUid}`);
      await markUserDataAsInactive(userUid); // mark data as inactive before deletion
      await FIREBASE_AUTH.currentUser?.delete();
      // alert info to user that account has been deleted
      Alert.alert("Success", "Your account has been deleted.");

      closeFAQSheet();

      // navigate to the login screen with a small delay
      setTimeout(() => {
        if (navigation && navigation.reset) {
          navigation.reset({
            index: 0,
            routes: [{ name: "LoginScreen" }],
          });
        }
      }, 500); // a small delay to ensure smooth transition
    } catch (error: any) {
      console.error("Error deleting account:", error);
      // alert error to user
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
      {/* FAQ 1: How to close workhourschart tooltip */}
      <TouchableOpacity
        onPress={() => toggleSection("faq1")}
        style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}
      >
        <Text style={{ fontSize: 16, fontWeight: "bold" }}>
          How to close the tooltip on the Workhours Chart?
        </Text>
        <Text style={{ marginLeft: 10, fontSize: 18 }}>
          {expandedSections.faq1 ? "↑" : "↓"}
        </Text>
      </TouchableOpacity>
      <Collapsible collapsed={!expandedSections.faq1}>
        <Text style={{ marginTop: 10, fontSize: 14, color: "#555" }}>
          To close the tooltip, simply tap anywhere outside the chart area but
          inside the card. The entire card is set up to listen for taps outside
          of the chart, so if you tap on any empty space within the card (but
          not on the chart itself), the tooltip will automatically disappear. If
          you have any further questions about using the chart or interacting
          with the tooltip, please let us know!
        </Text>
      </Collapsible>

      {/* FAQ 2: Beispielinhalt */}
      <TouchableOpacity
        onPress={() => toggleSection("faq2")}
        style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}
      >
        <Text style={{ fontSize: 16, fontWeight: "bold" }}>
          How to change my password?
        </Text>
        <Text style={{ marginLeft: 10, fontSize: 18 }}>
          {expandedSections.faq1 ? "↑" : "↓"}
        </Text>
      </TouchableOpacity>
      <Collapsible collapsed={!expandedSections.faq2}>
        <Text style={{ marginTop: 10, fontSize: 14, color: "#555" }}>
          ........................................
        </Text>
      </Collapsible>

      {/* FAQ 3: Beispielinhalt */}
      <TouchableOpacity
        onPress={() => toggleSection("faq3")}
        style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}
      >
        <Text style={{ fontSize: 16, fontWeight: "bold" }}>
          How to add a project?
        </Text>
        <Text style={{ marginLeft: 10, fontSize: 18 }}>
          {expandedSections.faq2 ? "↑" : "↓"}
        </Text>
      </TouchableOpacity>
      <Collapsible collapsed={!expandedSections.faq3}>
        <Text style={{ marginTop: 10, fontSize: 14, color: "#555" }}>
          .........................................
        </Text>
      </Collapsible>

      {/* FAQ 4: Konto löschen */}
      <TouchableOpacity
        onPress={() => toggleSection("faq4")}
        style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}
      >
        <Text style={{ fontSize: 16, fontWeight: "bold" }}>
          How to delete my account?
        </Text>
        <Text style={{ marginLeft: 10, fontSize: 18 }}>
          {expandedSections.faq3 ? "↑" : "↓"}
        </Text>
      </TouchableOpacity>
      <Collapsible collapsed={!expandedSections.faq4}>
        <Text style={{ marginTop: 10, fontSize: 14, color: "#555" }}>
          To delete your account, you must confirm your password. If you delete
          your account, your data will no longer exist the next time you
          register.
        </Text>
        {/* Password Input Field */}
        <TextInput
          placeholder="add your password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          style={{
            borderWidth: 1,
            borderRadius: 5,
            padding: 10,
            marginVertical: 20,
            borderColor: "#ccc",
          }}
        />
        {/*Button to delete account */}
        <TouchableOpacity
          onPress={handleDeleteAccount}
          style={[
            {
              backgroundColor: "red",
              paddingVertical: 12,
              paddingHorizontal: 20,
              borderRadius: 5,
              marginTop: 10,
            },
          ]}
        >
          <Text
            style={{ color: "white", textAlign: "center", fontWeight: "bold" }}
          >
            {loading ? "deleting..." : "Delete Account"}
          </Text>
        </TouchableOpacity>
      </Collapsible>
    </View>
  );
};

export default FAQBottomSheet;

////////////////////////////////////EditProfileModal Component////////////////////////////////////////

// This component is used to edit user profile
// users can change their name, personal ID and profile picture
// name and personal ID are stored in Firestore while the profile picture is stored in Firebase Storage

///////////////////////////////////////////////////////////////////////////////////////////////////////

import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ImageBackground,
  Image,
  Dimensions,
  findNodeHandle,
  AccessibilityInfo,
} from "react-native";
import React, { useEffect, useState, useRef } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { User, getAuth } from "firebase/auth";
import * as ImagePicker from "expo-image-picker";

import { FIREBASE_AUTH } from "../firebaseConfig";
import DismissKeyboard from "../components/DismissKeyboard";
import { useAlertStore } from "../components/services/customAlert/alertStore";
import { sanitizeName, sanitizePersonalID } from "./InputSanitizers";
import { useAccessibilityStore } from "../components/services/accessibility/accessibilityStore";
import { handleSaveProfile } from "../components/utils/handleSaveProfile";

////////////////////////////////////////////////////////////////////////////////////////////////////

// interface for edit profile modal component props
interface EditProfileModalProps {
  user: User;
  userId: string;
  onClose: () => void;
  visible: boolean;
  navigation: any;
}

/////////////////////////////////////////////////////////////////////////////////////////////////////

const EditProfileModal: React.FC<EditProfileModalProps> = ({
  onClose,
  user,
}) => {
  // hook to announce accessibility
  useEffect(() => {
    AccessibilityInfo.announceForAccessibility("Edit profile modal opened");
  }, []);

  // ref to navigate to the profile title
  const profileTitleRef = useRef(null);

  // hook to navigate to the profile title by accessibility
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (profileTitleRef.current) {
        const node = findNodeHandle(profileTitleRef.current);
        if (node) AccessibilityInfo.setAccessibilityFocus(node);
      }
    }, 300); // delay in milliseconds

    return () => clearTimeout(timeout);
  }, []);

  // state declaration for the edit properties
  const [newName, setNewName] = useState("");
  const [newPersonalID, setNewPersonalID] = useState("");
  const [imageUri, setImageUri] = useState<string | null>(null);

  // screensize for dynamic size calculation
  const screenWidth = Dimensions.get("window").width;

  if (!user) {
    return null;
  }

  // hook to request media library permissions on component mount
  useEffect(() => {
    const requestMediaLibraryPermissions = async () => {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        useAlertStore
          .getState()
          .showAlert(
            "Permission Error",
            "Sorry, we need camera roll permissions to make this work!"
          );
      }
    };

    requestMediaLibraryPermissions();
  }, []);

  // function to pick image from device gallery with expo ImagePicker
  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });
    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    } else {
      useAlertStore
        .getState()
        .showAlert("No Image Selected", "You did not select any image.");
    }
  };

  // handleSave function to check user auth and save data from current user in Firestore and then close modal
  const [saving, setSaving] = useState(false);
  const handleSave = async () => {
    const currentUser = getAuth().currentUser ?? FIREBASE_AUTH.currentUser;
    if (!currentUser?.uid) {
      console.warn("No authenticated user; aborting profile update");
      return;
    }

    // delegate to helper
    await handleSaveProfile({
      userId: currentUser.uid,
      newName,
      newPersonalID,
      imageUri,
      showAlert: useAlertStore.getState().showAlert,
      onClose,
      setSaving,
    });
  };

  // initialize the accessibility store
  const accessMode = useAccessibilityStore(
    (state) => state.accessibilityEnabled
  );

  return (
    <DismissKeyboard>
      <View>
        {/* modal settings */}
        <View
          accessible
          accessibilityViewIsModal={true}
          style={{
            width: screenWidth * 0.9, // use 90% of the screen width
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
          {/* header */}

          <View
            accessible
            accessibilityRole="header"
            accessibilityLabel="Profile Settings"
            style={{
              width: 330,
              height: 80,
              borderBottomColor: "lightgrey",
              borderBottomWidth: 0.5,
              backgroundColor: "transparent",
              justifyContent: "flex-end",
              alignItems: "center",
            }}
          >
            <Text
              ref={profileTitleRef}
              style={{
                color: "white",
                fontSize: 32,
                fontFamily: "MPLUSLatin_Bold",
                marginBottom: 11,
              }}
            >
              Profile Settings
            </Text>
          </View>

          <View
            style={{
              width: 330,
              height: 280,
              backgroundColor: "transparent",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            {/* user profile image upload */}

            <ImageBackground>
              <TouchableOpacity
                onPress={pickImage}
                accessibilityRole="button"
                accessibilityLabel="Upload profile image"
                accessibilityHint="Button to upload a profile image"
              >
                <View
                  style={{
                    zIndex: 5,
                    position: "absolute",
                    left: 80,
                    bottom: 80,
                    width: 42,
                    height: 82,
                    backgroundColor: "transparent",
                    justifyContent: "center",
                  }}
                >
                  <Text
                    style={{
                      textAlign: "center",
                      fontSize: 62,
                      fontWeight: "bold",
                      color: "grey",
                    }}
                  >
                    +
                  </Text>
                </View>
                <Image
                  source={
                    imageUri
                      ? { uri: imageUri }
                      : require("../assets/profile_avatar.png")
                  }
                  style={{
                    height: 135,
                    width: 130,
                    borderRadius: 65,
                    marginTop: 5,
                    borderWidth: 2,
                    borderColor: "aqua",
                  }}
                />
              </TouchableOpacity>
            </ImageBackground>
          </View>

          {/* change user name */}
          <View
            style={{ width: 330, height: 300, backgroundColor: "transparent" }}
          >
            <View
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
            >
              <TextInput
                accessible
                accessibilityLabel="Name Input"
                accessibilityHint="Enter your name"
                placeholder="Name"
                placeholderTextColor={accessMode ? "white" : "grey"}
                value={newName}
                onChangeText={(text) => setNewName(sanitizeName(text))}
                style={{
                  width: 280,
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
            </View>
            <View
              style={{
                flexDirection: "row",
                width: 330,
                height: 50,
                padding: 5,
                justifyContent: "center",
                alignItems: "center",
                backgroundColor: "transparent",
              }}
            >
              {/* change user personal-ID */}

              <TextInput
                accessible
                accessibilityLabel="Personal ID Input"
                accessibilityHint="Enter your personal ID"
                placeholder="Personal-ID"
                placeholderTextColor={accessMode ? "white" : "grey"}
                value={newPersonalID}
                onChangeText={(text) =>
                  setNewPersonalID(sanitizePersonalID(text))
                }
                keyboardType="numeric"
                style={{
                  width: 280,
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
            </View>
            <View
              style={{
                marginTop: 15,
                width: 330,
                height: 100,
                borderTopWidth: 0.5,
                borderTopColor: "lightgrey",
                backgroundColor: "transparent",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              {/* update button */}
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={
                  saving ? "Updating profile" : "Save changes"
                }
                accessibilityHint="Saves your updated name and personal ID"
                accessibilityState={{ busy: saving }}
                onPress={handleSave}
                style={{
                  width: screenWidth * 0.7, // use 70% of the screen width
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
                    {saving ? "Updating..." : "Update"}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
            <View
              style={{
                height: 45,
                width: 330,

                justifyContent: "center",
                alignItems: "center",
              }}
            >
              {/* navigation tip */}
              <Text
                accessible
                accessibilityLabel="Navigation tip"
                accessibilityHint="Swipe up or down to close"
                style={{
                  marginTop: accessMode ? 10 : 20,
                  fontSize: accessMode ? 20 : 18,
                  color: accessMode ? "white" : "lightgrey",
                  fontFamily: accessMode
                    ? "MPLUSLatin_Regular"
                    : "MPLUSLatin_ExtraLight",
                }}
              >
                swipe up or down to close
              </Text>
            </View>
          </View>
        </View>
      </View>
    </DismissKeyboard>
  );
};

export default EditProfileModal;

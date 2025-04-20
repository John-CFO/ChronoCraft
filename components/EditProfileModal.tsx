////////////////////////////////////EditProfileModal Component////////////////////////////////////////

// this component is used to edit user profile
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
  Alert,
  Dimensions,
} from "react-native";
import React, { useEffect, useState } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { doc, updateDoc } from "firebase/firestore";
import { User } from "firebase/auth";
import * as ImagePicker from "expo-image-picker";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

import {
  FIREBASE_FIRESTORE,
  FIREBASE_AUTH,
  FIREBASE_APP,
} from "../firebaseConfig";

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
        Alert.alert(
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
      // console.log("Image selected:", result.assets[0].uri);
    } else {
      Alert.alert("You did not select any image.");
    }
  };

  // initialize Firebase Storage
  const storage = getStorage(FIREBASE_APP);

  // uploade user-image to Fiorebase Storage and get the download URL
  const uploadImage = async (uri: string, userId: string) => {
    try {
      // console.log("Fetching the image from the URI:", uri);
      const response = await fetch(uri);
      // console.log("Image fetched, converting to blob...");
      const blob = await response.blob();
      // console.log("Blob created successfully:", blob);
      const storageRef = ref(storage, `profilePictures/${userId}`);
      // console.log("Storage reference created:", storageRef.fullPath);

      // console.log("Uploading the image to Firebase Storage...");
      const uploadResult = await uploadBytes(storageRef, blob);
      // console.log("Image uploaded, getting download URL...");
      const downloadURL = await getDownloadURL(uploadResult.ref);
      // console.log("Image uploaded successfully, download URL:", downloadURL);
      return downloadURL;
    } catch (error) {
      // console.error("Error uploading image:", error);
      throw error; // Propagate the error
    }
  };

  // handleSave function to check user auth and save data from current user in Firestore and then close modal
  const handleSave = async () => {
    const currentUser = FIREBASE_AUTH.currentUser;
    if (!currentUser || !currentUser.uid) {
      // console.log("Invalid user ID provided");
      return;
    }

    let imageUrl: string | undefined = "";
    try {
      if (imageUri) {
        //  console.log("Uploading image with URI:", imageUri);
        imageUrl = await uploadImage(imageUri as string, currentUser.uid);
      }
    } catch (error) {
      // console.error("Error uploading image:", error);
      return; // Stop execution if image upload fails
    }

    try {
      const userRef = doc(FIREBASE_FIRESTORE, "Users", currentUser.uid);
      await updateDoc(userRef, {
        displayName: newName || currentUser.displayName || "",
        personalID: newPersonalID || "",
        photoURL: imageUrl || currentUser.photoURL || "",
      });
      /* console.log("Profile data saved", {
        displayName: newName || currentUser.displayName || "",
        personalID: newPersonalID || "",
        photoURL: imageUrl || currentUser.photoURL || "",
      }); */

      onClose();
    } catch (error) {
      // console.error("Error updating user profile:", error);
    }
  };

  return (
    <View>
      {/* modal settings */}

      <View
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
            <TouchableOpacity onPress={pickImage}>
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
              placeholder="Name"
              placeholderTextColor="grey"
              value={newName}
              onChangeText={setNewName}
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
              placeholder="Personal-ID"
              placeholderTextColor="grey"
              value={newPersonalID}
              onChangeText={setNewPersonalID}
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
              onPress={handleSave}
              style={{
                marginTop: 30,
                width: 280,
                borderRadius: 12,
                overflow: "hidden",
                borderWidth: 3,
                borderColor: "white",
                marginBottom: 20,
              }}
            >
              <LinearGradient
                colors={["#00FFFF", "#FFFFFF"]}
                style={{
                  alignItems: "center",
                  justifyContent: "center",
                  height: 45,
                  width: 280,
                }}
              >
                <Text
                  style={{
                    color: "grey",
                    fontSize: 22,
                    fontFamily: "MPLUSLatin_Bold",
                    marginBottom: 11,
                    marginRight: 9,
                  }}
                >
                  Update
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
              style={{
                marginTop: 20,
                fontSize: 18,
                color: "lightgrey",
                fontFamily: "MPLUSLatin_ExtraLight",
              }}
            >
              swipe up or down to close
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

export default EditProfileModal;

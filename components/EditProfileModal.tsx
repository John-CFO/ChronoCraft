import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  ImageBackground,
  Image,
  KeyboardAvoidingView,
  Keyboard,
} from "react-native";
import React, { useEffect, useState } from "react";

import { LinearGradient } from "expo-linear-gradient";
//import { firebase } from "@react-native-firebase/firestore";
import { doc, updateDoc } from "firebase/firestore";

import { FIREBASE_FIRESTORE, FIREBASE_AUTH } from "../firebaseConfig";

/////////////////////////////////////////////////////////////////////////

interface EditProfileModalProps {
  userId: string;
  onClose: () => void;
  visible: boolean;
  navigation: any;
}

/////////////////////////////////////////////////////////////////////////

export const updateUserProfile = async (
  userId: string,
  newName: string,
  newPersonalID: string
) => {
  const userRef = doc(FIREBASE_FIRESTORE, "Users", userId);
  console.log("User document reference path:", userRef.path);

  try {
    await updateDoc(userRef, {
      displayName: newName,
      personalID: newPersonalID,
    });
    console.log("User profile updated successfully");
  } catch (error) {
    console.error("Error updating user profile:", error);
  }
};

const EditProfileModal: React.FC<EditProfileModalProps> = ({
  userId,
  onClose,
}) => {
  const [newName, setNewName] = useState("");
  const [newPersonalID, setNewPersonalID] = useState("");

  const handleSave = async () => {
    if (!userId) {
      console.log("Invalid user ID provided");
      return;
    }

    console.log("Trying to save user-dates...");
    console.log("Users:", newName, newPersonalID);
    const userRef = doc(FIREBASE_FIRESTORE, "Users", userId);
    console.log("User document reference path:", userRef.path);

    await updateUserProfile(userId, newName, newPersonalID);
    console.log("data saved");
    onClose();
  };

  return (
    <View>
      {/*modal settings */}

      <View
        style={{
          width: "90%",
          height: "auto",
          backgroundColor: "black",
          padding: 20,
          borderRadius: 15,
          borderWidth: 2,
          borderColor: "lightgrey",
        }}
      >
        {/* header*/}

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
              marginRight: 9,
            }}
          >
            Profile Settings
          </Text>
        </View>

        <View
          style={{
            width: 330,
            height: 220,
            backgroundColor: "transparent",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          {/*user profile image upload */}

          <ImageBackground>
            <TouchableOpacity>
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
                source={require("../assets/profile_avatar.png")}
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

        {/* change user name*/}

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
          <View
            style={{
              margin: 5,
              backgroundColor: "lightgrey",
              width: 280,
              height: 50,
              borderWidth: 2,
              borderColor: "white",
              borderRadius: 12,
            }}
          >
            <TextInput
              placeholder="Name"
              placeholderTextColor="grey"
              value={newName}
              onChangeText={setNewName}
              style={{
                width: 250,
                height: 40,
                paddingLeft: 10,
                fontSize: 22,
              }}
            />
          </View>
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
          {/* change user personal-ID*/}

          <View
            style={{
              backgroundColor: "lightgrey",
              width: 280,
              height: 50,
              borderWidth: 2,
              borderColor: "white",
              borderRadius: 12,
            }}
          >
            <TextInput
              placeholder="Personal-ID"
              placeholderTextColor="grey"
              value={newPersonalID}
              onChangeText={setNewPersonalID}
              keyboardType="numeric"
              style={{
                width: 250,
                height: 40,
                paddingLeft: 10,
                fontSize: 22,
              }}
            />
          </View>
        </View>
        <View
          style={{
            marginTop: 15,
            width: 330,
            height: 80,
            borderTopWidth: 0.5,
            paddingTop: 35,
            borderTopColor: "lightgrey",
            backgroundColor: "transparent",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          {/* update button*/}
          <TouchableOpacity
            onPress={handleSave}
            style={{
              height: 45,
              width: 120,
              borderRadius: 12,
              borderWidth: 3,
              borderColor: "white",
              overflow: "hidden",
            }}
          >
            <LinearGradient
              colors={["#00FFFF", "#FFFFFF"]}
              style={{
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 8,
                height: 45,
                width: 120,
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
          <View
            style={{
              height: 45,
              width: 330,

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
              swipe up or down to close
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

export default EditProfileModal;
/*function updateUserDisplayName(userId: string, newName: string) {
  throw new Error("Function not implemented.");
}*/

///////////////////////////////////FAQBottomSheet Component////////////////////////////////////////

// This file is used to create the FAQ bottom sheet modal
// It includes the FAQ sections and the delete account section
// It also includes the functions to open and close the FAQ bottom sheet modal
// And also the aswer to change the user´s password

///////////////////////////////////////////////////////////////////////////////////////////////////
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Dimensions,
} from "react-native";
import Collapsible from "react-native-collapsible";
import { LinearGradient } from "expo-linear-gradient";
import { collection, getDocs, doc, deleteDoc } from "firebase/firestore";
import { deleteObject, ref, getStorage } from "firebase/storage";
import { EmailAuthProvider } from "firebase/auth";
import { reauthenticateWithCredential } from "firebase/auth";
import { FontAwesome5 } from "@expo/vector-icons";
import { ScrollView } from "react-native-gesture-handler";

import { FIREBASE_FIRESTORE, FIREBASE_AUTH } from "../firebaseConfig";
import { useAlertStore } from "./services/customAlert/alertStore";

/////////////////////////////////////////////////////////////////////////////////////////////////////

interface FAQBottomSheetProps {
  navigation: any;
  closeModal: () => void | undefined;
}

//////////////////////////////////////////////////////////////////////////////////////////////////////

const FAQBottomSheet = ({ navigation, closeModal }: FAQBottomSheetProps) => {
  // FAQ section states
  const [expandedSections, setExpandedSections] = useState<{
    [key: string]: boolean;
  }>({
    faq1: false,
    faq2: false,
    faq3: false,
  });

  // screensize for dynamic size calculation
  const screenWidth = Dimensions.get("window").width;

  // state for the password visibility
  const [passwordVisibility, setPasswordVisibility] = useState(true);

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
    try {
      // console.log("FAQ bottom sheet closed.");
      closeModal();
    } catch (error) {
      console.error("Error closing FAQ bottom sheet:", error);
      throw error;
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

  // recursive function to delete subcollections
  const deleteSubcollections = async (
    parentPath: string,
    subcollections: string[]
  ) => {
    for (const sub of subcollections) {
      const subCollectionRef = collection(
        FIREBASE_FIRESTORE,
        `${parentPath}/${sub}`
      );
      const subDocsSnapshot = await getDocs(subCollectionRef);

      for (const subDoc of subDocsSnapshot.docs) {
        const subDocPath = `${parentPath}/${sub}/${subDoc.id}`;

        // for deeper nested subcollections
        if (sub === "Projects") {
          await deleteSubcollections(subDocPath, ["Notes"]);
        }

        await deleteDoc(subDoc.ref);
      }
    }
  };

  // function to delete the account
  const handleDeleteAccount = async () => {
    if (!password?.trim()) {
      // show an alert if no password is entered
      useAlertStore.getState().hideAlert();
      setTimeout(() => {
        useAlertStore
          .getState()
          .showAlert(
            "No Password",
            "Please enter your password before deleting your account."
          );
      }, 300);
      return;
    }

    setLoading(true);
    // timeout to make the dot animation inside the button visible
    await new Promise((resolve) => setTimeout(resolve, 5000));

    try {
      if (!userUid) throw new Error("No user is signed in.");

      await reauthenticateUser(password);
      await deleteImageFromStorage(`profilePictures/${userUid}`);

      // get all services
      const servicesColRef = collection(
        FIREBASE_FIRESTORE,
        `Users/${userUid}/Services`
      );
      const servicesSnapshot = await getDocs(servicesColRef);

      for (const serviceDoc of servicesSnapshot.docs) {
        const servicePath = `Users/${userUid}/Services/${serviceDoc.id}`;

        // delete all subcollections inside a service document
        await deleteSubcollections(servicePath, [
          "Projects",
          "Vacations",
          "WorkHours",
        ]);

        // delete the service document
        await deleteDoc(serviceDoc.ref);
      }

      // delete the user document
      await deleteDoc(doc(FIREBASE_FIRESTORE, "Users", userUid));

      closeFAQSheet();

      useAlertStore
        .getState()
        .showAlert(
          "Success",
          "Your account has been deleted. All your data has been removed.",
          [{ text: "OK", onPress: () => useAlertStore.getState().hideAlert() }]
        );

      // delete the current user
      await FIREBASE_AUTH.currentUser?.delete();
    } catch (error: any) {
      // console.error("Error deleting account:", error);
      useAlertStore
        .getState()
        .showAlert(
          "Error",
          "There was an issue deleting your account. Please try again.",
          [{ text: "OK", onPress: () => useAlertStore.getState().hideAlert() }]
        );
    } finally {
      setLoading(false);
    }
  };

  // function to handle password visibility
  const deleteAccountVisibility = () => {
    setPasswordVisibility(!passwordVisibility);
  };

  // dot animation for TextInput
  const [dots, setDots] = useState(".");

  useEffect(() => {
    // initial count
    let count = 0;

    // setInterval condition
    const interval = setInterval(() => {
      if (count === 0) {
        setDots(".");
      } else if (count === 1) {
        setDots("..");
      } else if (count === 2) {
        setDots("...");
      } else {
        setDots("");
        count = -1; // restart the animation
      }

      count += 1;
    }, 700); // handle animation time

    // clear the interval
    return () => clearInterval(interval);
  }, []);

  return (
    <View
      style={{
        flex: 1,
        width: "100%",
      }}
    >
      {/* FAQ Header */}
      <View
        style={{
          position: "relative",
          height: 50,
          justifyContent: "center",
          borderBottomWidth: 1,
          borderBottomColor: "rgba(255, 255, 255, 0.1)",
        }}
      >
        <Text
          style={{
            color: "gray",
            fontSize: 20,
            fontFamily: "MPLUSLatin_Bold",
            textAlign: "center",
          }}
        >
          Frequently Asked Questions
        </Text>
        {/* Close Button */}
        <TouchableOpacity
          onPress={closeFAQSheet}
          style={{
            position: "absolute",
            top: 0,
            right: 12,
            width: 32,
            height: 32,
            borderRadius: 16,
            borderColor: "white",
            borderWidth: 1,
            backgroundColor: "rgba(0, 0, 0, 0.3)",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 999,
          }}
        >
          <LinearGradient
            colors={["#00FFFF", "#FFFFFF"]}
            style={{
              alignItems: "center",
              justifyContent: "center",
              height: 30,
              width: 30,
              borderRadius: 16,
            }}
          >
            <Text
              style={{
                color: "gray",
                fontSize: 30,
                lineHeight: 32,
                fontWeight: "bold",
              }}
            >
              ×
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }}>
        <View
          style={{
            padding: 20,
            backgroundColor: "#191919",
            borderRadius: 10,
            position: "relative",
            minHeight: 400,
          }}
        >
          {/* FAQ Content */}
          <View style={{ marginTop: 24 }}>
            {/* FAQ 1: How to close workhourschart tooltip */}
            <TouchableOpacity
              onPress={() => toggleSection("faq1")}
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                paddingVertical: 12,
                borderBottomWidth: 1,
                borderBottomColor: "rgba(255, 255, 255, 0.1)",
              }}
            >
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "600",
                  color: expandedSections.faq1 ? "aqua" : "white",
                  flex: 1,
                  marginRight: 16,
                }}
              >
                How to close the tooltip on the Workhours Chart?
              </Text>
              <Text style={{ color: "aqua", fontSize: 20 }}>
                {expandedSections.faq1 ? "−" : "+"}
              </Text>
            </TouchableOpacity>
            <Collapsible collapsed={!expandedSections.faq1}>
              <Text
                style={{
                  paddingTop: 12,
                  fontSize: 14,
                  color: "#CCCCCC",
                  lineHeight: 20,
                }}
              >
                To close the tooltip, simply tap anywhere outside the chart area
                but inside the card. The entire card is set up to listen for
                taps outside of the chart.
              </Text>
            </Collapsible>
            {/* FAQ 1: How to change your password */}
            <TouchableOpacity
              onPress={() => toggleSection("faq2")}
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                paddingVertical: 12,
                borderBottomWidth: 1,
                borderBottomColor: "rgba(255, 255, 255, 0.1)",
              }}
            >
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "600",
                  color: expandedSections.faq2 ? "aqua" : "white",
                  flex: 1,
                  marginRight: 16,
                }}
              >
                How to change my password?
              </Text>
              <Text style={{ color: "aqua", fontSize: 20 }}>
                {expandedSections.faq2 ? "−" : "+"}
              </Text>
            </TouchableOpacity>
            <Collapsible collapsed={!expandedSections.faq2}>
              <Text
                style={{
                  paddingTop: 12,
                  fontSize: 14,
                  color: "#CCCCCC",
                  lineHeight: 20,
                }}
              >
                Leaf the app with Logout and you will navigate to the login
                screen. There you can change your password with press on forgot
                password. Whe will send you an email with instructions on how to
                reset your password.
              </Text>
            </Collapsible>

            {/* FAQ 3: How to delete your account */}
            <TouchableOpacity
              onPress={() => toggleSection("faq3")}
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                paddingVertical: 12,
                borderBottomWidth: 1,
                borderBottomColor: "rgba(255, 255, 255, 0.1)",
              }}
            >
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "600",
                  color: expandedSections.faq3 ? "aqua" : "white",
                  flex: 1,
                  marginRight: 16,
                }}
              >
                How to delete my account?
              </Text>
              <Text style={{ color: "aqua", fontSize: 20 }}>
                {expandedSections.faq3 ? "−" : "+"}
              </Text>
            </TouchableOpacity>
            <Collapsible collapsed={!expandedSections.faq3}>
              <Text
                style={{
                  paddingTop: 12,
                  fontSize: 14,
                  color: "#CCCCCC",
                  lineHeight: 20,
                }}
              >
                To delete your account, you must confirm your password. All data
                will be permanently removed from our servers.
              </Text>
              <View style={{ alignItems: "center", justifyContent: "center" }}>
                <View
                  style={{
                    width: screenWidth * 0.7, // use 70% of the screen width
                    maxWidth: 400,
                  }}
                >
                  <TextInput
                    placeholder="Enter your password"
                    placeholderTextColor="#888"
                    secureTextEntry={passwordVisibility}
                    value={password}
                    onChangeText={setPassword}
                    style={{
                      width: screenWidth * 0.7, // use 70% of the screen width
                      maxWidth: 400,
                      marginVertical: 10,
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
                  {/* Visibility eye button */}
                  <TouchableOpacity
                    onPress={deleteAccountVisibility}
                    style={{ position: "absolute", right: 15, top: 25 }}
                  >
                    <FontAwesome5
                      name={passwordVisibility ? "eye" : "eye-slash"}
                      size={20}
                      color="darkgrey"
                    />
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  onPress={() =>
                    useAlertStore
                      .getState()
                      .showAlert(
                        "Delete Account",
                        "Are you sure you want to delete your account?",
                        [
                          { text: "Cancel", style: "cancel" },
                          {
                            text: "Delete",
                            style: "destructive",
                            onPress: handleDeleteAccount, // placed here to garantee first the animation
                          },
                        ]
                      )
                  }
                  style={{
                    width: screenWidth * 0.7, // use 70% of the screen width
                    maxWidth: 400,
                    borderRadius: 12,
                    overflow: "hidden",
                    borderWidth: 3,
                    borderColor: "white",
                    marginBottom: 25,
                  }}
                >
                  <LinearGradient
                    colors={["#00FFFF", "#FFFFFF"]}
                    style={{
                      alignItems: "center",
                      justifyContent: "center",
                      height: 45,
                      // width: screenWidth * 0.7, // use 70% of the screen width
                      maxWidth: 600,
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
                      {loading ? (
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Text
                            style={{
                              marginLeft: 100,
                              marginBottom: 5,
                              fontFamily: "MPLUSLatin_Bold",
                              fontSize: 22,
                              color: "grey",
                              textAlign: "center",
                              width: 100,
                            }}
                          >
                            Deleting
                          </Text>
                          <Text
                            style={{
                              marginBottom: 5,
                              fontFamily: "MPLUSLatin_Bold",
                              fontSize: 22,
                              color: "grey",
                              width: 100,
                              textAlign: "left",
                            }}
                          >
                            {dots}
                          </Text>
                        </View>
                      ) : (
                        <Text
                          style={{
                            marginBottom: 5,
                            fontFamily: "MPLUSLatin_Bold",
                            fontSize: 22,
                            color: "grey",
                            textAlign: "center",
                          }}
                        >
                          Delete Account
                        </Text>
                      )}
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </Collapsible>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

export default FAQBottomSheet;

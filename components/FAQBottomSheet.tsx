///////////////////////////////////FAQBottomSheet Component////////////////////////////////////////

// This file is used to create the FAQ bottom sheet modal
// It includes the FAQ sections and the delete account section
// It also includes the functions to open and close the FAQ bottom sheet modal
// And also the aswer to change the user´s password

///////////////////////////////////////////////////////////////////////////////////////////////////

import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Dimensions,
  AccessibilityInfo,
} from "react-native";
import Collapsible from "react-native-collapsible";
import { LinearGradient } from "expo-linear-gradient";
import {
  collection,
  getDocs,
  doc,
  deleteDoc,
  writeBatch,
  query,
  limit,
  CollectionReference,
  DocumentData,
} from "firebase/firestore";
import { deleteObject, getStorage, ref as storageRef } from "firebase/storage";
import { EmailAuthProvider, deleteUser } from "firebase/auth";
import { reauthenticateWithCredential } from "firebase/auth";
import { FontAwesome5 } from "@expo/vector-icons";
import { ScrollView } from "react-native-gesture-handler";

import { FIREBASE_FIRESTORE, FIREBASE_AUTH } from "../firebaseConfig";
import { useAlertStore } from "./services/customAlert/alertStore";
import { useDotAnimation } from "../components/DotAnimation";
import { useAccessibilityStore } from "../components/services/accessibility/accessibilityStore";

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

  // initialize the accessibility store
  const accessMode = useAccessibilityStore(
    (state) => state.accessibilityEnabled
  );

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

  // function to batch delete a collection
  const deleteCollectionBatched = async (
    colRef: CollectionReference<DocumentData>,
    batchSize = 100
  ): Promise<number> => {
    let totalDeleted = 0;
    try {
      while (true) {
        const q = query(colRef, limit(batchSize));
        const snapshot = await getDocs(q);

        if (snapshot.empty) break;

        const batch = writeBatch(colRef.firestore);
        snapshot.docs.forEach((doc) => batch.delete(doc.ref));
        await batch.commit();

        totalDeleted += snapshot.size;

        if (snapshot.size < batchSize) break;
      }
      return totalDeleted;
    } catch (e) {
      console.error(
        "deleteCollectionBatched error for",
        colRef.path ?? colRef,
        e
      );
      throw e;
    }
  };

  // recursive function to delete subcollections
  const deleteSubcollections = async (
    parentPathSegments: string[],
    subs: string[]
  ) => {
    // parentPathSegments example: ["Users", user.uid, "Services", serviceId"]
    for (const sub of subs) {
      const path = [...parentPathSegments, sub].join("/");
      const colRef = collection(FIREBASE_FIRESTORE, path);

      let deleted;
      do {
        deleted = await deleteCollectionBatched(colRef);
      } while (deleted > 0);

      if (sub === "Projects") {
        // iterate projects to delete nested Notes
        const projSnap = await getDocs(collection(FIREBASE_FIRESTORE, path));
        for (const p of projSnap.docs) {
          const notesPath = `${path}/${p.id}/Notes`;
          const notesRef = collection(FIREBASE_FIRESTORE, notesPath);
          let nd;
          do {
            nd = await deleteCollectionBatched(notesRef);
          } while (nd > 0);
        }
      }
    }
  };

  // ref for alert timeout
  const alertTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // hook to clean up the timeout
  useEffect(() => {
    return () => {
      if (alertTimeoutRef.current) {
        clearTimeout(alertTimeoutRef.current);
      }
    };
  }, []);

  // ref for animation timeout
  const animationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // hook to clean up the timeout
  useEffect(() => {
    return () => {
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
    };
  }, []);

  // function to delete account
  const handleDeleteAccount = async () => {
    if (!password?.trim()) {
      useAlertStore
        .getState()
        .showAlert(
          "No Password",
          "Please enter your password before deleting your account."
        );
      return;
    }
    setLoading(true);
    try {
      const user = FIREBASE_AUTH.currentUser;
      if (!user) throw new Error("No user signed in");
      const credential = EmailAuthProvider.credential(user.email!, password);
      await reauthenticateWithCredential(user, credential);
      // delete profile image (if storage enabled)
      if (process.env.FIREBASE_STORAGE_ENABLED !== "false") {
        try {
          const st = getStorage();
          const imgRef = storageRef(st, `profilePictures/${user.uid}`);
          await deleteObject(imgRef).catch((e) => {
            // non-fatal: ignore "not-found", but log others
            if (e?.code === "storage/object-not-found") {
            } else {
              console.warn(
                "[handleDeleteAccount] error deleting profile image:",
                e
              );
            }
          });
        } catch (e) {
          console.warn(
            "[handleDeleteAccount] storage delete error (ignored):",
            e
          );
        }
      }

      // fetch services
      const servicesColRef = collection(
        FIREBASE_FIRESTORE,
        `Users/${user.uid}/Services`
      );
      const servicesSnap = await getDocs(servicesColRef);

      // iterate services and delete nested data
      for (const serviceDoc of servicesSnap.docs) {
        const servicePath = `Users/${user.uid}/Services/${serviceDoc.id}`;
        try {
          await deleteSubcollections(
            ["Users", user.uid, "Services", serviceDoc.id],
            ["Projects", "Vacations", "WorkHours"]
          );
        } catch (e) {
          console.error(
            "[handleDeleteAccount] error deleting subcollections for",
            servicePath,
            e
          );
          throw e; // break and surface to outer catch so we get permission error info
        }
        // delete service doc itself
        try {
          await deleteDoc(serviceDoc.ref);
        } catch (e) {
          console.error(
            "[handleDeleteAccount] failed to delete service doc:",
            serviceDoc.ref.path,
            e
          );
          throw e;
        }
      }
      // delete user doc
      try {
        await deleteDoc(doc(FIREBASE_FIRESTORE, "Users", user.uid));
      } catch (e) {
        console.error("[handleDeleteAccount] failed to delete user doc:", e);
        throw e;
      }

      // finally delete auth user
      try {
        await deleteUser(user);
      } catch (e) {
        console.error("[handleDeleteAccount] failed to delete auth user:", e);
        throw e;
      }

      useAlertStore
        .getState()
        .showAlert("Success", "Your account has been deleted.");
      closeFAQSheet();
    } catch (error: any) {
      console.error("Error deleting account:", error);
      console.error("Error code:", error?.code);
      console.error("Error message:", error?.message);
      useAlertStore
        .getState()
        .showAlert(
          "Error",
          `There was an issue deleting your account. ${error?.code ?? ""} ${error?.message ?? ""}`,
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

  // define the dot animation with a delay
  const dots = useDotAnimation(loading, 700);

  return (
    <View
      accessibilityViewIsModal
      accessible={true}
      accessibilityLabel="Frequently Asked Questions sheet"
      accessibilityHint="Contains frequently asked questions."
      style={{
        flex: 1,
        width: "100%",
      }}
    >
      {/* FAQ Header */}
      <View
        accessible={false}
        style={{
          position: "relative",
          height: 50,
          justifyContent: "center",
          borderBottomWidth: 1,
          borderBottomColor: "rgba(255, 255, 255, 0.1)",
        }}
      >
        <Text
          accessibilityRole="header"
          accessibilityLabel="Frequently Asked Questions"
          style={{
            color: accessMode ? "white" : "gray",
            fontSize: accessMode ? 22 : 20,
            fontFamily: "MPLUSLatin_Bold",
            textAlign: "center",
          }}
        >
          Frequently Asked Questions
        </Text>
        {/* Close Button */}
        <TouchableOpacity
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Close FAQ"
          accessibilityHint="Closes the frequently asked questions"
          onPress={closeFAQSheet}
          style={{
            position: "absolute",
            top: 0,
            right: 12,
            width: 32,
            height: 32,
            borderRadius: 16,
            borderColor: "aqua",
            borderWidth: 1,
            backgroundColor: "rgba(0, 0, 0, 0.3)",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 999,
          }}
        >
          <LinearGradient
            colors={["#00f7f7", "#005757"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              alignItems: "center",
              justifyContent: "center",
              height: 30,
              width: 30,
              borderRadius: 16,
            }}
          >
            <Text
              accessible={false}
              style={{
                color: "lightgrey",
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
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={`How to close the tooltip on the Workhours Chart? ${expandedSections.faq1 ? "Expanded" : "Collapsed"}`}
              accessibilityHint="Toggles the answer for how to close the tooltip"
              accessibilityState={{ expanded: !!expandedSections.faq1 }}
              onPress={() => {
                // announce planned new state (compute new state before toggle to have correct announcement)
                const willBeExpanded = !expandedSections.faq1;
                toggleSection("faq1");
                AccessibilityInfo.isScreenReaderEnabled().then((enabled) => {
                  if (enabled)
                    AccessibilityInfo.announceForAccessibility(
                      willBeExpanded ? "Answer opened" : "Answer closed"
                    );
                });
              }}
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
                accessible={false}
                style={{
                  fontSize: accessMode ? 18 : 16,
                  fontWeight: "600",
                  color: expandedSections.faq1 ? "aqua" : "white",
                  flex: 1,
                  marginRight: 16,
                }}
              >
                How to close the tooltip on the Workhours Chart?
              </Text>
              <Text style={{ color: "aqua", fontSize: accessMode ? 28 : 20 }}>
                {expandedSections.faq1 ? "−" : "+"}
              </Text>
            </TouchableOpacity>
            <Collapsible collapsed={!expandedSections.faq1}>
              <Text
                accessible={true}
                accessibilityLiveRegion="polite"
                accessibilityLabel="To close the tooltip, simply tap anywhere outside the chart area but inside the card. The entire card is set up to listen for taps outside of the chart."
                style={{
                  paddingTop: 12,
                  fontSize: accessMode ? 18 : 14,
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
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={`How to change my password? ${expandedSections.faq2 ? "Expanded" : "Collapsed"}`}
              accessibilityHint="Toggles instructions to change your password"
              accessibilityState={{ expanded: !!expandedSections.faq2 }}
              onPress={() => {
                const willBeExpanded = !expandedSections.faq2;
                toggleSection("faq2");
                AccessibilityInfo.isScreenReaderEnabled().then((enabled) => {
                  if (enabled)
                    AccessibilityInfo.announceForAccessibility(
                      willBeExpanded ? "Answer opened" : "Answer closed"
                    );
                });
              }}
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
                accessible={false}
                style={{
                  fontSize: accessMode ? 18 : 16,
                  fontWeight: "600",
                  color: expandedSections.faq2 ? "aqua" : "white",
                  flex: 1,
                  marginRight: 16,
                }}
              >
                How to change my password?
              </Text>
              <Text
                accessible={false}
                style={{ color: "aqua", fontSize: accessMode ? 28 : 20 }}
              >
                {expandedSections.faq2 ? "−" : "+"}
              </Text>
            </TouchableOpacity>
            <Collapsible collapsed={!expandedSections.faq2}>
              <Text
                accessible={true}
                accessibilityLiveRegion="polite"
                accessibilityLabel="Leave the app with Logout and you will navigate to the login screen. There you can change your password by pressing forgot password. We will send you an email with instructions on how to reset your password."
                style={{
                  paddingTop: 12,
                  fontSize: accessMode ? 18 : 14,
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
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={`How to delete my account? ${expandedSections.faq3 ? "Expanded" : "Collapsed"}`}
              accessibilityHint="Toggles instructions to delete your account"
              accessibilityState={{ expanded: !!expandedSections.faq3 }}
              onPress={() => {
                const willBeExpanded = !expandedSections.faq3;
                toggleSection("faq3");
                AccessibilityInfo.isScreenReaderEnabled().then((enabled) => {
                  if (enabled)
                    AccessibilityInfo.announceForAccessibility(
                      willBeExpanded ? "Answer opened" : "Answer closed"
                    );
                });
              }}
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
                accessible={false}
                style={{
                  fontSize: accessMode ? 18 : 16,
                  fontWeight: "600",
                  color: expandedSections.faq3 ? "aqua" : "white",
                  flex: 1,
                  marginRight: 16,
                }}
              >
                How to delete my account?
              </Text>
              <Text
                accessible={false}
                style={{ color: "aqua", fontSize: accessMode ? 28 : 20 }}
              >
                {expandedSections.faq3 ? "−" : "+"}
              </Text>
            </TouchableOpacity>
            <Collapsible collapsed={!expandedSections.faq3}>
              <Text
                accessible={true}
                accessibilityLiveRegion="polite"
                accessibilityLabel="To delete your account, you must confirm your password. All data will be permanently removed."
                style={{
                  paddingTop: 12,
                  fontSize: accessMode ? 18 : 14,
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
                    accessible={true}
                    accessibilityLabel="Enter your password to confirm account deletion"
                    placeholder="Enter your password"
                    placeholderTextColor={accessMode ? "white" : "#888"}
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
                    accessible={true}
                    accessibilityRole="button"
                    accessibilityLabel={
                      passwordVisibility ? "Show password" : "Hide password"
                    }
                    accessibilityHint="Toggles password visibility"
                    onPress={deleteAccountVisibility}
                    style={{ position: "absolute", right: 15, top: 25 }}
                  >
                    <FontAwesome5
                      name={passwordVisibility ? "eye" : "eye-slash"}
                      size={20}
                      color={accessMode ? "white" : "darkgrey"}
                    />
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel="Delete Account"
                  accessibilityHint="Deletes your account permanently after confirmation"
                  accessibilityState={{ busy: loading }}
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
                    borderWidth: 2,
                    borderColor: "aqua",
                    marginBottom: 25,
                  }}
                >
                  <LinearGradient
                    colors={["#00f7f7", "#005757"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
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
                              color: "white",
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
                              color: "white",
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
                            color: "white",
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

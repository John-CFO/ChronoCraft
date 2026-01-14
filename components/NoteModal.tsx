//////////////////////////////////// Note Modal Component //////////////////////////////

// this component creates a modal to add a note to a project

////////////////////////////////////////////////////////////////////////////////////////

import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Dimensions,
  findNodeHandle,
  AccessibilityInfo,
} from "react-native";
import React, { useState, useEffect, useRef } from "react";
import { LinearGradient } from "expo-linear-gradient";
import {
  doc,
  getDoc,
  addDoc,
  serverTimestamp,
  collection,
} from "firebase/firestore";

import { FIREBASE_FIRESTORE, FIREBASE_AUTH } from "../firebaseConfig";
import { useAlertStore } from "./services/customAlert/alertStore";
import { useDotAnimation } from "../components/DotAnimation";
import { sanitizeComment } from "./InputSanitizers";
import { useAccessibilityStore } from "../components/services/accessibility/accessibilityStore";
import { NoteInputSchema } from "../validation/noteSchemas";

//////////////////////////////////////////////////////////////////////////////////////////

interface NoteModalProps {
  projectId: string;
  onClose: () => void;
  loading: boolean;
}

/////////////////////////////////////////////////////////////////////////////////////////

const NoteModal: React.FC<NoteModalProps> = ({
  projectId,
  onClose,
}: NoteModalProps) => {
  const [comment, setComment] = useState("");

  // hook to announce accessibility
  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(
      "Note Modal opened. Please write your comment and press send."
    );
  }, []);

  // ref to navigate to notes header
  const noteTitleRef = useRef(null);
  // hook to focus the notes header by accessibility
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (noteTitleRef.current) {
        const node = findNodeHandle(noteTitleRef.current);
        if (node) AccessibilityInfo.setAccessibilityFocus(node);
      }
    }, 300); // delay in milliseconds

    return () => clearTimeout(timeout);
  }, []);

  // screensize for dynamic size calculation
  const screenWidth = Dimensions.get("window").width;

  // state to handle the dot animation
  const [loading, setLoading] = useState(true);

  // define the dot animation with a delay
  const dots = useDotAnimation(loading, 700);

  // function to handle comment submission
  const [saving, setSaving] = useState(false);

  // function to handle comment submission
  const handleSubmitComment = async (
    projectId: string,
    comment: string,
    userId: string,
    serviceId: string
  ) => {
    // Initial client-side validation
    if (!comment.trim()) {
      useAlertStore
        .getState()
        .showAlert(
          "Sorry",
          "Please write a comment first before pressing send."
        );
      return;
    }

    setSaving(true);
    try {
      // sanatize the comment
      const sanitizedComment = sanitizeComment(comment.trim());

      // validate the input with Zod
      const inputValidation = NoteInputSchema.safeParse({
        comment: sanitizedComment, // use sanatized comment
        projectId,
        userId,
      });

      if (!inputValidation.success) {
        console.error("Invalid note input:", inputValidation.error);
        useAlertStore
          .getState()
          .showAlert("Error", "Invalid note data provided");
        return;
      }

      // validate the service ID
      const VALID_SERVICE_IDS = ["AczkjyWoOxdPAIRVxjy3"];
      if (!VALID_SERVICE_IDS.includes(serviceId)) {
        console.error("Invalid service ID:", serviceId);
        useAlertStore
          .getState()
          .showAlert("Error", "Invalid service configuration");
        return;
      }

      // authentication and authorization
      const user = FIREBASE_AUTH.currentUser;
      if (!user || user.uid !== userId) {
        console.error("Authentication or authorization failed");
        useAlertStore.getState().showAlert("Error", "Not authorized");
        return;
      }

      // check if project exists
      const projectRef = doc(
        FIREBASE_FIRESTORE,
        `Users/${userId}/Services/${serviceId}/Projects/${projectId}`
      );

      const projectSnapshot = await getDoc(projectRef);
      if (!projectSnapshot.exists()) {
        console.error("Project does not exist:", projectId);
        useAlertStore.getState().showAlert("Error", "Project not found");
        return;
      }

      // write firestore
      const projectNotesRef = collection(
        FIREBASE_FIRESTORE,
        `Users/${userId}/Services/${serviceId}/Projects/${projectId}/Notes`
      );

      await addDoc(projectNotesRef, {
        uid: user.uid,
        comment: sanitizedComment, // use sanatized comment
        createdAt: serverTimestamp(),
      });

      // console.log("Comment saved successfully");
      setComment("");
      onClose();
    } catch (error) {
      console.error("Saving comment failed");
      useAlertStore.getState().showAlert("Error", "Failed to save note");
    } finally {
      setSaving(false);
    }
  };

  // function to handle comment change
  const handleCommentChange = (text: string) => {
    setComment(text);
  };

  // initialize the accessibility store
  const accessMode = useAccessibilityStore(
    (state) => state.accessibilityEnabled
  );

  return (
    <View>
      {/*modal settings */}
      <View
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
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        {/* header*/}
        <View
          accessible
          accessibilityRole="header"
          accessibilityLabel="Project Notes"
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
            ref={noteTitleRef}
            style={{
              color: "white",
              fontSize: 32,
              fontFamily: "MPLUSLatin_Bold",
              marginBottom: 11,
              marginRight: 9,
            }}
          >
            Project Notes
          </Text>
        </View>
        {/*note text*/}
        <View
          style={{
            marginTop: 50,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <TextInput
            style={{
              borderWidth: 1,
              borderColor: "aqua",
              borderRadius: 5,
              padding: 10,
              marginBottom: 20,
              width: screenWidth * 0.7, // use 70% of the screen width
              maxWidth: 420,
              minHeight: 100,
              minWidth: 330,
              color: "white",
              fontSize: accessMode ? 20 : 18,
              backgroundColor: "#191919",
            }}
            accessible
            accessibilityLabel="Project comment input field"
            accessibilityHint="Write a comment to add a note to the project"
            placeholder={`Write a comment${dots}`}
            placeholderTextColor={accessMode ? "white" : "grey"}
            multiline={true}
            value={comment}
            onChangeText={(text) => handleCommentChange(sanitizeComment(text))}
          />

          {/*submit button*/}

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={saving ? "Updating profile" : "Save note"}
            accessibilityHint="Saves the note to the project"
            accessibilityState={{ busy: saving }}
            onPress={() =>
              handleSubmitComment(
                projectId,
                comment,
                FIREBASE_AUTH.currentUser?.uid as string,
                "AczkjyWoOxdPAIRVxjy3"
              )
            }
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
                {saving ? "Saving..." : "Save"}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
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
            accessible
            accessibilityLabel="Navigation tip"
            accessibilityHint="Swipe up or down to close"
            style={{
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
  );
};

export default NoteModal;

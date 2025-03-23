//////////////////////////////////// Note Modal Component //////////////////////////////

import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  Dimensions,
} from "react-native";
import React, { useState, useEffect } from "react";
import { LinearGradient } from "expo-linear-gradient";
import {
  doc,
  getDoc,
  addDoc,
  serverTimestamp,
  collection,
} from "firebase/firestore";

import { FIREBASE_FIRESTORE, FIREBASE_AUTH } from "../firebaseConfig";

//////////////////////////////////////////////////////////////////////////////////////////

interface NoteModalProps {
  projectId: string;
  onClose: () => void;
}

/////////////////////////////////////////////////////////////////////////////////////////

const NoteModal: React.FC<NoteModalProps> = ({
  projectId,
  onClose,
}: {
  projectId: string;
  onClose: () => void;
}) => {
  const [comment, setComment] = useState("");

  // screensize for dynamic size calculation
  const screenWidth = Dimensions.get("window").width;

  // dot animation
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

  // function to handle comment submission
  const handleSubmitComment = async (
    projectId: string,
    comment: string,
    userId: string,
    serviceId: string
  ) => {
    // alert to inform user what he has to do first before pressed the send button
    if (!comment.trim()) {
      Alert.alert(
        "Sorry",
        "Please write a comment first before pressing send."
      );
      return;
    }

    // console.log("Submitting comment with projectId:", projectId);
    try {
      if (!projectId || !userId || !serviceId) {
        // console.error("Invalid projectId:", projectId);
        return;
      }

      // condition to check if user is authenticated
      const user = FIREBASE_AUTH.currentUser;
      if (user) {
        const projectRef = doc(
          FIREBASE_FIRESTORE,
          `Users/${userId}/Services/${serviceId}/Projects/${projectId}`
        );
        // initialize the project snapshot
        const projectSnapshot = await getDoc(projectRef);
        // condition to check if the project exists
        if (projectSnapshot.exists()) {
          const projectNotesRef = collection(
            FIREBASE_FIRESTORE,
            `Users/${userId}/Services/${serviceId}/Projects/${projectId}/Notes`
          );
          // add the comment to the project
          await addDoc(projectNotesRef, {
            uid: user.uid,
            comment: comment,
            createdAt: serverTimestamp(),
          });
          // console.log("Comment saved");
          setComment("");
          onClose();
        } else {
          console.error("Project does not exist:", projectId);
        }
      } else {
        console.log("User not authenticated");
      }
    } catch (error) {
      console.error("Saving comment failed", error);
    }
  };

  // function to handle comment change
  const handleCommentChange = (text: string) => {
    setComment(text);
  };

  return (
    <View>
      {/*modal settings */}
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
          justifyContent: "center",
          alignItems: "center",
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
              fontSize: 18,
              backgroundColor: "#191919",
            }}
            placeholder={`Write a comment${dots}`}
            placeholderTextColor="grey"
            multiline={true}
            value={comment}
            onChangeText={handleCommentChange}
          />

          {/*submit button*/}
          <TouchableOpacity
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
                width: screenWidth * 0.7, // use 70% of the screen width
                maxWidth: 400,
                height: 45,
              }}
            >
              <Text
                style={{
                  fontFamily: "MPLUSLatin_Bold",
                  fontSize: 22,
                  color: "grey",
                  marginBottom: 5,
                }}
              >
                Save
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
  );
};

export default NoteModal;

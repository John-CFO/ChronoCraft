import { View, Text, TextInput, TouchableOpacity } from "react-native";
import React, { useState, useEffect } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { FIREBASE_FIRESTORE, FIREBASE_AUTH } from "../firebaseConfig";
import {
  doc,
  getDoc,
  addDoc,
  setDoc,
  serverTimestamp,
  collection,
} from "firebase/firestore";
import { User as User } from "firebase/auth";

interface NoteModalProps {
  projectId: string;
  onClose: () => void;
}

const NoteModal: React.FC<NoteModalProps> = ({
  projectId,
  onClose,
}: {
  projectId: string;
  onClose: () => void;
}) => {
  const [comment, setComment] = useState("");

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

  // set comment in project notes
  const handleSubmitComment = async (projectId: string) => {
    try {
      console.log("Trying to save comment...");
      console.log("Comment:", comment);
      if (comment.trim() !== "") {
        const db = FIREBASE_FIRESTORE;
        const user = FIREBASE_AUTH.currentUser;
        if (!user) {
          throw new Error("User not authenticated");
        }
        const projectDocRef = doc(db, "users", user.uid, "projects", projectId);
        const projectSnap = await getDoc(projectDocRef);
        if (!projectSnap.exists()) {
          const notesCollection = collection(projectDocRef, "Notes");
          //const notesCollection = collection(db, `projects/${projectId}/notes`);
          // set the comment to "notes" collection

          const newNoteRef = await addDoc(notesCollection, {
            comment: comment, // Der Kommentarinhalt
            createdAt: serverTimestamp(), // Das aktuelle Datum und die aktuelle Uhrzeit als Erstellungszeitstempel
          });
          console.log("New note reference:", newNoteRef.id); // Log-Nachricht: Ausgabe der ID der neuen Notiz
          console.log("Comment saved"); // Log-Nachricht: Erfolgreiche Speicherung des Kommentars
          setComment(""); // Zurücksetzen des Kommentarfelds
        } else {
          // Das Projekt existiert nicht
          console.log("Project with ID:", projectId, "does not exist."); // Log-Nachricht: Projekt mit der angegebenen ID existiert nicht
        }
      } else {
        // Der Kommentar ist leer
        console.log("Comment is empty"); // Log-Nachricht: Der Kommentar ist leer
      }
    } catch (error) {
      console.error("Saving comment failed", error); // Log-Nachricht: Fehler beim Speichern des Kommentars
    }
  };

  const handleCommentChange = (text: string) => {
    setComment(text);
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
            width: 350,
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
              marginBottom: 10,
              minHeight: 100,
              minWidth: 330,
              color: "white",
              fontSize: 18,
            }}
            placeholder={`Write a comment${dots}`}
            placeholderTextColor="grey"
            multiline={true}
            value={comment}
            onChangeText={handleCommentChange}
          />
          <TouchableOpacity
            onPress={() => handleSubmitComment(projectId)}
            style={{
              marginTop: 30,
              height: 45,
              width: 120,
              borderRadius: 8,
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

                height: 45,
                width: 120,
              }}
            >
              <Text
                style={{
                  color: "grey",
                  fontSize: 18,
                  fontFamily: "MPLUSLatin_Bold",
                  marginBottom: 11,
                  marginRight: 9,
                }}
              >
                Save
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
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

/*try {
  console.log("Trying to save comment...");
  console.log("Comment:", comment);
  // trim the comment if it is not empty
  if (comment.trim() !== "") {
    // call the firebase firestore
    const db = FIREBASE_FIRESTORE;
    // call active user
    const user = FIREBASE_AUTH.currentUser;
    // check if user is logged in
    if (!user) {
      throw new Error("User not authenticated");
    }

    // reference to the user project
    const projectRef = doc(db, "Projects", projectId);
    console.log("Project reference:", projectRef);

    // build the undercollcetion "notes"
    const notesCollection = collection(projectRef, "Notes");

    // set the comment to "notes" collection
    const newNoteRef = await addDoc(notesCollection, {
      comment: comment,
      createdAt: serverTimestamp(),
      projectId: projectId,
    });
    console.log("New note reference:", newNoteRef); // Hier wird die gesamte Referenz geloggt
    console.log("New note ID:", newNoteRef.id); // Hier wird nur die ID geloggt
    console.log("Comment saved");
    setComment("");
  } else {
    console.log("Comment is empty");
  }
} catch (error) {
  console.error("Saving comment failed", error);
}*/

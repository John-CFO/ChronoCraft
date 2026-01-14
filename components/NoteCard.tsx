//////////////////////////////// Notes Card Component //////////////////////////////

// NOTE: the NodeCard is nested in the NoteList Component
// This component is used to show the notes in a list

////////////////////////////////////////////////////////////////////////////////////

import { View, Text, Dimensions } from "react-native";
import React from "react";
import { AntDesign } from "@expo/vector-icons";
import { TouchableOpacity } from "react-native-gesture-handler";
import { doc, deleteDoc } from "firebase/firestore";

import { FIREBASE_FIRESTORE, FIREBASE_AUTH } from "../firebaseConfig";
import { useService } from "../components/contexts/ServiceContext";
import { useAlertStore } from "./services/customAlert/alertStore";
import { useAccessibilityStore } from "../components/services/accessibility/accessibilityStore";

///////////////////////////////////////////////////////////////////////////////////

interface NoteCardProps {
  note: { id: string; uid: string; comment: string; createdAt: Date }; // minimal type
  projectId: string;
  onDelete: (noteId: string) => void;
}

//////////////////////////////////////////////////////////////////////////////////

const NoteCard: React.FC<NoteCardProps> = ({ note, projectId, onDelete }) => {
  if (!note) {
    return null;
  }
  // declare the useService hook
  const { serviceId } = useService();

  // screensize for dynamic size calculation
  const screenWidth = Dimensions.get("window").width;

  // initialize the accessibility store
  const accessMode = useAccessibilityStore(
    (state) => state.accessibilityEnabled
  );

  // function to handle note deletion in firestore
  const handleDeletComment = async () => {
    if (!serviceId) return;

    useAlertStore
      .getState()
      .showAlert(
        "Attention!",
        "Do you really want to delete the note? This action cannot be undone.",
        [
          {
            text: "Cancel",
            onPress: () => console.log("Note deletion canceled"),
            style: "cancel",
          },
          {
            text: "Delete",
            onPress: async () => {
              const user = FIREBASE_AUTH.currentUser;
              if (!user) {
                console.error("User is not authenticated.");
                return;
              }

              // minimal authorization check
              if (note.uid !== user.uid) {
                console.error("User not authorized to delete this note");
                useAlertStore
                  .getState()
                  .showAlert("Error", "Not authorized to delete this note");
                return;
              }

              try {
                const noteDocRef = doc(
                  FIREBASE_FIRESTORE,
                  "Users",
                  user.uid,
                  "Services",
                  serviceId,
                  "Projects",
                  projectId,
                  "Notes",
                  note.id
                );
                await deleteDoc(noteDocRef);
                onDelete(note.id);
              } catch (error) {
                console.error("Error deleting note");
                useAlertStore
                  .getState()
                  .showAlert("Error", "Failed to delete note");
              }
            },
            style: "destructive",
          },
        ]
      );
  };

  return (
    // card container
    <View
      accessible={true}
      accessibilityLabel={`Note added at ${note.createdAt.toLocaleString()}. ${
        note.comment
      }`}
      style={{
        backgroundColor: "#191919",
        minWidth: 320,
        marginBottom: 20,
        width: screenWidth * 0.7, // use 70% of the screen width
        maxWidth: 400,
        borderColor: "grey",
        borderRadius: 10,
        padding: 10,
        minHeight: 100,
        //shadow options for android
        shadowColor: "#ffffff",
        elevation: 2,
        //shadow options for ios
        shadowOffset: { width: 2, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
      }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        {/*date information*/}
        <Text
          accessibilityLabel={`Added at ${note.createdAt.toLocaleString()}`}
          style={{
            fontFamily: accessMode
              ? "MPLUSLatin_Bold"
              : "MPLUSLatin_ExtraLight",
            fontSize: 14,
            color: accessMode ? "white" : "darkgrey",
          }}
        >
          added at: {note.createdAt.toLocaleString()}
        </Text>
        {/*delete button*/}
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Delete this note"
          accessibilityHint="Deletes the current note from the list"
          onPress={handleDeletComment}
        >
          <AntDesign
            name="delete"
            size={30}
            color={accessMode ? "white" : "darkgrey"}
          />
        </TouchableOpacity>
      </View>
      {/*note content*/}
      <Text
        accessibilityLabel={`Note text: ${note.comment}`}
        style={{
          fontFamily: "MPLUSLatin_Bold",
          fontSize: accessMode ? 20 : 18,
          color: "white",
          marginBottom: 10,
        }}
      >
        {note.comment}
      </Text>
    </View>
  );
};

export default NoteCard;

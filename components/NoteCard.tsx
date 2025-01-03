//////////////////////////////// Notes Card Component //////////////////////////////

// NOTE: the NodeCard is nested in the NoteList Component

import { View, Text } from "react-native";
import React from "react";
import { AntDesign } from "@expo/vector-icons";
import { TouchableOpacity } from "react-native-gesture-handler";
import { doc, deleteDoc } from "firebase/firestore";

import { FIREBASE_FIRESTORE, FIREBASE_AUTH } from "../firebaseConfig";

///////////////////////////////////////////////////////////////////////////////////
interface Note {
  id: string;
  comment: string;
  createdAt: Date;
}

interface NoteCardProps {
  note: Note;
  projectId: string;
  onDelete: (noteId: string) => void;
}

//////////////////////////////////////////////////////////////////////////////////

const NoteCard: React.FC<NoteCardProps> = ({ note, projectId, onDelete }) => {
  if (!note) {
    return null;
  }

  // function to handle note deletion in firestore
  const handleDeletComment = async () => {
    const user = FIREBASE_AUTH.currentUser;
    if (!user) {
      console.error("User is not authenticated.");
      return false;
    }
    try {
      const noteDocRef = doc(
        FIREBASE_FIRESTORE,
        "Users",
        user.uid,
        "Services",
        "AczkjyWoOxdPAIRVxjy3",
        "Projects",
        projectId,
        "Notes",
        note.id
      );
      await deleteDoc(noteDocRef);
      // console.log("Note deleted successfully.");
      onDelete(note.id);
    } catch (error) {
      console.error("Error deleting note:", error);
    }
  };

  return (
    // card container
    <View
      style={{
        backgroundColor: "#191919",
        minWidth: 350,
        marginBottom: 20,
        // borderWidth: 0.5,
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
          style={{
            fontFamily: "MPLUSLatin_ExtraLight",
            fontSize: 14,
            color: "white",
          }}
        >
          added at: {note.createdAt.toLocaleString()}
        </Text>
        {/*delete button*/}
        <TouchableOpacity onPress={handleDeletComment}>
          <AntDesign name="delete" size={30} color="darkgrey" />
        </TouchableOpacity>
      </View>
      {/*note content*/}
      <Text
        style={{
          fontFamily: "MPLUSLatin_Bold",
          fontSize: 18,
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

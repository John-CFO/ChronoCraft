//////////////////////////////// Notes Card Component //////////////////////////////

// NOTE: the NodeCard is nested in the NoteList Component
// This component is used to show the notes in a list

////////////////////////////////////////////////////////////////////////////////////

import { View, Text, Dimensions } from "react-native";
import React from "react";
import { AntDesign } from "@expo/vector-icons";
import { TouchableOpacity } from "react-native-gesture-handler";
import { doc, deleteDoc } from "firebase/firestore";
import { useTranslation } from "react-i18next";

import { FIREBASE_FIRESTORE, FIREBASE_AUTH } from "../firebaseConfig";
import { useService } from "../components/contexts/ServiceContext";
import { useAlertStore } from "./services/customAlert/alertStore";
import { useAccessibilityStore } from "../components/services/accessibility/accessibilityStore";
import { logError } from "../lib/loggerClient";

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

  // useTranslation hook to access translations
  const { t } = useTranslation();

  // declare the useService hook
  const { serviceId } = useService();

  // screensize for dynamic size calculation
  const screenWidth = Dimensions.get("window").width;

  // initialize the accessibility store
  const accessMode = useAccessibilityStore(
    (state) => state.accessibilityEnabled,
  );

  // function to handle note deletion in firestore
  const handleDeleteComment = async () => {
    if (!serviceId) return;

    useAlertStore
      .getState()
      .showAlert(
        t("notes.deleteConfirmationTitle"),
        t("notes.deleteConfirmationMessage"),
        [
          {
            text: t("notes.cancel"),
            style: "cancel",
          },
          {
            text: t("notes.deleteError"),
            onPress: async () => {
              const user = FIREBASE_AUTH.currentUser;
              if (!user) {
                logError(
                  "NoteCard/deleteNote/missingAuthUser",
                  new Error("User is not authenticated"),
                );
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
                  note.id,
                );
                await deleteDoc(noteDocRef);
                onDelete(note.id);
              } catch (error) {
                logError("NoteCard/deleteNote", error);
                useAlertStore
                  .getState()
                  .showAlert("Error", "Failed to delete note");
              }
            },
            style: "destructive",
          },
        ],
      );
  };

  return (
    // card container
    <View
      accessible={true}
      accessibilityLabel={`${t("notes.addedAt")} ${note.createdAt.toLocaleString()}. ${note.comment}`}
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
          accessibilityLabel={`${t("notes.addedAt")} ${note.createdAt.toLocaleString()}`}
          style={{
            fontFamily: accessMode
              ? "MPLUSLatin_Bold"
              : "MPLUSLatin_ExtraLight",
            fontSize: 14,
            color: accessMode ? "white" : "darkgrey",
          }}
        >
          {t("notes.addedAt")}: {note.createdAt.toLocaleString()}
        </Text>
        {/*delete button*/}
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={t("notes.delete")}
          accessibilityHint={t("notes.deleteHint")}
          onPress={handleDeleteComment}
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
        accessibilityLabel={`${t("notes.content")}: ${note.comment}`}
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

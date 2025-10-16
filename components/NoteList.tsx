////////////////////////////Note List Component///////////////////////////////////////////////

// This component is used to show the notes in a list

//////////////////////////////////////////////////////////////////////////////////////////////

import React from "react";
import { ScrollView, View, Text, ActivityIndicator } from "react-native";
import { CopilotStep, walkthroughable } from "react-native-copilot";

import NoteCard from "./NoteCard";
import { useNotes } from "../hooks/fetchNotesHook";
import { useAccessibilityStore } from "../components/services/accessibility/accessibilityStore";

///////////////////////////////////////////////////////////////////////////////////////////////

// modified walkthroughable for copilot tour
const CopilotTouchableView = walkthroughable(View);

const NoteList: React.FC<{ projectId: string }> = ({ projectId }) => {
  // use the useNotes hook
  const { notes, loading, error, removeNote } = useNotes(projectId);

  // initialize the accessibility store
  const accessMode = useAccessibilityStore(
    (state) => state.accessibilityEnabled
  );

  // loaduing and error conditions
  if (loading) return <ActivityIndicator size="large" color="white" />;
  if (error)
    return <Text style={{ color: "red" }}>Error: {error.message}</Text>;

  return (
    <ScrollView>
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        {/* DetailsScreen copilot tour step 2 */}
        <CopilotStep
          name="Your Notes"
          order={2}
          text="This card shows your notes for this project, if you have added any in the Home-Sceen Project-Card. You can delete them here."
        >
          <CopilotTouchableView
            style={{
              width: "100%",
              marginBottom: 20,
              backgroundColor: "#191919",
              borderWidth: 1,
              borderColor: "aqua",
              borderRadius: 8,
              padding: 20,
              alignItems: "center",
              overflow: "hidden",
            }}
          >
            {/* Card Title */}
            <Text
              accessible={true}
              accessibilityRole="header"
              accessibilityLabel="Your Notes"
              style={{
                fontFamily: "MPLUSLatin_Bold",
                fontSize: accessMode ? 28 : 25,
                color: "white",
                marginBottom: 40,
              }}
            >
              Your Notes
            </Text>
            {/* map the notes in the NoteList using the NoteCard component */}
            {notes.length > 0 ? (
              notes.map((note) => (
                <NoteCard
                  key={note.id}
                  note={note}
                  projectId={projectId}
                  onDelete={(noteId: string) => removeNote(noteId)}
                />
              ))
            ) : (
              // alternative text if no notes exists
              <Text
                accessible={true}
                accessibilityRole="text"
                accessibilityLabel="No notes available"
                style={{
                  textAlign: "center",
                  color: "white",
                  fontSize: 18,

                  fontFamily: accessMode
                    ? "MPLUSLatin_Bold"
                    : "MPLUSLatin_ExtraLight",
                }}
              >
                "You haven't any notes for this project yet."
              </Text>
            )}
          </CopilotTouchableView>
        </CopilotStep>
      </View>
    </ScrollView>
  );
};

export default NoteList;

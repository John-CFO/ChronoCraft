////////////////////////////Note List Component///////////////////////////////////////////////

// This component is used to show the notes in a list

//////////////////////////////////////////////////////////////////////////////////////////////
import React, { useState, useEffect } from "react";
import { ScrollView, View, Text, ActivityIndicator } from "react-native";
import { collection, query, getDocs, DocumentData } from "firebase/firestore";
import { CopilotStep, walkthroughable } from "react-native-copilot";

import NoteCard from "./NoteCard";
import { FIREBASE_FIRESTORE, FIREBASE_AUTH } from "../firebaseConfig";

///////////////////////////////////////////////////////////////////////////////////////////////

interface Note {
  id: string;
  comment: string;
  createdAt: Date;
}

///////////////////////////////////////////////////////////////////////////////////////////////
const NoteList: React.FC<{ projectId: string }> = ({ projectId }) => {
  // note state
  const [notes, setNotes] = useState<Note[]>([]);
  // error handling stae
  const [error, setError] = useState<Error | null>(null);
  // loading state if backend isn´t ready
  const [loading, setLoading] = useState<boolean>(true);

  // modified walkthroughable for copilot tour
  const CopilotTouchableView = walkthroughable(View);

  // hook to fetch the notes from Firestore with snapshot
  useEffect(() => {
    const fetchNotes = async () => {
      // condition to check if user is authenticated
      const user = FIREBASE_AUTH.currentUser;
      if (!user) {
        console.error("User is not authenticated.");
        return false;
      }
      // try to get the notes from Firestore
      try {
        const notesQuery = query(
          collection(
            FIREBASE_FIRESTORE,
            "Users",
            user.uid,
            `Services/AczkjyWoOxdPAIRVxjy3/Projects/${projectId}/Notes`
          )
        );
        const notesSnapshot = await getDocs(notesQuery);
        // condition to check if notesSnapshot is empty
        if (!notesSnapshot.empty) {
          const fetchedNotes: Note[] = notesSnapshot.docs.map((doc) => {
            const data = doc.data() as DocumentData;
            return {
              id: doc.id,
              comment: data.comment,
              createdAt: data.createdAt.toDate(),
            };
          });
          setNotes(fetchedNotes);
        } else {
          console.log("No notes found for this project.");
        }
      } catch (error) {
        console.error("Error fetching notes: ", error);
      } finally {
        setLoading(false);
      }
    };

    fetchNotes();
  }, [projectId]);

  if (loading) {
    return (
      <View>
        <ActivityIndicator size="large" color="blue" />
      </View>
    );
  }

  if (error) {
    return (
      <View>
        <Text style={{ color: "red" }}>Error: {error.message}</Text>
      </View>
    );
  }

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
              style={{
                fontFamily: "MPLUSLatin_Bold",
                fontSize: 25,
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
                  onDelete={(noteId: string) =>
                    setNotes((prevNotes) =>
                      prevNotes.filter((n) => n.id !== noteId)
                    )
                  }
                />
              ))
            ) : (
              // alternative text if no notes exists
              <Text
                style={{
                  textAlign: "center",
                  color: "white",
                  fontSize: 18,
                  fontFamily: "MPLUSLatin_ExtraLight",
                }}
              >
                You haven't any notes for this project yet.
              </Text>
            )}
          </CopilotTouchableView>
        </CopilotStep>
      </View>
    </ScrollView>
  );
};

export default NoteList;

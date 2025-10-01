////////////////////////////Note List Component///////////////////////////////////////////////

// This component is used to show the notes in a list

//////////////////////////////////////////////////////////////////////////////////////////////

import React, { useState, useEffect } from "react";
import { ScrollView, View, Text, ActivityIndicator } from "react-native";
import { collection, query, getDocs } from "firebase/firestore";
import { CopilotStep, walkthroughable } from "react-native-copilot";
import { z } from "zod";

import NoteCard from "./NoteCard";
import { FIREBASE_FIRESTORE, FIREBASE_AUTH } from "../firebaseConfig";
import { useAccessibilityStore } from "../components/services/accessibility/accessibilityStore";
import { FirestoreNoteSchema } from "../validation/noteSchemas";

///////////////////////////////////////////////////////////////////////////////////////////////

// use zod type for notes
type Note = z.infer<typeof FirestoreNoteSchema>;

///////////////////////////////////////////////////////////////////////////////////////////////

// modified walkthroughable for copilot tour
const CopilotTouchableView = walkthroughable(View);

const NoteList: React.FC<{ projectId: string }> = ({ projectId }) => {
  // note state
  const [notes, setNotes] = useState<Note[]>([]);

  // error handling stae
  const [error, setError] = useState<Error | null>(null);

  // loading state if backend isn´t ready
  const [loading, setLoading] = useState<boolean>(true);

  // initialize the accessibility store
  const accessMode = useAccessibilityStore(
    (state) => state.accessibilityEnabled
  );

  // hook to fetch the notes from Firestore with snapshot
  useEffect(() => {
    const fetchNotes = async () => {
      // condition to check if user is authenticated
      const user = FIREBASE_AUTH.currentUser;
      if (!user) {
        console.error("User is not authenticated.");
        setError(new Error("Authentication required"));
        setLoading(false);
        return;
      }
      // project Id validation - Path Traversal Prevention
      const idRegex = /^[a-zA-Z0-9_-]+$/;
      if (!idRegex.test(projectId)) {
        console.error("Invalid project ID:", projectId);
        setError(new Error("Invalid project"));
        setLoading(false);
        return;
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
        // validate data with zod
        const validatedNotes: Note[] = [];
        const validationErrors: string[] = [];

        notesSnapshot.docs.forEach((doc) => {
          const data = doc.data();

          // validate every note
          const validationResult = FirestoreNoteSchema.safeParse({
            id: doc.id,
            comment: data.comment,
            createdAt: data.createdAt?.toDate(), // Safe conversion
            uid: data.uid,
          });

          if (validationResult.success) {
            validatedNotes.push(validationResult.data);
          } else {
            // log validation errors
            console.warn("Invalid note data skipped:", {
              docId: doc.id,
              error: validationResult.error.issues,
            });
            validationErrors.push(`Note ${doc.id} has invalid data`);
          }
        });

        // log validation summary
        if (validationErrors.length > 0) {
          console.warn(
            `Skipped ${validationErrors.length} invalid notes:`,
            validationErrors
          );
        }

        setNotes(validatedNotes);

        // condition to check if notesSnapshot is empty
        if (notesSnapshot.empty && validatedNotes.length === 0) {
          console.log("No valid notes found for this project.");
        }
      } catch (error) {
        // secure error handling
        console.error("Error fetching notes");
        setError(new Error("Failed to load notes"));
      } finally {
        setLoading(false);
      }
    };

    fetchNotes();
  }, [projectId]);

  if (loading) {
    return (
      <View>
        <ActivityIndicator size="large" color="white" />
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

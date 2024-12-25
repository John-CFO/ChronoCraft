////////////////////////////Note List Component///////////////////////////////////////////////

import React, { useState, useEffect } from "react";
import { ScrollView, View, Text, ActivityIndicator } from "react-native";
import { collection, query, getDocs, DocumentData } from "firebase/firestore";

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
  // state to manage the  useEffect to show the notes
  const [notes, setNotes] = useState<Note[]>([]);

  // state to manage the loading Indicator
  const [loading, setLoading] = useState<boolean>(true);

  // useEffect to fetch the notes from Firestore with snapshot
  useEffect(() => {
    const fetchNotes = async () => {
      const user = FIREBASE_AUTH.currentUser;
      if (!user) {
        console.error("User is not authenticated.");
        return false;
      }
      try {
        const notesQuery = query(
          collection(
            FIREBASE_FIRESTORE,
            "users",
            user.uid,
            `Services/AczkjyWoOxdPAIRVxjy3/Projects/${projectId}/Notes`
          )
        );
        const notesSnapshot = await getDocs(notesQuery);

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

  // function to handle note deletion
  const handleDeleteNote = (noteId: string) => {
    setNotes((prevNotes) => prevNotes.filter((note) => note.id !== noteId));
  };

  if (loading) {
    return (
      <View>
        <ActivityIndicator size="large" color="blue" />
      </View>
    );
  }

  return (
    <ScrollView>
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <View
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
            flexShrink: 1,
            flexGrow: 0,
          }}
        >
          {/* Title */}
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
          {notes.length > 0 ? (
            notes.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                projectId={projectId}
                onDelete={handleDeleteNote}
              />
            ))
          ) : (
            // if there is no note
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
        </View>
      </View>
    </ScrollView>
  );
};

export default NoteList;

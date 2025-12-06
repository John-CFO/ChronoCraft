///////////////////fetchNotesHook.ts//////////////////////////

import { useState, useEffect } from "react";
import { collection, getDocs, query } from "firebase/firestore";

import {
  FirestoreNoteSchema,
  FirestoreNote,
} from "../validation/noteSchemas.sec";
import { FIREBASE_FIRESTORE, FIREBASE_AUTH } from "../firebaseConfig";
import { isValidFirestoreDocId } from "../validation/firestoreSchemas.sec";
import { useService } from "../components/contexts/ServiceContext";

//////////////////////////////////////////////////////////////

// define the useNotes hook
export const useNotes = (projectId: string) => {
  // states
  const [notes, setNotes] = useState<FirestoreNote[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const { serviceId } = useService();

  // function to remove a note in the notes array (NoteList)
  const removeNote = (noteId: string) => {
    setNotes((prevNotes) => prevNotes.filter((n) => n.id !== noteId));
  };

  // fetch notes hook
  useEffect(() => {
    const fetchNotes = async () => {
      if (!serviceId) return;
      setLoading(true);
      setError(null);

      // validate projectId
      if (!projectId || !isValidFirestoreDocId(projectId)) {
        setError(new Error("Invalid project ID"));
        setLoading(false);
        return;
      }

      const user = FIREBASE_AUTH.currentUser;

      // validate user
      if (!user || !user.uid || !isValidFirestoreDocId(user.uid)) {
        setError(new Error("User not authenticated"));
        setLoading(false);
        return;
      }

      try {
        const notesQuery = query(
          collection(
            FIREBASE_FIRESTORE,
            "Users",
            user.uid,
            "Services",
            serviceId,
            "Projects",
            projectId,
            "Notes"
          )
        );

        const notesSnapshot = await getDocs(notesQuery);

        const validatedNotes: FirestoreNote[] = notesSnapshot.docs
          .map((doc) =>
            FirestoreNoteSchema.safeParse({ id: doc.id, ...doc.data() })
          )
          .filter(
            (result): result is { success: true; data: FirestoreNote } =>
              result.success
          )
          .map((result) => result.data);

        setNotes(validatedNotes);
      } catch {
        setError(new Error("Failed to fetch notes"));
      } finally {
        setLoading(false);
      }
    };

    fetchNotes();
  }, [projectId, serviceId]);

  return { notes, loading, error, removeNote };
};

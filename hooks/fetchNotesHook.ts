/////////////////// fetchNotesHook.ts //////////////////////////

import { useState, useEffect } from "react";
import { collection, getDocs, query } from "firebase/firestore";

import { FIREBASE_FIRESTORE, FIREBASE_AUTH } from "../firebaseConfig";
import { useService } from "../components/contexts/ServiceContext";

//////////////////////////////////////////////////////////////

type Note = {
  id: string;
  title?: string;
  content?: string;
  createdAt?: any;
  updatedAt?: any;
};

//////////////////////////////////////////////////////////////

// define the useNotes hook
export const useNotes = (projectId: string) => {
  // states
  const [notes, setNotes] = useState<Note[]>([]);
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
      if (!serviceId || !projectId) return;

      setLoading(true);
      setError(null);

      const user = FIREBASE_AUTH.currentUser;
      if (!user) {
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

        const notes: Note[] = notesSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setNotes(notes);
      } catch (e) {
        setError(new Error("Failed to fetch notes"));
      } finally {
        setLoading(false);
      }
    };

    fetchNotes();
  }, [projectId, serviceId]);

  return { notes, loading, error, removeNote };
};

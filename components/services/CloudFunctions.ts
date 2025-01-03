import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

export const onDeleteProject = functions.firestore
  .document("Users/{userId}/Services/AczkjyWoOxdPAIRVxjy3/Projects/{projectId}")
  .onDelete(async (snapshot, context) => {
    const { userId, projectId } = context.params;

    try {
      const notesCollectionRef = db.collection(
        `Users/${userId}/Services/AczkjyWoOxdPAIRVxjy3/Projects/${projectId}/Notes`
      );
      const notesQuerySnapshot = await notesCollectionRef.get();

      const batch = db.batch();
      notesQuerySnapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      console.log(`Deleted notes for project ${projectId} in user ${userId}`);
    } catch (error) {
      console.error("Error deleting notes:", error);
    }
  });

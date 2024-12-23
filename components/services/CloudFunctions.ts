import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

admin.initializeApp();

export const onDeleteProject = functions.firestore
  .document("Services/AczkjyWoOxdPAIRVxjy3/Projects/{projectId}")
  .onDelete(async (snapshot, context) => {
    const projectId = context.params.projectId;

    try {
      const notesCollectionRef = admin
        .firestore()
        .collection(`Projects/${projectId}/Notes`);
      const notesQuerySnapshot = await notesCollectionRef.get();

      const batch = admin.firestore().batch();
      notesQuerySnapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      console.log(`Deleted notes for project ${projectId}`);
    } catch (error) {
      console.error("Error deleting notes:", error);
    }
  });

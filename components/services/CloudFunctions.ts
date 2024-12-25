/////////////////////////////////Cloud Functions Component//////////////////////////////////////////

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

////////////////////////////////////////////////////////////////////////////////////////////////////

admin.initializeApp(); // initialize Firebase Admin SDK
const db = admin.firestore(); // build a reference to the Firestore database

// Cloud Function that gets triggered when a project is deleted
export const onDeleteProject = functions.firestore
  .document("users/{userId}/Services/{serviceId}/Projects/{projectId}") // firestore path
  .onDelete(async (snapshot, context) => {
    // function to delete documents
    const { userId, serviceId, projectId } = context.params; // extract parameters from context

    try {
      // create a reference to the "Notes" collection
      const notesCollectionRef = admin
        .firestore()
        .collection(
          `users/${userId}/Services/${serviceId}/Projects/${projectId}/Notes`
        );
      // call the get() method to retrieve all documents in the "Notes" collection
      const notesQuerySnapshot = await notesCollectionRef.get();

      // Iinitialize a batch transaction to perform multiple write operations
      const batch = admin.firestore().batch();

      // interate over each document in the "Notes" collection
      notesQuerySnapshot.forEach((doc) => {
        batch.delete(doc.ref); // delete each document
      });

      // call the batch operation to delete all documents together
      await batch.commit();
      console.log(`Deleted notes for project ${projectId}`);
    } catch (error) {
      console.error("Error deleting notes:", error);
    }
  });

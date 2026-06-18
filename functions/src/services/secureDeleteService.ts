/////////////////////// secureDeleteService.ts //////////////////////////////

// This file contains the implementation of the SecureDeleteService class,
// which is used to interact with the Firestore database.

//////////////////////////////////////////////////////////////////////////////

import * as admin from "firebase-admin";
import { logEvent } from "../utils/logger";

//////////////////////////////////////////////////////////////////////////////

export class SecureDeleteService {
  private db = admin.firestore();

  // Delete all documents in a collection
  async deleteUserService(userId: string, serviceId: string, subs: string[]) {
    const serviceRef = this.db
      .collection("Users")
      .doc(userId)
      .collection("Services")
      .doc(serviceId);

    const serviceSnap = await serviceRef.get();
    if (!serviceSnap.exists) return { success: true };

    for (const sub of subs) {
      const colRef = serviceRef.collection(sub);
      const docs = await colRef.listDocuments();

      await Promise.all(
        docs.map((d: FirebaseFirestore.DocumentReference) => d.delete()),
      );
    }

    logEvent("secure delete", "info", {
      uid: userId,
      serviceId,
    });

    return { success: true };
  }
}

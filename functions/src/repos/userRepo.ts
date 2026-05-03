////////////////////////////////// userRepo.ts /////////////////////////////////

// This file contains the implementation of the UserRepo class,
// which is used to interact with the Firestore database.

////////////////////////////////////////////////////////////////////////////////

import { getFirestore, FieldValue } from "firebase-admin/firestore";

import { NotFoundError } from "../errors/domain.errors";

////////////////////////////////////////////////////////////////////////////////

export class UserRepo {
  // Constructor: Dependency Injection with default value to allow testing without mock admin
  constructor(private db = getFirestore()) {}
  private usersRef = this.db.collection("Users");

  // createUser method to create a new user
  async createUserIfNotExists(uid: string, data: Record<string, unknown>) {
    const ref = this.usersRef.doc(uid);

    await this.db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);

      if (!snap.exists) {
        tx.set(ref, {
          ...data,
          createdAt: FieldValue.serverTimestamp(),
          hasSeenHomeTour: false,
          hasSeenDetailsTour: false,
          hasSeenVacationTour: false,
          hasSeenWorkHoursTour: false,
        });
      }
    });

    return { success: true };
  }

  // getUser method to retrieve a user
  async getUser(uid: string) {
    const userDoc = await this.usersRef.doc(uid).get();
    if (!userDoc.exists) {
      throw new NotFoundError("User", { uid });
    }
    return userDoc;
  }

  // updateUser method to update a user
  async updateUser(uid: string, data: any) {
    const ref = this.usersRef.doc(uid);
    const snap = await ref.get();

    if (!snap.exists) {
      throw new NotFoundError("User", { uid });
    }

    await ref.update(data);
  }

  // getUserTOTPSecret method to retrieve a user's TOTP secret
  async getUserTOTPSecret(uid: string): Promise<string | null> {
    const userDoc = await this.getUser(uid);
    return userDoc.data()?.totpSecret || null;
  }
}

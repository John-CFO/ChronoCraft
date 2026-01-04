////////////////////////////////// userRepo.ts /////////////////////////////////

// This file contains the implementation of the UserRepo class,
// which is used to interact with the Firestore database.

////////////////////////////////////////////////////////////////////////////////

import * as admin from "firebase-admin";

import { NotFoundError } from "../errors/domain.errors";

////////////////////////////////////////////////////////////////////////////////

export class UserRepo {
  // Constructor: Dependency Injection with default value to allow testing without mock admin
  constructor(private db = admin.firestore()) {}
  private usersRef = this.db.collection("Users");

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
    await this.usersRef.doc(uid).update(data);
  }

  // getUserTOTPSecret method to retrieve a user's TOTP secret
  async getUserTOTPSecret(uid: string): Promise<string | null> {
    const userDoc = await this.getUser(uid);
    return userDoc.data()?.totpSecret || null;
  }
}

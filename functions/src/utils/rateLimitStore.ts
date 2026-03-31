////////////////////////////// rateLimitStore.ts /////////////////////////////////

// This file contains the implementation of the FirestoreRateLimitStore class,
// which is used to store rate limit data in Firestore.

/////////////////////////////////////////////////////////////////////////////////

import {
  Firestore,
  DocumentReference,
  DocumentSnapshot,
} from "firebase-admin/firestore";

import { hashRateLimitId } from "./rateLimitKey";

/////////////////////////////////////////////////////////////////////////////////

// Interface definitions
export interface RateLimitStore {
  getActionDoc(scope: string, id: string, action: string): Promise<any | null>;
  getRef(scope: string, id: string, action: string): DocumentReference;
  setActionDoc(
    scope: string,
    id: string,
    action: string,
    data: any,
  ): Promise<void>;
  updateActionDoc(
    scope: string,
    id: string,
    action: string,
    data: any,
  ): Promise<void>;
  deleteActionDoc(scope: string, id: string, action: string): Promise<void>;
  recursiveDelete(scope: string, id: string): Promise<void>;
  runTransaction<T>(cb: (tx: TransactionWrapper) => Promise<T>): Promise<T>;
}

export interface TransactionWrapper {
  get(ref: DocumentReference): Promise<DocumentSnapshot>;
  set(ref: DocumentReference, data: any): Promise<void>;
  update(ref: DocumentReference, data: Partial<any>): Promise<void>;
}

////////////////////////////////////////////////////////////////////////////////

export class FirestoreRateLimitStore implements RateLimitStore {
  constructor(
    private db: Firestore,
    private readonly hmacKey?: string,
  ) {}

  private requireHmacKey(): string {
    if (!this.hmacKey) {
      throw new Error("Missing RATE_LIMIT_HMAC_KEY");
    }
    return this.hmacKey;
  }

  private resolveHashedId(id: string): string {
    return hashRateLimitId(id, this.requireHmacKey());
  }

  getRef(scope: string, id: string, action: string) {
    const hashedId = this.resolveHashedId(id);
    return this.db
      .collection("RateLimits")
      .doc(scope)
      .collection(hashedId)
      .doc(action);
  }

  async getActionDoc(scope: string, id: string, action: string) {
    const snap = await this.getRef(scope, id, action).get();
    return snap.exists ? snap.data() : null;
  }

  async setActionDoc(scope: string, id: string, action: string, data: any) {
    await this.getRef(scope, id, action).set(data);
  }

  async updateActionDoc(scope: string, id: string, action: string, data: any) {
    await this.getRef(scope, id, action).update(data);
  }

  async deleteActionDoc(scope: string, id: string, action: string) {
    await this.getRef(scope, id, action).delete();
  }

  async recursiveDelete(scope: string, id: string) {
    const hashedId = this.resolveHashedId(id);
    const ref = this.db
      .collection("RateLimits")
      .doc(scope)
      .collection(hashedId);
    await this.db.recursiveDelete(ref);
  }

  async runTransaction<T>(
    cb: (tx: TransactionWrapper) => Promise<T>,
  ): Promise<T> {
    return this.db.runTransaction(async (tx): Promise<T> => {
      const wrapper: TransactionWrapper = {
        get: async (ref: DocumentReference) => {
          return tx.get(ref);
        },
        set: async (ref: DocumentReference, data: any) => {
          await tx.set(ref, data);
        },
        update: async (ref: DocumentReference, data: Partial<any>) => {
          await tx.update(ref, data);
        },
      };

      return cb(wrapper);
    });
  }
}

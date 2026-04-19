////////////////////////////// rateLimitStore.ts /////////////////////////////////

// This file contains the implementation of the FirestoreRateLimitStore class,
// which is used to store rate limit data in Firestore.

/////////////////////////////////////////////////////////////////////////////////

import {
  Firestore,
  DocumentReference,
  Transaction,
} from "firebase-admin/firestore";
import * as Crypto from "crypto";

//////////////////////////////////////////////////////////////////////////////////

// RateLimitStore Contract
export interface RateLimitStore {
  getRef(
    useCase: string,
    ip: string,
    device: string,
    action: string,
    uid: string,
  ): DocumentReference;

  getActionDoc(
    useCase: string,
    ip: string,
    device: string,
    action: string,
    uid: string,
  ): Promise<any | null>;

  setActionDoc(
    useCase: string,
    ip: string,
    device: string,
    action: string,
    uid: string,
    data: any,
  ): Promise<void>;

  updateActionDoc(
    useCase: string,
    ip: string,
    device: string,
    action: string,
    uid: string,
    data: any,
  ): Promise<void>;

  deleteActionDoc(
    useCase: string,
    ip: string,
    device: string,
    action: string,
    uid: string,
  ): Promise<void>;

  runTransaction<T>(cb: (tx: Transaction) => Promise<T>): Promise<T>;
}

// Firestore Implementation
export class FirestoreRateLimitStore implements RateLimitStore {
  constructor(
    private db: Firestore,
    private readonly hmacKey?: string,
  ) {}

  // ---------- hashing ----------
  private hash(value: string): string {
    if (!this.hmacKey) throw new Error("Missing RATE_LIMIT_HMAC_KEY");

    return Crypto.createHmac("sha256", this.hmacKey)
      .update(value)
      .digest("base64url");
  }

  // ---------- path ----------
  getRef(
    useCase: string,
    ip: string,
    device: string,
    action: string,
    uid: string,
  ) {
    const ipHash = this.hash(ip);
    const deviceHash = this.hash(device);

    return this.db
      .collection("security")
      .doc("rateLimits")
      .collection(useCase)
      .doc(ipHash)
      .collection(deviceHash)
      .doc("action")
      .collection(action)
      .doc(uid);
  }

  // ---------- transaction ----------
  async runTransaction<T>(cb: (tx: Transaction) => Promise<T>): Promise<T> {
    return this.db.runTransaction(async (tx) => {
      return cb(tx);
    });
  }

  // ---------- read ----------
  async getActionDoc(
    useCase: string,
    ip: string,
    device: string,
    action: string,
    uid: string,
  ) {
    const snap = await this.getRef(useCase, ip, device, action, uid).get();
    return snap.exists ? snap.data() : null;
  }

  // ---------- write ----------
  async setActionDoc(
    useCase: string,
    ip: string,
    device: string,
    action: string,
    uid: string,
    data: any,
  ) {
    await this.getRef(useCase, ip, device, action, uid).set(data);
  }

  async updateActionDoc(
    useCase: string,
    ip: string,
    device: string,
    action: string,
    uid: string,
    data: any,
  ) {
    await this.getRef(useCase, ip, device, action, uid).update(data);
  }

  async deleteActionDoc(
    useCase: string,
    ip: string,
    device: string,
    action: string,
    uid: string,
  ) {
    await this.getRef(useCase, ip, device, action, uid).delete();
  }
}

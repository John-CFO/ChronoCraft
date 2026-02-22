//////////////////// totpEncryption.unit.ts //////////////////////

// This file contains the TOTP Encryption Unit Tests

//////////////////////////////////////////////////////////////////////////////

import { encrypt, decrypt } from "../../../src/functions/totp";

//////////////////////////////////////////////////////////////////////////////

describe("AES-256-GCM Encryption", () => {
  const KEY = "super-secret-key";

  it("encrypt/decrypt roundtrip", () => {
    const plaintext = "test-secret";
    const encrypted = encrypt(plaintext, KEY);
    const decrypted = decrypt(encrypted, KEY);
    expect(decrypted).toBe(plaintext);
  });

  it("fails if authTag is manipulated", () => {
    const encrypted = encrypt("secret", KEY);
    const parts = encrypted.split(":");
    parts[1] = parts[1].replace(/./, "0");
    expect(() => decrypt(parts.join(":"), KEY)).toThrow();
  });

  it("fails with wrong key", () => {
    const encrypted = encrypt("secret", KEY);
    expect(() => decrypt(encrypted, "wrong-key")).toThrow();
  });
});

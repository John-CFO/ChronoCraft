# Data Protection & Cryptographic Design

## Scope

This document describes how sensitive data is protected within the system, including:

- cryptographic secrets (TOTP)
- rate limiting identifiers
- authentication-related sensitive values
- system-level secrets used for hashing and encryption

It reflects the actual implementation state.

---

## Protected Data Types

The system handles the following sensitive data:

### 1. TOTP Secrets

- used for MFA authentication
- generated per user enrollment
- high entropy cryptographic material (160-bit)

### 2. Rate Limit Identifiers

- IP addresses (derived from request headers)
- device identifiers (client-provided)
- transformed into HMAC hashes before storage

### 3. System Secrets

- HMAC keys
- encryption keys (if applicable to secret storage layer)

---

## Cryptographic Primitives

The system uses the following primitives:

### HMAC

- Algorithm: SHA-256
- Used for:
  - IP hashing
  - device ID hashing
  - rate limit key derivation

Implementation:

```ts
Crypto.createHmac("sha256", secret).update(value, "utf8").digest("base64url");
```

Properties:

- deterministic output
- irreversible without secret
- prevents plaintext leakage in storage paths

---

### TOTP Cryptography

- HOTP (RFC 4226)
- TOTP (RFC 6238)
- HMAC-SHA1 (RFC requirement, not arbitrary choice)
- 30-second time step

Note:

SHA-1 is used only inside RFC-defined TOTP computation and not for general system security decisions.

---

### (Optional / External) Encryption Layer

If secrets are stored encrypted (e.g. TOTP secret storage layer):

- AES-GCM is assumed as encryption mode
- provides:
  - confidentiality
  - integrity
  - tamper detection

---

## Secret Storage Model

### TOTP Secrets

- generated using `crypto.randomBytes(20)`
- encoded in Base32 (RFC 4648)
- stored separately from authentication logic
- bound to user identity at database/security-rule level

Security properties:

- no deterministic relation to UID
- no derivation from user metadata
- high entropy (160-bit)

---

## Rate Limit Identifier Protection

Sensitive identifiers are never stored in plaintext.

### Protected values:

- IP address
- device ID

### Transformation:

- HMAC-SHA-256
- base64url encoding
- keyed with `RATE_LIMIT_HMAC_KEY`

Result:

- Firestore stores only hashed identifiers
- no direct reconstruction without secret key

---

## Trust Boundaries

### Trusted components

- Firebase Admin SDK (server environment)
- Firestore (server-side enforcement)
- Node.js crypto module
- secret management system (environment / Firebase Secrets)

### Untrusted inputs

- client deviceId
- IP headers (`x-forwarded-for`)
- network-level metadata
- any user-provided authentication context

---

## Key Management

### Current state

- HMAC key is provided via environment (`RATE_LIMIT_HMAC_KEY`)
- no runtime key rotation implemented

### Implication

- key compromise affects:
  - ability to reconstruct hashed identifiers
  - integrity of rate limit separation

- does NOT directly expose:
  - TOTP secrets
  - authentication credentials

---

## Data at Rest

Firestore stores:

- rate limit state (token buckets)
- hashed identifiers
- authentication metadata (non-sensitive structure only)

No plaintext storage of:

- IP addresses
- device identifiers
- cryptographic rate limit keys

---

## Data in Transit

All communication relies on external TLS enforcement (Firebase / HTTPS layer).

The system assumes:

- transport encryption is provided by infrastructure
- no custom TLS implementation is required at application level

---

## Security Properties

The system ensures:

- no plaintext storage of sensitive identifiers (IP/device)
- cryptographically protected rate limit partitioning
- high-entropy secret generation for MFA
- RFC-compliant TOTP implementation
- separation between authentication logic and storage protection
- deterministic but non-reversible identifier hashing

---

## Known Limitations / Risks

### 1. Client-controlled deviceId

- deviceId is provided by client
- can be spoofed or rotated

Mitigation:

- rate limiting is multi-dimensional (UID + IP + device + action)

---

### 2. IP reliability

- IP may be shared (NAT, mobile networks)
- IP can change frequently

Mitigation:

- IP is only one dimension in rate limiting context
- never used as sole identifier

---

### 3. No key rotation

- HMAC key rotation not implemented
- long-term key compromise risk exists

---

### 4. External dependency on Firebase infrastructure

- security depends on:
  - Firestore correctness
  - Firebase Admin trust boundary
  - environment secret protection

---

## Design Summary

The system follows a strict principle:

> Sensitive identifiers are never stored directly.  
> All persistent identifiers are either hashed or structurally isolated.

Combined with RFC-compliant cryptography and server-side enforcement, this provides a layered defense model against:

- credential brute-force
- identifier enumeration
- distributed abuse attempts
- storage-level data leakage

# Data Protection & Cryptographic Design

## Scope

This document describes how sensitive data is protected within the system, including:

- cryptographic secrets (TOTP)
- rate limiting identifiers
- authentication-related sensitive values
- system-level secrets used for hashing and encryption
- **user-uploaded profile images and their metadata**

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

### 4. Profile Images

- user-uploaded image bytes
- image metadata (including EXIF, if present)
- the public URL under which the image is served
- the storage path (`profilePictures/{uid}/current.{ext}`)

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

## Profile Image Data Protection

Profile images are user-supplied content. They are treated as **untrusted until validated**, and their public exposure is gated by a server-side pipeline.

### Storage layout

```
profilePictures/
├── quarantine/{uid}/{uploadId}     ← not readable by anyone
└── {uid}/current.{ext}             ← public read
```

### Protection properties

| Property                                 | Mechanism                                                                                                                                                                               |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **No pre-validation exposure**           | The `quarantine/` prefix is `allow read: if false`. No principal can read objects before the function has validated them.                                                               |
| **No client-controlled public write**    | The public path is `allow write: if false`. Only the Admin SDK (used by `validateProfileImage`) can promote content there.                                                              |
| **Format integrity of promoted content** | The promoted object's `Content-Type` is derived from magic bytes, never from the client header.                                                                                         |
| **Path integrity**                       | The UID segment is validated (`^[A-Za-z0-9_-]{1,128}$`) before any storage or Firestore access.                                                                                         |
| **Stable URL with cache-busting**        | The public `photoURL` written to Firestore includes `?v=<storage generation>`, so clients always fetch the current version and stale versions cannot be served from client-side caches. |
| **Atomic promotion**                     | Promotion is a single save followed by a single Firestore update; a failure between them leaves the previous public image intact (the new one is not yet referenced).                   |

### What is NOT protected

- **Image content itself.** Once promoted, the image is served publicly under its URL. This is intentional — profile images are meant to be visible to other users.
- **EXIF metadata.** Uploaded images are stored as-is. Any metadata present in the original file (including GPS coordinates, device model, timestamps) remains in the promoted object. See "Known Limitations".
- **Trailing content in polyglot files.** A file that begins with valid JPEG/PNG/WebP magic bytes and contains arbitrary trailing data is promoted as-is. The fixed `Content-Type` prevents the trailing data from being interpreted as active content by a browser, but the file is not sanitized by re-encoding.

---

## Trust Boundaries

### Trusted components

- Firebase Admin SDK (server environment)
- Firestore (server-side enforcement)
- Node.js crypto module
- secret management system (environment / Firebase Secrets)
- Cloud Storage trigger delivery
- **magic-byte detection in `validateProfileImage`**

### Untrusted inputs

- client deviceId
- IP headers (`x-forwarded-for`)
- network-level metadata
- any user-provided authentication context
- **client-supplied `contentType` on uploads**
- **uploaded file bytes, until validated**
- **client-provided object names**

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
  - **profile images (which are stored separately and not keyed by HMAC)**

---

## Data at Rest

Firestore stores:

- rate limit state (token buckets)
- hashed identifiers
- authentication metadata (non-sensitive structure only)
- **`Users/{uid}.photoURL` — a public URL to the validated image**

Cloud Storage stores:

- **validated profile images under `profilePictures/{uid}/current.{ext}`**
- **transient quarantine objects under `profilePictures/quarantine/{uid}/{uuid}` (deleted after validation)**

No plaintext storage of:

- IP addresses
- device identifiers
- cryptographic rate limit keys
- **unvalidated uploaded content in a readable location**

---

## Data in Transit

All communication relies on external TLS enforcement (Firebase / HTTPS layer).

The system assumes:

- transport encryption is provided by infrastructure
- no custom TLS implementation is required at application level

For image uploads specifically:

- the client uploads to the quarantine prefix over HTTPS via the Firebase Storage SDK.
- the Cloud Function reads the object via the Admin SDK over Google's internal network.
- the promoted object is served to readers over HTTPS via `firebasestorage.googleapis.com`.

No image bytes are transmitted over a channel that is not TLS-protected.

---

## Security Properties

The system ensures:

- no plaintext storage of sensitive identifiers (IP/device)
- cryptographically protected rate limit partitioning
- high-entropy secret generation for MFA
- RFC-compliant TOTP implementation
- separation between authentication logic and storage protection
- deterministic but non-reversible identifier hashing
- **server-authoritative validation of uploaded content before any public exposure**
- **no readable path for unvalidated user-uploaded content**
- **cache-busted public URLs so stale images are not served after an update**

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

### 5. EXIF metadata in profile images

- uploaded images are stored as-is, including any EXIF metadata present in the original file.
- EXIF can contain:
  - GPS coordinates
  - device model and firmware
  - capture timestamps
  - software identifiers
  - thumbnails of the original image

Mitigation:

- none at this layer. Stripping EXIF requires re-encoding the image, which changes the bytes and is a larger change (e.g. via `sharp`). This is a documented residual risk, not a mitigated one.

Impact:

- a user who uploads a photo taken on a GPS-enabled device publishes their location to anyone with the URL.
- this is a privacy concern, not a confidentiality or integrity concern.

Recommended follow-up:

- re-encode uploaded images server-side to strip metadata before promotion.

---

### 6. Polyglot content in promoted images

- a file that begins with valid JPEG/PNG/WebP magic bytes and contains arbitrary trailing data is promoted as-is.
- the file is not re-encoded, so trailing content remains in the object bytes.

Mitigation:

- the promoted object's `Content-Type` is fixed at `image/jpeg`, `image/png`, or `image/webp`. Browsers honor this header for top-level navigation, so trailing content is not interpreted as HTML, SVG, or script.
- the public path is not served with an HTML-capable content type, and no user-controlled string is reflected into the served response.

Impact:

- the trailing content is only visible to someone who downloads the file and inspects it manually. It cannot be executed in a browser session.

Recommended follow-up:

- re-encode uploaded images server-side (which would also fix the EXIF issue) so that only the decoded pixel data is preserved.

---

### 7. Orphaned quarantine objects

- if the Cloud Function fails between downloading the object and deleting it, the object remains in `profilePictures/quarantine/...`.
- orphaned objects accumulate storage cost but are not readable.

Mitigation:

- the failure path is rare. The function deletes the quarantine object on every terminal path under normal operation.
- a Storage lifecycle rule on the quarantine prefix is a planned follow-up.

Recommended follow-up:

- configure a lifecycle rule to delete objects under `profilePictures/quarantine/` after a short period (e.g. 1 day).

---

## Design Summary

The system follows a strict principle:

> Sensitive identifiers are never stored directly.  
> All persistent identifiers are either hashed or structurally isolated.  
> User-uploaded content is never publicly served before server-side validation.

Combined with RFC-compliant cryptography, server-side enforcement, and a quarantine-first upload model, this provides a layered defense model against:

- credential brute-force
- identifier enumeration
- distributed abuse attempts
- storage-level data leakage
- **public exposure of unvalidated or maliciously crafted uploads**

---

## Reviewer Notes

For profile images specifically, three properties are worth verifying in review:

1. **No read path to quarantine.** Storage Rules must have `allow read: if false` on `profilePictures/quarantine/{uid}/{uploadId}`.
2. **No client write to the public path.** Storage Rules must have `allow write: if false` on `profilePictures/{uid}/{fileName}`.
3. **Content type comes from bytes.** `validateProfileImage` must use the detected `mimeType` from `detectImageType`, not `object.contentType` from the event, when calling `finalFile.save()`.

These three properties are asserted by integration tests in `functions/tests/integration/validateProfileImage.integration.ts`.

# Threat Model

## Scope

This document describes the security-relevant threat model for:

- TOTP authentication system
- rate limiting subsystem
- authentication-related request handling
- concurrent execution behavior
- **profile image upload and validation pipeline**

It reflects the actual implemented system state.

---

## Assets

The system protects the following assets:

- User authentication (UID-bound identity)
- MFA TOTP validation flow
- Password reset flows
- Rate limit state integrity
- Anti-abuse enforcement mechanisms
- **User-uploaded profile images and their public URLs**
- **Integrity of the public storage surface (no malicious content served)**
- **Firestore user documents (photoURL integrity)**

---

## Threat Actors

The system assumes the following adversaries:

- unauthenticated external attackers
- automated bots attempting brute-force authentication
- distributed attackers using multiple IPs/devices
- concurrent request attackers exploiting race conditions
- partially compromised clients (device-level manipulation)
- **authenticated users attempting to upload non-image payloads**
- **authenticated users crafting malicious storage paths**
- **external parties attempting to open public image URLs in a browser**

---

## Primary Threats

### 1. Brute-force attacks on authentication endpoints

Attackers attempt repeated credential guessing or TOTP validation.

Mitigation:

- token bucket rate limiting
- exponential backoff
- per-context isolation (uid + ip + device + action)

---

### 2. Distributed rate-limit bypass attempts

Attackers rotate:

- IP addresses
- device identifiers
- request contexts

Mitigation:

- UID remains central binding factor
- independent buckets per context dimension
- Firestore transaction atomicity prevents fast exhaustion bypass

Residual risk:

- distributed low-rate attacks across multiple contexts

---

### 3. Concurrency / race-condition exploitation

Attackers attempt parallel requests to bypass token consumption.

Mitigation:

- Firestore transactions enforce atomic updates
- single-consumer token depletion guaranteed
- server-side state is authoritative

Verified via race-condition tests:

- no double token consumption
- no state corruption under concurrency
- no threshold bypass under parallel execution

---

### 4. Identifier exposure (IP / Device tracking)

Risk:

- exposure of raw IP or device identifiers in persistent storage

Mitigation:

- IP hashing via HMAC-SHA-256
- device ID hashing via HMAC-SHA-256
- no plaintext storage in Firestore paths

Security property:

- offline reconstruction of identifiers is not possible without secret key

---

### 5. Abuse of authentication retry logic

Attackers attempt repeated valid requests to exhaust system resources or probe state.

Mitigation:

- per-action rate limiting (not global)
- fail-closed enforcement on critical errors
- exponential backoff after threshold exhaustion

---

### 6. Partial system failure bypass

Risk:

- inconsistent state or bypass if Firestore or transaction layer fails

Mitigation:

- fail-closed behavior for rate limiter failures under normal operating conditions
- any unexpected error → request denied with `RateLimitError`

This prevents:

- silent bypass under degraded infrastructure
- inconsistent enforcement state

---

### 7. Spoofed content type on upload

Risk:

- an authenticated user uploads arbitrary bytes with `contentType: image/jpeg` and the server trusts the client-supplied header.

Mitigation:

- the client header is never used as a security signal.
- `validateProfileImage` derives the format from the actual file bytes (magic bytes) after download.
- the promoted object's `contentType` metadata is set from the detected format, not from the event.
- non-image payloads with a spoofed image content type (PDF, HTML, GIF, ZIP, plaintext) are rejected and the quarantine object is deleted.

Verified via integration tests:

- `should reject pdf even with image/jpeg content type`
- `should reject html even with image/jpeg content type`
- `should reject gif even with image/jpeg content type`
- `should reject zip even with image/jpeg content type`
- `should reject plaintext even with image/jpeg content type`

Residual risk:

- a polyglot file with valid JPEG magic bytes and arbitrary trailing content is promoted as JPEG. The final object's `Content-Type` is set to `image/jpeg`, so browsers do not interpret the trailing content as active content. No re-encoding (which would strip trailing data) is performed.

---

### 8. Stored XSS via public image URL

Risk:

- a malicious file is promoted to the public path and served with a content type that a browser interprets as executable content (HTML, SVG, script).

Mitigation:

- only three formats are accepted (JPEG, PNG, WebP), all with well-known magic bytes.
- the promoted object's `Content-Type` is set from the detected format, never from the client.
- the promoted object is written via the Admin SDK; clients cannot write to the public path.
- the quarantine prefix is non-readable, so no unvalidated content is ever served.

Residual risk:

- a successful attacker who could bypass magic-byte detection would need to craft a file that is both a valid JPEG/PNG/WebP and executable HTML with a `text/html` `Content-Type`. The `Content-Type` is fixed at promotion time, so this requires a bypass of the type-detection logic itself.

---

### 9. Path traversal in storage upload paths

Risk:

- a client crafts an object name with `..` or other reserved sequences in the UID segment, causing writes outside the intended prefix or malformed Firestore document references.

Mitigation:

- `validateProfileImage` validates the UID segment against `^[A-Za-z0-9_-]{1,128}$` before any Storage or Firestore access.
- invalid UID segments are rejected early; the quarantine object is deleted and no Firestore write occurs.
- the Storage Rules restrict the quarantine prefix to the authenticated owner's own UID, so no other user can write into another user's quarantine in the first place.

Verified via integration tests:

- `should reject path traversal in uid segment`

Residual risk:

- none observed at the current layer; Firestore additionally rejects malformed document IDs with `INVALID_ARGUMENT`, providing a defense-in-depth backstop.

---

### 10. Storage exhaustion via repeated uploads

Risk:

- an authenticated user repeatedly uploads files that fail validation, consuming bucket space and Function invocations.

Mitigation:

- size window (1 KB – 5 MiB) is enforced both in the Storage Rules (pre-filter) and in the Function.
- the quarantine object is deleted on every terminal path — success, invalid format, invalid size, invalid UID.
- validation happens before any Firestore write, so failed uploads leave no state in Firestore.

Residual risk:

- there is no per-user throttle on quarantine uploads at the image-quarantine layer. Rate-limiting for upload actions is provided by the abuse-prevention layer (see `rate-limiting.md`) and applies to actions that go through the callable-function path. A future enhancement could add an explicit counter for quarantine uploads and a Storage lifecycle rule for orphaned objects.

---

### 11. Pre-validation exposure of uploaded content

Risk:

- an uploaded file becomes publicly readable before the server has had a chance to inspect it, enabling an attacker to share a URL that serves malicious content for a brief window.

Mitigation:

- the quarantine prefix is marked `allow read: if false` in the Storage Rules. No principal — including the owner — can read objects under this prefix.
- the public prefix `profilePictures/{uid}/current.{ext}` is written only by the Cloud Function, never by clients.
- the promoted object's content is a copy of the validated bytes; there is no scenario in which unvalidated content reaches a publicly readable path.

---

### 12. Overwrite attacks on the quarantine object

Risk:

- after a trigger has fired but before the function completes, a client overwrites the quarantine object with different bytes, causing the promoted content to differ from the validated content.

Mitigation:

- the Storage Rules use `allow create` for the quarantine prefix, not `allow write`. Once an object exists at a given path, it cannot be overwritten.
- the quarantine path includes a client-generated UUID, so no legitimate upload collides with another.
- `allow update: if false` on the quarantine prefix.

---

## Security Controls

### Rate Limiting Layer

- token bucket algorithm
- continuous refill model
- exponential backoff lockout
- context-scoped buckets:

```
(useCase, ip, deviceId, action, uid)
```

- atomic Firestore transactions

---

### Cryptographic Protections

- HMAC-SHA-256 for identifier hashing
- Base64URL encoding
- secret-based keying (`RATE_LIMIT_HMAC_KEY`)

---

### Authentication Layer (TOTP)

- RFC 4226 HOTP
- RFC 6238 TOTP
- HMAC-SHA1 (RFC compliant)
- 30-second time step validation
- bounded window drift protection

---

### Image Quarantine Layer

- quarantine-first upload model (client-writable, non-readable prefix)
- server-side magic-byte inspection (JPEG, PNG, WebP)
- size window enforcement (1 KB – 5 MiB, both inclusive-boundary rejections)
- UID format validation (`^[A-Za-z0-9_-]{1,128}$`)
- promotion to a client-write-protected public path via the Admin SDK
- deterministic cache-busting via `?v=<storage generation>`
- cleanup of the quarantine object on every terminal path
- Storage Rules with `create`-only quarantine, `read: false`, and a catch-all deny

---

### Concurrency Model

- Firestore transactions as single source of truth
- no client-side state dependency
- deterministic state updates under load

---

## Trust Boundaries

### Trusted components

- Firebase Admin SDK (server environment)
- Firestore transaction engine
- server-side HMAC implementation
- Cloud Storage trigger delivery
- **magic-byte detection logic in `validateProfileImage`**

### Untrusted components

- client-provided deviceId
- client-provided IP headers (x-forwarded-for)
- network-layer request metadata
- external traffic patterns
- **client-provided `contentType` header on uploads**
- **client-provided object names**
- **the actual bytes of any uploaded file, until validated**
- **any browser opening a public image URL**

---

## Attack Surface

- authentication endpoints (highest risk)
- TOTP validation endpoints
- password reset endpoints
- rate limit bucket initialization paths
- **profile image quarantine upload endpoints (Storage Rules surface)**
- **Cloud Storage trigger for `profilePictures/quarantine/**`\*\*
- **public read surface at `profilePictures/{uid}/current.{ext}`**

---

## Residual Risks

Even with current mitigations:

- distributed attackers can rotate full context dimensions
- IP-based blocking is not strictly enforceable in NAT environments
- device identifiers can be spoofed by malicious clients
- brute-force resistance depends on correct use of rate limiter at all entry points
- **uploaded images retain EXIF metadata, including GPS coordinates when present. Stripping requires re-encoding and is out of scope for the current pipeline.**
- **polyglot files that carry both valid image magic bytes and arbitrary trailing content are promoted as-is. The `Content-Type` is fixed at promotion time, so browsers do not interpret trailing content as active content, but the file is not sanitized by re-encoding.**
- **orphaned quarantine objects can remain if the Cloud Function fails between download and cleanup. A Storage lifecycle rule for the quarantine prefix is a planned follow-up.**
- **there is no per-user throttle at the image-quarantine layer. Upload rate-limiting, where present, is provided by the abuse-prevention layer.**

---

## Verified Properties (via Tests)

### Unit-level guarantees

- correct token refill behavior
- correct exponential penalty calculation
- fail-closed behavior on transaction errors
- correct remaining attempt calculation

### Concurrency guarantees

- transactional single-consumer token enforcement under contention
- no observed race-condition bypass under concurrent execution
- no corruption of `failCount` or `blockedUntil`
- consistent exhaustion behavior under load

### Integration guarantees (validateProfileImage)

- valid JPEG is promoted and `photoURL` is written with a `?v=<generation>` cache-buster
- quarantine object is deleted on every terminal path (success, invalid format, invalid size, invalid UID)
- path traversal via UID segment is rejected before any I/O
- non-image payloads with a spoofed `image/jpeg` content type are rejected by magic-byte detection
- paths outside the quarantine prefix are ignored without side effects
- exact size boundaries (`1024` and `5 MiB`) are rejected; `1025` and `5 MiB − 1` are accepted

---

## Security Design Summary

The system implements a **context-scoped, transaction-safe abuse control model** with a **server-authoritative content-validation layer**.

Key properties:

- no global user lockout across devices
- strong isolation per request context
- stable enforcement under concurrent execution
- cryptographically protected identifiers
- strict fail-closed behavior for security-critical failures
- **uploaded content is validated against its bytes, not against client-declared metadata**
- **no path from client write to public read exists without server-side validation**

---

## Non-Goals

This threat model does NOT cover:

- physical device compromise
- malware on client systems
- social engineering attacks
- credential theft outside system scope
- Firebase infrastructure compromise
- **EXIF metadata leakage (documented as a residual risk, not mitigated)**
- **polyglot sanitization via re-encoding (documented as a residual risk, not mitigated)**

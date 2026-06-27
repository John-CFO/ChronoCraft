# Testing Strategy

This repository uses a multi-layered testing approach to validate business logic, security guarantees, and critical authentication flows before deployment.

The test suite is structured into:

- Unit Tests
- Integration Tests
- End-to-End / Trust Boundary Tests
- Race Condition Tests

---

# Unit Tests

## Authentication & Password Reset

- Full password reset flow:
  - Rate limit check
  - Firebase reset link generation
  - Email delivery

- Failure cases:
  - Email service failure
  - Rate limit rejection
  - Missing input (email)

---

## Auth Service

- Login and register flow including logging
- Validation of UID and action types

- TOTP verification:
  - Valid codes
  - Invalid formats
  - Unconfigured TOTP secrets
  - Rate limit integration
  - User-not-found cases

---

## Profile Service

- Profile updates (displayName, personalNumber)
- Input sanitization (XSS removal)
- UID validation:
  - undefined
  - null
  - empty
  - invalid format
- Empty update request handling
- Repository failure handling

---

## Project Service

- Project updates with valid ownership
- Input validation
- Hourly rate updates
- Repository failure handling

---

## Rate Limiting

- Token bucket behavior (refill / consumption)
- Blocking on limit exceedance
- Remaining attempts calculation
- Fail-closed behavior on DB/transaction errors

---

## Security Core (secureCore)

- Propagation of RateLimitError without masking

---

## Status Code Mapping

- Mapping domain responses to HTTP status codes:
  - RateLimit → 429
  - Firebase errors → HTTP status codes
  - Success/failure object handling

---

## Project & Work Validator (Routing Layer)

- Authentication checks
- Action routing:
  - updateProject
  - setHourlyRate
- Handling of missing or unknown actions

---

# TOTP & Cryptography

## Base32 Encoding

- Roundtrip encoding/decoding
- Support for lowercase, spaces, dashes
- Invalid character validation
- Valid secret generation
- Secret uniqueness

---

## HOTP (RFC4226)

- RFC compliance with official test vectors
- 6-digit OTP generation
- 8-digit OTP support
- Large counter value handling

---

## TOTP Window Logic

- Current window validation
- Forward drift acceptance
- Out-of-window rejection
- Boundary edge cases

---

## Encryption (AES-256-GCM)

- Encrypt/decrypt roundtrip
- Auth tag tampering detection
- Invalid key handling

---

# End-to-End / Trust Boundary Tests

## Firestore Trust Boundaries

- Access restricted to authenticated user-owned documents
- Firebase Auth context enforcement

---

## Cloud Storage Trust Boundaries

- Profile image upload by owner only
- Profile image overwrite by owner only
- Access to foreign images blocked
- Minimum file size enforcement
- Maximum file size enforcement
- Allowed image format validation

---

## Authentication Boundaries

- Callable function-based login/register
- Rejection of malformed JWT tokens
- Protection of all private endpoints without authentication
- Idempotent login/register flows
- Correct authenticated state initialization

---

## Authorization Boundaries

- Cross-user access prevention:
  - profile data
  - projects
- Protection against ProjectId injection
- Server-side identity enforcement (no client-controlled userId)
- Cross-user mutation prevention

---

## Input Validation Boundaries

- Required parameter validation
- Payload type validation
- Oversized payload rejection
- Data structure validation
- File size constraints
- MIME type validation

---

## Push Token Boundaries

- Authenticated-only storage
- Token format validation
- Idempotent registration
- Rejection without authentication

---

## TOTP End-to-End Flow

- Enrollment via callable function
- Secret never exposed (only otpAuthUrl)
- Token verification
- enrollmentId binding to user
- Replay protection
- Invalid enrollmentId rejection
- Login only after enrollment completion

---

## Error Handling Consistency

- Unified error format across all functions
- Firebase error mapping consistency
- Structured validation errors

---

## Rate Limit Boundaries (E2E)

- Concurrent request handling
- System stability under load
- Optional 429 enforcement via environment flag

---

# Integration Tests

Integration tests validate interactions between services and external systems:

- Firestore Emulator
- Firebase Auth
- Cloud Storage

---

## Firestore Repository Layer

### Project Repository

- Firestore Emulator connectivity
- Project creation and updates
- ProjectNotFoundError handling
- Data persistence verification
- Ownership-based earnings writes
- Cleanup of outdated earnings documents

---

### User Repository

- Firestore Emulator connectivity
- User retrieval:
  - successful retrieval
  - NotFoundError handling
- User update operations:
  - persistent field updates
  - verification in Firestore

---

## User Data Deletion Flow

- Cross-system deletion:
  - Firebase Auth user removal
  - Firestore document deletion
  - MFA / TOTP removal
  - Rate limit data cleanup
  - Cloud Storage asset deletion

- Post-deletion verification (no remaining resources)

---

## Password Reset Flow (Integration)

- End-to-end service chain:
  - Firebase password reset link generation
  - Email delivery

- Failure cases:
  - invalid email input

- Validation without mock isolation

---

## Secure Function Wrapper

- Authenticated execution:
  - valid auth context required
  - UID passed to business logic

- Unauthenticated execution:
  - blocked access
  - exception thrown

- Central security boundary validation

---

## Integration Test Scope

- Firestore Emulator integration
- Firebase Auth integration
- Cloud Storage integration
- Service ↔ repository communication
- Cross-system consistency validation
- Security wrapper enforcement

---

# Race Condition Tests

Race condition tests validate system behavior under concurrency, timing issues, and TOCTOU conditions.

All tests run against emulators with controlled parallel execution.

---

## Auth Flow Concurrency

### Register vs Register

- Parallel user creation
- Expected: idempotent behavior
- No duplicates

### Login vs Login

- Parallel login requests
- Expected: no side effects

### Login vs Register (Mixed)

- Mixed concurrent auth operations
- Expected: consistent final state

### Register on existing user

- Concurrent register calls
- Expected: idempotent behavior

---

## Profile Service Concurrency

- Concurrent updates to `displayName` and `personalNumber`
- Partial updates mixed with invalid payloads

Expected:

- no corrupted states
- only valid data persisted
- no lost fields

---

## Project Service Concurrency

- Parallel project updates
- Mixed field updates
- Deletions during writes

Expected:

- consistent final state
- no partial corruption
- no orphaned documents

---

## Rate Limit Concurrency

### Token Consumption Race

- No double consumption

### Block State Consistency

- No bypass under load

### State Integrity

- No broken counters or flags

---

## TOTP Concurrency

- Replay protection enforced
- OTP reuse blocked
- No bypass under combined rate-limit scenarios

---

## Delete User Data Concurrency

### Parallel Deletes

- Idempotent deletion guaranteed

### TOCTOU Scenarios

- No resurrection of deleted data

### Cross-System Consistency

- Full cleanup across all systems

---

## General Principles

- Emulator-based execution
- Real concurrency simulation
- Deterministic correctness under load
- Only controlled failures allowed (rate limits, replay protection)

---

## Test Classification

Chaos testing is intentionally excluded.

Reason:
No financial flows, no asset transfers, no external systemic risk.

Focus areas:

- deterministic correctness
- concurrency safety
- security enforcement
- idempotent operations

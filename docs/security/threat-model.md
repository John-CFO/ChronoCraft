# Threat Model

## Scope

This document describes the security-relevant threat model for:

- TOTP authentication system
- rate limiting subsystem
- authentication-related request handling
- concurrent execution behavior

It reflects the actual implemented system state.

---

## Assets

The system protects the following assets:

- User authentication (UID-bound identity)
- MFA TOTP validation flow
- Password reset flows
- Rate limit state integrity
- Anti-abuse enforcement mechanisms

---

## Threat Actors

The system assumes the following adversaries:

- unauthenticated external attackers
- automated bots attempting brute-force authentication
- distributed attackers using multiple IPs/devices
- concurrent request attackers exploiting race conditions
- partially compromised clients (device-level manipulation)

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

- fail-closed design for rate limiter
- any unexpected error → request denied with `RateLimitError`

This prevents:

- silent bypass under degraded infrastructure
- inconsistent enforcement state

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

### Untrusted components

- client-provided deviceId
- client-provided IP headers (x-forwarded-for)
- network-layer request metadata
- external traffic patterns

---

## Attack Surface

- authentication endpoints (highest risk)
- TOTP validation endpoints
- password reset endpoints
- rate limit bucket initialization paths

---

## Residual Risks

Even with current mitigations:

- distributed attackers can rotate full context dimensions
- IP-based blocking is not strictly enforceable in NAT environments
- device identifiers can be spoofed by malicious clients
- brute-force resistance depends on correct use of rate limiter at all entry points

---

## Verified Properties (via Tests)

### Unit-level guarantees

- correct token refill behavior
- correct exponential penalty calculation
- fail-closed behavior on transaction errors
- correct remaining attempt calculation

### Concurrency guarantees

- single-consumer token enforcement
- no race-condition bypass under parallel execution
- no corruption of `failCount` or `blockedUntil`
- deterministic exhaustion behavior under load

---

## Security Design Summary

The system implements a **context-scoped, transaction-safe abuse control model**.

Key properties:

- no global user lockout across devices
- strong isolation per request context
- deterministic enforcement under concurrency
- cryptographically protected identifiers
- strict fail-closed behavior for security-critical failures

---

## Non-Goals

This threat model does NOT cover:

- physical device compromise
- malware on client systems
- social engineering attacks
- credential theft outside system scope
- Firebase infrastructure compromise

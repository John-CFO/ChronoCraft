# Rate Limiting System

## Overview

This system implements a server-side rate limiter based on a **token bucket algorithm with exponential backoff**.

It is used to protect security-critical operations:

- MFA TOTP login
- MFA TOTP enrollment
- Password reset
- other sensitive authentication flows

All enforcement is performed **server-side using Firestore transactions** via Firebase Admin SDK.

No client-side trust is assumed.

---

## Core Design Principle

Rate limiting is **context-bound, not globally user-bound**.

A rate limit bucket is scoped by:

```
(useCase, ip, deviceId, action, uid)
```

This means:

- same user on different device → separate bucket
- same user on different IP → separate bucket
- same action but different context → separate bucket

### Rationale (intentional design choice)

This design prioritizes:

- usability (no global lockouts across devices)
- reduced false positives
- isolation of abuse per execution context

Trade-off:

- distributed attackers can rotate context dimensions (mitigated via UID + auth layer + additional security controls)

---

## Storage Model (Firestore)

Rate limit state is stored under:

```
security/
└── rateLimits/
    └── {useCase}/
        └── {ipHash}/
            └── {deviceHash}/
                └── action/
                    └── {action}/
                        └── {uid}
```

Each document represents a single token bucket instance.

---

## Identifier Protection

IP and device identifiers are never stored in plaintext.

They are transformed using:

- HMAC-SHA-256
- base64url encoding
- secret: `RATE_LIMIT_HMAC_KEY`

Implementation:

```ts
Crypto.createHmac("sha256", secret).update(id, "utf8").digest("base64url");
```

### Properties

- deterministic lookup
- no raw identifier leakage in Firestore paths
- resistance to offline precomputation without secret

UID is stored as document ID because it is server-issued and not exposed via client-controlled Firestore paths.

---

## Algorithm

The system uses a **token bucket with continuous refill**.

```
refillRatePerMs = capacity / windowMs
```

Each request:

1. refill tokens based on elapsed time
2. consume 1 token
3. update bucket state atomically (transaction)

---

## State Fields

Each bucket document contains:

- `tokens`
- `capacity`
- `refillRatePerMs`
- `lastRefill`
- `resetAt`
- `failCount`
- `blockedUntil`

---

## Exponential Backoff

If no tokens are available:

```
penalty = BASE_PENALTY_MS × 2^n
```

Where:

- BASE_PENALTY_MS = 60_000
- MAX exponent = 6
- max penalty ≈ 64 minutes

Lock is enforced via:

```
blockedUntil
```

---

## Transaction Safety

All updates are executed inside Firestore transactions:

- provides atomic read-modify-write semantics
- reduces race-condition windows
- ensures consistent state updates under contention
- may retry under high concurrency (Firestore behavior)

---

## Failure Behavior

### Normal failures (transaction / storage errors)

→ treated as **security failure**

→ request is denied with `RateLimitError`

This is a **fail-closed design**.

Rationale:

- prevents bypass of security controls under partial system failure
- avoids unsafe fallback behavior

---

## Concurrency Guarantees (Tested)

The implementation is validated under concurrent load.

### Verified properties:

- rate limit enforcement occurs under concurrency
- system prevents uncontrolled bypass of limits
- state updates remain consistent under transactional execution
- behavior is stable under race conditions, but not strictly linearizable

---

## Remaining Attempts Calculation

The system can compute remaining tokens based on:

- stored state
- refill rate
- elapsed time
- capacity

Blocked states override remaining attempts → return 0.

---

## Logging

Security-relevant events:

- `ratelimit-blocked`
- `ratelimit-throttled`
- `ratelimit-error`

Used for:

- abuse detection
- system monitoring
- debugging concurrency issues

---

## Security Properties

This system provides:

- server-enforced rate limiting
- transactional state updates
- practical resistance against race-condition bypass
- context-scoped abuse mitigation
- cryptographically protected identifiers (IP/device)

---

## Explicit Non-Goals

This module does NOT handle:

- authentication itself
- credential validation logic
- session management
- global user lockouts across all devices
- identity verification outside request context

---

## Architectural Implication

This is not a global rate limiter.

It is a **contextual abuse control system**.

That distinction is intentional and affects:

- UX (no cross-device lockouts)
- security model (distributed buckets per context)
- attacker model (requires multi-dimensional abuse instead of single UID targeting)

---

## Verified via Tests

Coverage includes:

### Unit tests

- token refill correctness
- penalty calculation
- fail-closed behavior
- remaining attempt calculation

### Race tests

- concurrent token depletion safety
- prevention of threshold bypass
- state consistency under parallel load

---

## Summary

A deterministic, transaction-safe, context-scoped rate limiting system designed to:

- prevent brute-force attacks
- survive concurrent execution
- avoid global user lockouts
- enforce security-critical endpoints reliably

# TOTP Core Security Design

## Cryptographic Foundation

- Implements HOTP (RFC 4226)
- Implements TOTP (RFC 6238)
- HMAC-SHA1 (RFC-compliant, not arbitrary choice)
- 30-second time window
- Dynamic truncation correctly implemented
- MSB masking (`& 0x7fffffff`) to avoid signed integer issues

---

## Secret Handling

- Secret: 20 bytes cryptographically secure random (`crypto.randomBytes`)
- Base32 encoded (RFC 4648 compatible)
- No logical binding to UID
- Binding enforced only via Firestore structure + rules

### Decoding behavior

- Strict validation of invalid characters
- Detects corrupted padding / trailing bits
- Allows padding, ignores whitespace
- Prevents silent corruption

---

## Replay & Drift Protection

- Window-based validation
- `window = 1` → ±30 seconds tolerance
- `window = 0` → strict single-slot validation
- No unbounded drift allowed

---

## Implementation Security

- Counter stored as 64-bit Big Endian
- No string-based HMAC inputs
- No implicit type coercion
- No external OTP libraries (supply-chain risk reduced)

---

## Explicit Non-Goals

This module does NOT handle:

- Secret leakage protection (handled elsewhere)
- Rate limiting (separate system)
- Brute-force protection (handled in auth flow)
- Constant-time comparison (can be added later)

---

## System Integration

When combined with:

- AES-GCM encrypted secrets
- Firestore security rules
- Dedicated `mfa_totp` store
- Rate limiting layer

→ the system is architecturally secure and production-grade

# Security CI Pipeline

## Overview

The Security CI pipeline validates security-critical parts of the application on every pull request targeting `master`.

The pipeline is separated into independent security domains:

- Backend / Firebase Functions
- Expo Client Application
- Firebase Security Rules
- Dependency and secret security scanning

The goal is to detect security regressions before changes are merged.

---

## Pipeline Components

### Functions Security

The backend security workflow validates Firebase Functions through static checks and automated tests.

Checks:

- TypeScript compilation validation
- ESLint validation
- Unit tests
- Integration tests using Firebase Emulators
- End-to-end tests using Firebase Emulators
- Race condition tests for concurrency-sensitive security flows

Covered security areas include:

- Authentication handling
- Authorization boundaries
- TOTP verification flows
- Rate limiting
- Firestore access patterns
- Concurrent request handling

---

### Expo App Security

The client application is validated independently.

Checks:

- TypeScript compilation
- ESLint validation

The client pipeline ensures frontend changes do not introduce type or quality regressions.

---

### Firebase Rules Security

Firebase security rules are validated separately.

Checks:

- Firestore Rules deployment validation
- Storage Rules deployment validation

The validation uses Firebase CLI dry-run deployment to detect invalid or unsafe rule changes before production deployment.

---

### Dependency Security

Dependency and secret scanning is performed globally.

Checks:

- npm audit vulnerability scanning
- Critical vulnerability enforcement
- Gitleaks secret scanning
- Semgrep OWASP Top Ten rules

The goal is early detection of:

- vulnerable dependencies
- accidentally committed secrets
- common security anti-patterns

---

## Required CI Secrets

The pipeline requires the following GitHub Actions secrets:

| Secret                   | Purpose                   |
| ------------------------ | ------------------------- |
| FIREBASE_SERVICE_ACCOUNT | Firebase Rules validation |

No production secrets are used during CI execution.

---

## CI Test Configuration

The pipeline uses dedicated non-production test values for automated validation.

Examples:

| Variable            | Purpose                          |
| ------------------- | -------------------------------- |
| RATE_LIMIT_HMAC_KEY | Test environment rate limiting   |
| TOTP_ENCRYPTION_KEY | Test environment TOTP encryption |

These values are only used for emulator-based testing and are not production credentials.

---

## Local Validation

The following commands should pass before creating a pull request:

```bash
\functions
npm run test:unit
npm run test:integration
npm run test:e2e
npm run test:race
```

---

## CI Design Decisions

### Separate Emulator Lifecycles

Integration, E2E, and race condition tests run in isolated Firebase Emulator lifecycles.

This prevents:

- Shared state between test suites
- Hidden dependencies between tests
- Flaky security tests caused by emulator reuse

---

### Explicit Test Configuration

CI tests do not rely on developer-local environment configuration.

Required test values are injected explicitly through CI environment variables.

This ensures:

- Reproducible test execution
- Consistent behavior across environments
- No dependency on local secrets or developer-specific configuration

---

### Security as a Merge Gate

Pull requests cannot be merged successfully unless all security validation steps pass.

The CI pipeline acts as a security gate by validating:

- Automated security tests
- Application behavior
- Firebase security rules
- Dependency vulnerabilities
- Secret exposure risks

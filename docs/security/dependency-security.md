# Dependency Security Decisions

## Accepted Risks

### shell-quote vulnerability

**Package:** shell-quote@1.8.4  
**Severity:** High  
**CVE/Advisory:** GHSA-395f-4hp3-45gv

**Source:**

Transitive dependency introduced by React Native CLI tooling.

Dependency chain:

```text
react-native@0.73.6
└── @react-native-community/cli@12.3.6
    └── @react-native-community/cli-tools@12.3.6
        └── shell-quote@1.8.4
```

**Risk assessment:**

The vulnerable package is part of the React Native CLI build tooling and is not included in the production application runtime bundle.

The vulnerability affects shell-quote parsing functionality and requires execution within the CLI tooling context. No direct application input reaches this dependency during normal application operation.

**Decision:**

Risk accepted temporarily.

Upgrading this dependency requires a React Native framework upgrade outside the currently pinned version range. The upgrade is deferred until the next planned React Native upgrade cycle to avoid introducing unnecessary framework changes.

**Mitigation:**

- Dependency is monitored through `npm audit`.
- Production builds continue using locked dependency versions.
- Dependency upgrade will be evaluated during future React Native maintenance updates.

**Review status:** Accepted  
**Review trigger:** Next React Native upgrade

---

### uuid vulnerability

**Package:** uuid@9.0.1  
**Severity:** Moderate  
**CVE/Advisory:** GHSA-w5hq-g745-h8pq

**Source:**

Transitive dependency introduced by Firebase Admin / Google Cloud SDK dependencies.

Dependency chain:

```text
firebase-admin@13.10.0
└── @google-cloud/firestore@7.11.6
    └── google-gax@4.6.1
        └── uuid@9.0.1
```

Additional dependency path:

```text
firebase-admin@13.10.0
└── @google-cloud/storage@7.21.0
    └── gaxios@6.7.1
        └── uuid@9.0.1
```

**Risk assessment:**

The vulnerable dependency is introduced indirectly through Firebase Admin and Google Cloud SDK packages.

No direct usage of the vulnerable uuid functionality exists in application code.

The available automatic fix requires upgrading `firebase-admin` to a new major version, which may introduce breaking changes.

**Decision:**

Risk accepted temporarily.

The dependency update is deferred until a planned Firebase Admin SDK upgrade cycle.

**Mitigation:**

- Dependency is monitored through `npm audit`.
- Firebase Admin upgrades are evaluated separately to avoid mixing security maintenance with framework migrations.
- Production dependency changes are reviewed before adoption.

**Review status:** Accepted  
**Review trigger:** Next Firebase Admin SDK upgrade

---

### postcss vulnerability

**Package:** postcss@8.5.15  
**Severity:** High  
**CVE/Advisory:** GHSA-r28c-9q8g-f849

**Source:**

Development dependency introduced by Vitest/Vite tooling in emulator tests.

Dependency chain:

```text
vitest@4.1.9
└── vite@8.0.16
    └── postcss@8.5.15
```

**Risk assessment:**

The vulnerable package is only used within the emulator test development environment.

It is not included in:

- production application builds
- Firebase Functions runtime
- deployed backend code

**Decision:**

Risk accepted temporarily.

The dependency is part of the test tooling stack and does not affect production runtime security.

**Mitigation:**

- Development dependencies are monitored through `npm audit`.
- Dependency upgrades are evaluated during test tooling updates.
- Production dependency audits are separated from development tooling findings.

**Review status:** Accepted  
**Review trigger:** Next Vitest/Vite tooling upgrade

---

## Resolved Issues

### protobufjs vulnerability

**Package:** protobufjs@7.6.5  
**Severity:** Moderate  
**CVE/Advisory:** GHSA-j3f2-48v5-ccww

**Resolution:**

Updated transitive dependency versions through dependency updates and package lock refresh.

Affected dependency trees:

- Root application dependencies
- emulator-tests dependencies

Current resolved version:

```text
protobufjs@7.6.5
```

**Status:** Resolved

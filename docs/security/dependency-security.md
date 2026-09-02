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

### brace-expansion vulnerability

**Package:** brace-expansion@1.1.15  
**Severity:** High

**Source:**

Development dependency introduced by ESLint tooling.

Dependency chain:

```text
eslint@8.57.0
└── @eslint/eslintrc@2.1.4
    └── minimatch@3.1.5
        └── brace-expansion@1.1.15
```

Additional dependency path:

```text
ts-jest@29.4.11
└── jest@30.4.2
    └── glob@10.5.0
        └── minimatch@9.0.9
            └── brace-expansion@2.1.1
```

**Risk assessment:**

The vulnerable package is only used by development tooling.

It is not included in:

- Production application builds
- Firebase Functions runtime
- Deployed backend code

The vulnerable functionality requires processing crafted brace patterns through minimatch / brace-expansion.

No untrusted user-controlled input reaches this dependency during application runtime.

**Decision:**

Risk accepted temporarily.

The dependency will be reviewed during the next ESLint/Jest tooling upgrade cycle.

**Mitigation:**

- Dependency is monitored through `npm audit`.
- Development dependency upgrades are evaluated during tooling maintenance updates.
- Production dependency audits are separated from development tooling findings.

**Review status:** Accepted  
**Review trigger:** Next ESLint/Jest tooling upgrade

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
- Functions dependencies
- emulator-tests dependencies

Current resolved version:

```text
protobufjs@7.6.5
```

**Status:** Resolved

---

### postcss vulnerability

**Package:** postcss@8.5.18  
**Severity:** High  
**CVE/Advisory:** GHSA-r28c-9q8g-f849

**Resolution:**

Updated transitive dependency through dependency update.

**Affected dependency tree:**

```text
vitest@4.1.9
└── vite@8.0.16
    └── postcss@8.5.18
```

**Previous vulnerable version:**

```text
postcss@8.5.15
```

**Current resolved version:**

```text
postcss@8.5.18
```

**Status:** Resolved

---

### tar vulnerability

**Package:** tar@6.2.1

**Severity:** Critical

**CVE/Advisories:**

- GHSA-34x7-hfp2-rc4v
- GHSA-8qq5-rm4j-mr97
- GHSA-83g3-92jg-28cx
- GHSA-qffp-2rhf-9h96
- GHSA-9ppj-qmqm-q256
- GHSA-r6q2-hw4h-h46w
- GHSA-vmf3-w455-68vh
- GHSA-w8wr-v893-vjvp
- GHSA-23hp-3jrh-7fpw
- GHSA-8x88-c5mf-7j5w
- GHSA-gvwx-54wh-qm9j
- GHSA-r292-9mhp-454m

**Source:**

Transitive dependency introduced by the Expo CLI dependency tree.

Dependency chain:

    expo@50.0.21
    └── @expo/cli@0.17.13
        └── tar@6.2.1

**Risk assessment:**

The vulnerable `tar` package is a transitive dependency of the Expo CLI and is required by the currently pinned Expo 50 dependency tree.

The dependency is used by Expo build tooling rather than application business logic. The affected functionality is related to archive extraction and processing within the build tooling context.

The available automatic remediation requires upgrading Expo to a newer major version. `npm audit fix --force` currently proposes an upgrade to Expo 57, which represents a breaking framework upgrade and is outside the scope of the current dependency maintenance change.

No direct application usage of the vulnerable `tar` functionality exists.

**Decision:**

Risk accepted temporarily.

The current Expo 50 dependency tree remains pinned to avoid introducing an unplanned framework migration solely to resolve a transitive build-tooling dependency.

The production dependency security CI check explicitly allows the currently identified `tar` advisories while continuing to fail on other unapproved critical production vulnerabilities.

**Mitigation:**

- Dependency is monitored through `npm audit`.
- The accepted advisories are explicitly allowlisted in the production dependency security CI check.
- The CI check continues to fail for critical vulnerabilities outside the documented `tar` exception.
- Production builds continue using locked dependency versions.
- The dependency will be reevaluated during the next planned Expo upgrade.

**Review status:** Accepted

**Review trigger:** Next Expo upgrade

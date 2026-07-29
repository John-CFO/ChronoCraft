# Dependency Security Decisions

## Accepted Risks

### shell-quote vulnerability

**Package:** shell-quote@1.8.4  
**Severity:** High  
**CVE/Advisory:** GHSA-395f-4hp3-45gv

**Source:**
Transitive dependency introduced by React Native CLI tooling.

Dependency chain:

react-native@0.73.6
└── @react-native-community/cli@12.3.6
└── @react-native-community/cli-tools@12.3.6
└── shell-quote@1.8.4

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

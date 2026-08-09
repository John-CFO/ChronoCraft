# Reviewer Whitelist

## Purpose

The reviewer whitelist restricts user registration to explicitly approved email addresses.

The feature is intended to prevent uncontrolled registration of users for the portfolio application. This limits the number of accounts that can be created and therefore reduces the risk of unnecessary Firebase Authentication and backend usage costs.

The whitelist controls **registration only**. It is not an account access-control mechanism.

## Registration Flow

A Firebase Authentication `beforeCreate` blocking function validates the email address before Firebase creates the user account.

The validation performs the following checks:

1. An email address must be provided.
2. The email address is normalized by trimming surrounding whitespace and converting it to lowercase.
3. The corresponding whitelist document must exist.
4. The whitelist document must contain `active: true`.
5. If any of these checks fail, registration is rejected.

The registration is therefore only permitted when the normalized email address exists in the whitelist and is explicitly active.

## Firestore Structure

The whitelist is stored under:

```text
/auth/reviewers/reviewers/{email}
```

Example:

```text
auth
└── reviewers
    └── reviewers
        └── john_schraps@web.de
            ├── active: true
            └── email: "john_schraps@web.de"
```

The document ID is the normalized email address.

The `active` field is a boolean and must contain the boolean value `true`.

For example:

```text
active: true
```

is valid, while:

```text
active: "true"
```

is not valid.

This distinction is important because the registration validation explicitly checks:

```ts
data?.active !== true;
```

## Email Normalization

Before accessing the whitelist, the supplied email address is normalized:

```ts
const normalizedEmail = email?.trim().toLowerCase();
```

This ensures that variations such as:

```text
REVIEWER@EXAMPLE.COM
 reviewer@example.com
```

are evaluated against the same normalized whitelist document:

```text
reviewer@example.com
```

## Blocking Behavior

If the email is missing, unknown, or associated with an inactive whitelist entry, the `beforeCreate` function rejects the registration with:

```text
Registration is not allowed
```

The user account is not created.

The validation deliberately does not perform a login check.

## Important Security Boundary

Setting:

```text
active: false
```

does not disable an already existing account.

The whitelist controls whether an account may be created. It does not determine whether an existing account may authenticate.

This behavior is intentional.

If an already registered user is changed from:

```text
active: true
```

to:

```text
active: false
```

the user can still log in.

To disable an existing account, a separate account-management or authentication-control mechanism would be required. Such functionality is outside the scope of this whitelist feature.

## Security Rationale

The whitelist provides a server-side registration boundary.

The client application does not decide whether a user is allowed to register. The decision is enforced by Firebase Authentication before the account is created.

This prevents a modified or unauthorized client from bypassing a client-side registration restriction.

The feature primarily protects against:

- uncontrolled account creation
- unwanted users registering for the portfolio application
- unnecessary Firebase Authentication usage
- unnecessary backend resource consumption and associated costs

The whitelist is therefore a registration-control mechanism, not a general authorization mechanism.

## Tests

Unit tests cover the core whitelist validation behavior:

- inactive reviewer is rejected
- unknown email is rejected
- uppercase email is normalized
- surrounding whitespace is removed before lookup

The validation logic is tested independently from the Firebase Authentication trigger.

The `beforeCreate` trigger delegates the email validation to the reusable validation function.

## Live Verification

The blocking function was also tested against the deployed Firebase Authentication environment.

The live tests verified that:

- an email that is not present in the whitelist is rejected
- an inactive whitelist entry is rejected
- an active whitelist entry is accepted
- email normalization works during the registration flow
- the `beforeCreate` blocking function is executed before account creation

During live testing, the whitelist document structure and field types were also verified.

In particular, `active` must be stored as a Firestore boolean:

```text
active: true
```

rather than as the string:

```text
active: "true"
```

## Scope

This feature intentionally covers only registration control.

It does not provide:

- login blocking for existing users
- account suspension
- authorization for application resources
- role-based access control
- user deletion

Those concerns belong to separate authentication and authorization mechanisms.

# @sawala/akuna-react

## 0.3.0

### Minor Changes

- 1f9aa82: Add Clerk Organizations support: re-export `OrganizationSwitcher`, `OrganizationProfile`, and `CreateOrganization`, and add `useMemberOrganization()` / `useMemberOrganizationList()` hooks (Akuna-named wrappers over Clerk's organization hooks). The connection's `config.organizationsEnabled` (from `useMembershipConfig()`) tells you whether to render organization UI.

## 0.2.0

### Minor Changes

- 932ac67: Initial release of `@sawala/akuna-react` — a drop-in membership package. `<MembershipProvider apiKey>` boots Clerk for the customer's site from a Sawala project API key (fetching the connection's public config from the gateway), re-exports Clerk's `SignIn`/`SignUp`/`UserButton`/`SignedIn`/`SignedOut`, and adds a `useMember()` hook returning the normalized current member. No customer backend required.

## 0.1.0

Initial release. `<MembershipProvider apiKey>` boots Clerk from a Sawala
project API key (fetching the connection's public config from the gateway),
re-exports Clerk's `SignIn` / `SignUp` / `UserButton` / `SignedIn` / `SignedOut`,
and adds a `useMember()` hook returning the normalized current member.

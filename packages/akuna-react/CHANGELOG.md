# @sawala/akuna-react

## 0.4.0

### Minor Changes

- baabfca: Managed "Sign in with Sawala" mode. The package now branches on the `mode`
  returned by the platform's boot config, so the SAME JSX serves both membership
  models:
  - New mode-aware components: `<AkunaSignIn>` (managed: "Sign in with Sawala"
    redirect button; BYO: Clerk's `<SignIn>` via `byoProps`), `<AkunaUserButton>`
    (managed: avatar menu with Manage account — opens the Sawala account page in a new
    tab, state refreshes on close — and Sign out; BYO: Clerk's `<UserButton>`), and
    package-owned `<SignedIn>`/`<SignedOut>` gates that work in both modes.
  - `useMember()` is unified across modes and now also returns `signIn`/`signOut`.
  - Managed session engine: CSRF-checked redirect flow, single-use code exchange,
    short-lived member token in namespaced localStorage, `/auth/me` membership.
  - Fixes a crash where a managed project's config (no Clerk publishable key) was
    passed to `<ClerkProvider>`.
  - `UserProfile` added to the BYO Clerk re-exports. Organization hooks now throw
    a descriptive error in managed mode (BYO-only until Akuna-native groups ship).

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

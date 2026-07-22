---
"@sawala/akuna-react": minor
---

Managed "Sign in with Sawala" mode. The package now branches on the `mode`
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

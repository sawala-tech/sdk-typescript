# @sawala/akuna-react

## 0.1.0

Initial release. `<MembershipProvider apiKey>` boots Clerk from a Sawala
project API key (fetching the connection's public config from the gateway),
re-exports Clerk's `SignIn` / `SignUp` / `UserButton` / `SignedIn` / `SignedOut`,
and adds a `useMember()` hook returning the normalized current member.

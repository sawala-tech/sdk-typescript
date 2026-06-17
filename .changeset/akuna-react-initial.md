---
"@sawala/akuna-react": minor
---

Initial release of `@sawala/akuna-react` — a drop-in membership package. `<MembershipProvider apiKey>` boots Clerk for the customer's site from a Sawala project API key (fetching the connection's public config from the gateway), re-exports Clerk's `SignIn`/`SignUp`/`UserButton`/`SignedIn`/`SignedOut`, and adds a `useMember()` hook returning the normalized current member. No customer backend required.

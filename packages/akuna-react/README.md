# @sawala/akuna-react

Drop-in **membership UI** for your website. Bring your own Clerk application,
add `<MembershipProvider>` + Clerk's sign-up/sign-in components with **one Sawala
project API key**, and every member who registers is mirrored into a Sawala
member directory — **no backend to write or host**.

The customer never hardcodes a Clerk key in their site. `<MembershipProvider>`
fetches the connection's public config (publishable key + appearance) from the
Sawala gateway using only the API key, then boots Clerk.

## Install

    npm install @sawala/akuna-react @clerk/clerk-react react react-dom

`@clerk/clerk-react`, `react`, and `react-dom` are peer dependencies.

## Usage

    import {
      MembershipProvider,
      SignedIn,
      SignedOut,
      SignIn,
      UserButton,
      useMember,
    } from '@sawala/akuna-react'

    export default function App() {
      return (
        <MembershipProvider apiKey="pk_live_…">
          <SignedOut>
            <SignIn routing="hash" />
          </SignedOut>
          <SignedIn>
            <UserButton />
            <Profile />
          </SignedIn>
        </MembershipProvider>
      )
    }

    function Profile() {
      const { member, isLoaded } = useMember()
      if (!isLoaded) return null
      return <p>Signed in as {member?.email}</p>
    }

`apiKey` is a Sawala **project-scoped public key** (`pk_live_…` / `pk_test_…`)
scoped for the `akuna` product — mint it in the Sawala dashboard under
Settings → API keys.

### Options

`<MembershipProvider>` props:

- `apiKey` (required) — the Sawala project API key.
- `baseUrl` — override the gateway base. Defaults to
  `https://api.sawala.cloud/public/akuna`.
- `loadingFallback` — rendered while the config is fetched.
- `errorFallback` — `(error) => ReactNode`, rendered if the config fetch fails.

### Exports

`MembershipProvider`, `useMembershipConfig`, `useMember`, and the re-exported
Clerk components `SignIn`, `SignUp`, `UserButton`, `SignedIn`, `SignedOut`,
`RedirectToSignIn`.

## Example

See `example/` for a minimal Vite app that mounts `<MembershipProvider>` +
`<SignUp>` and completes a real registration against a Clerk dev instance using
only an API key.

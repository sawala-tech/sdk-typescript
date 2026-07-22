# @sawala/akuna-react

Drop-in **membership UI** for your website with **one Sawala project API key**
and **no backend to write or host**. The same JSX works for both membership
modes — the package detects the mode at runtime:

- **Managed — "Sign in with Sawala"** (zero config): Sawala hosts identity.
  Your page shows a "Sign in with Sawala" button; visitors sign in on
  `akuna.sawala.cloud` and return as members. **No Clerk account, no Clerk
  keys, nothing to configure.**
- **BYO Clerk** (advanced): connect your own Clerk application in the Sawala
  dashboard and the same components render *your* branded Clerk UI instead.

Switching a project between modes requires **no frontend change**.

## Install

    npm install @sawala/akuna-react @clerk/clerk-react react react-dom

`@clerk/clerk-react`, `react`, and `react-dom` are peer dependencies (Clerk
code only runs in BYO mode, but the import must resolve).

## Usage — identical for both modes

    import {
      MembershipProvider,
      SignedIn,
      SignedOut,
      AkunaSignIn,
      AkunaUserButton,
      useMember,
    } from '@sawala/akuna-react'

    export default function App() {
      return (
        <MembershipProvider apiKey="pk_live_…">
          <SignedOut>
            <AkunaSignIn />
          </SignedOut>
          <SignedIn>
            <AkunaUserButton />
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
Settings → API keys. For managed mode, also add your page URL to the
connection's **allowed redirect URIs** and the key's **allowed origins**
(origins have no trailing slash: `https://mysite.com`, not `https://mysite.com/`).

### What each component renders

| Export | Managed | BYO |
|---|---|---|
| `<AkunaSignIn>` | "Sign in with Sawala" button → hosted login | Your Clerk `<SignIn>` (pass `byoProps`) |
| `<AkunaUserButton>` | Avatar menu: **Manage account** (Sawala account window: photo, name, password) + **Sign out** | Clerk's `<UserButton>` |
| `<SignedIn>` / `<SignedOut>` | Gate on the Sawala member session | Gate on the Clerk session |
| `useMember()` | From `GET /auth/me` | From the live Clerk session |

Managed "Manage account" opens Sawala's hosted account page in a small popup
window; when it closes, the member state refreshes automatically so a changed
name or photo appears immediately.

### `useMember()`

    const { member, isLoaded, isSignedIn, signIn, signOut } = useMember()

- `member` — `{ id, email, name, imageUrl }` or `null`.
- `signIn(opts?)` — managed: redirects to the Sawala login host (optional
  `{ redirectUri }` override, must be allowlisted); BYO: opens Clerk sign-in.
- `signOut()` — managed: signs out of **this site** (the visitor's Sawala
  account stays signed in, like a Google account); BYO: ends the Clerk session.

### Managed-mode session notes

The member session is a short-lived token issued by Sawala and stored in
`localStorage` (namespaced per API key). It is page-readable by design — the
standard SPA bearer-token posture; it expires on its own and is scoped
server-side to this one project. When it expires, `useMember()` reports
signed-out; clicking sign-in again is instant (no re-consent).

### Styling & theming (managed mode)

The managed components ship with a small built-in look (light + dark) and a
**stable class-name contract** — override any of it with plain CSS. The
built-in stylesheet is injected *before* your own stylesheets and uses
single-class selectors, so your CSS always wins without `!important`:

    .akui-signin-btn   /* the "Sign in with Sawala" button */
    .akui-avatar-btn   /* the avatar button */
    .akui-avatar-img   /* the avatar image */
    .akui-menu         /* the dropdown (also .akui-menu--left / --right) */
    .akui-menu-header  /* name/email block */
    .akui-menu-name
    .akui-menu-email
    .akui-menu-item    /* Manage account / Sign out rows */

The components default to the system font (so they look right even on an
unstyled page). To use your site's font everywhere, set one variable:

    :root { --akui-font: 'Inter', ui-sans-serif, sans-serif; }

Example — brand the button and menu:

    .akui-signin-btn { background: #4c6ef5; border-radius: 999px; }
    .akui-signin-btn:hover { background: #3b5bdb; }
    .akui-menu { border-radius: 8px; min-width: 260px; }

To discard the default styling entirely, pass `className` to
`<AkunaSignIn className="my-btn">` / `<AkunaUserButton className="my-avatar">`
— it **replaces** the default class (Tailwind, CSS modules, shadcn tokens all
work). In BYO mode, styling comes from your Clerk instance's `appearance`
config as before.

### Options

`<MembershipProvider>` props:

- `apiKey` (required) — the Sawala project API key.
- `baseUrl` — override the gateway base. Defaults to
  `https://api.sawala.cloud/public/akuna`.
- `loadingFallback` — rendered while the config is fetched.
- `errorFallback` — `(error) => ReactNode`, rendered if the config fetch fails.

### BYO-only escape hatches

These render your own Clerk instance and are **not available in managed mode**:
`SignIn`, `SignUp`, `UserButton`, `UserProfile`, `RedirectToSignIn`,
`OrganizationSwitcher`, `OrganizationProfile`, `CreateOrganization`,
`useMemberOrganization`, `useMemberOrganizationList`. Prefer the mode-aware
components above for code that must serve both modes.

## Example

See `example/` for a minimal Vite app that mounts `<MembershipProvider>` and
completes a real sign-in using only an API key.

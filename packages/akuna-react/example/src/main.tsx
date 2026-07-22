import React from 'react'
import { createRoot } from 'react-dom/client'
import {
  MembershipProvider,
  SignedIn,
  SignedOut,
  AkunaSignIn,
  AkunaUserButton,
  useMember,
} from '@sawala/akuna-react'

// A Sawala project API key scoped for `akuna`. Set VITE_AKUNA_API_KEY in a
// .env.local, or paste it here for a quick local test.
//
// This SAME file serves both membership modes — managed ("Sign in with
// Sawala") and BYO Clerk — the components branch on the mode returned by the
// platform. Switch the project's connection in the Sawala dashboard and
// reload; nothing here changes.
const API_KEY = import.meta.env.VITE_AKUNA_API_KEY ?? 'pk_test_REPLACE_ME'

// Point at a local gateway with VITE_AKUNA_BASE_URL=http://localhost:8780/public/akuna
const BASE_URL = import.meta.env.VITE_AKUNA_BASE_URL ?? undefined

function Profile() {
  const { member, isLoaded } = useMember()
  if (!isLoaded) return <p>Loading…</p>
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
      <AkunaUserButton />
      <p>Signed in as {member?.name ?? member?.email ?? member?.id}</p>
    </div>
  )
}

function App() {
  return (
    <MembershipProvider apiKey={API_KEY} baseUrl={BASE_URL} loadingFallback={<p>Loading membership…</p>}>
      <h1>Akuna example — same JSX, both modes</h1>
      <SignedOut>
        <AkunaSignIn />
      </SignedOut>
      <SignedIn>
        <Profile />
      </SignedIn>
    </MembershipProvider>
  )
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

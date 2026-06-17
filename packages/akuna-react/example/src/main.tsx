import React from 'react'
import { createRoot } from 'react-dom/client'
import {
  MembershipProvider,
  SignedIn,
  SignedOut,
  SignUp,
  UserButton,
  useMember,
} from '@sawala/akuna-react'

// A Sawala project API key scoped for `akuna`. Set VITE_AKUNA_API_KEY in a
// .env.local, or paste it here for a quick local test.
const API_KEY = import.meta.env.VITE_AKUNA_API_KEY ?? 'pk_test_REPLACE_ME'

// Point at local gateway with VITE_AKUNA_BASE_URL=http://localhost:8780/public/akuna
const BASE_URL = import.meta.env.VITE_AKUNA_BASE_URL ?? undefined

function Profile() {
  const { member, isLoaded } = useMember()
  if (!isLoaded) return <p>Loading…</p>
  return (
    <div>
      <UserButton />
      <p>Signed in as {member?.email ?? member?.name ?? member?.id}</p>
    </div>
  )
}

function App() {
  return (
    <MembershipProvider apiKey={API_KEY} baseUrl={BASE_URL} loadingFallback={<p>Loading membership…</p>}>
      <h1>Akuna example</h1>
      <SignedOut>
        <SignUp routing="hash" />
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

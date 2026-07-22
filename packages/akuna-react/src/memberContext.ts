'use client'

import { createContext, useContext } from 'react'
import type { Member } from './types'

// ── Unified member context ───────────────────────────────────────────────────
// One shape for both modes. Consumers (useMember, the gates, the components)
// read THIS — never Clerk hooks directly — so the same JSX works whether the
// project is BYO (Clerk on the page) or managed (redirect flow, no Clerk).
// Lives in its own module so provider.tsx (BYO bridge) and managed.tsx (engine)
// can both import it without a circular dependency.
export interface MemberContextValue {
  member: Member | null
  isLoaded: boolean
  isSignedIn: boolean
  signIn: (opts?: { redirectUri?: string }) => void
  signOut: () => Promise<void>
  /** Managed: the Account Portal profile URL. BYO: null (Clerk's UserButton owns it). */
  manageAccountUrl: string | null
  /** Re-fetch the member (managed: /auth/me; byo: no-op — Clerk stays live). */
  refresh: () => Promise<void>
}

export const MemberContext = createContext<MemberContextValue | null>(null)

/** Internal: the unified member state. Used by the package's own hooks/components. */
export function useMemberContext(): MemberContextValue {
  const ctx = useContext(MemberContext)
  if (!ctx) {
    throw new Error('useMember: wrap your tree in <MembershipProvider apiKey="pk_live_…">')
  }
  return ctx
}

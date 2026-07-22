'use client'

import { useMemberContext } from './memberContext'
import type { Member } from './types'

export interface UseMemberReturn {
  /** The normalized current member, or null when signed out / still loading. */
  member: Member | null
  /** False until the membership state has finished loading. */
  isLoaded: boolean
  isSignedIn: boolean
  /** Start sign-in (managed: redirect to the Sawala login host; byo: Clerk sign-in). */
  signIn: (opts?: { redirectUri?: string }) => void
  /** Sign the current member out (managed: this site only; byo: the Clerk session). */
  signOut: () => Promise<void>
}

/**
 * The current member (an end-user of the customer's site) — one hook for both
 * membership modes. In BYO mode the state mirrors the live Clerk session; in
 * managed mode it comes from the Akuna member session. Must be used under
 * <MembershipProvider>.
 */
export function useMember(): UseMemberReturn {
  const { member, isLoaded, isSignedIn, signIn, signOut } = useMemberContext()
  return { member, isLoaded, isSignedIn, signIn, signOut }
}

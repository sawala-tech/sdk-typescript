'use client'

import { useClerk, useUser } from '@clerk/clerk-react'
import type { Member } from './types'

export interface UseMemberReturn {
  /** The normalized current member, or null when signed out / still loading. */
  member: Member | null
  /** False until Clerk has finished loading the session. */
  isLoaded: boolean
  isSignedIn: boolean
  /** Sign the current member out. */
  signOut: () => Promise<void>
}

/**
 * The current member (an end-user of the customer's site), normalized from the
 * Clerk user. Must be used under <MembershipProvider>.
 */
export function useMember(): UseMemberReturn {
  const { user, isLoaded, isSignedIn } = useUser()
  const clerk = useClerk()

  const member: Member | null = user
    ? {
        id: user.id,
        email: user.primaryEmailAddress?.emailAddress ?? null,
        name: user.fullName ?? user.username ?? null,
        imageUrl: user.imageUrl ?? null,
      }
    : null

  return {
    member,
    isLoaded,
    isSignedIn: Boolean(isSignedIn),
    signOut: () => clerk.signOut(),
  }
}

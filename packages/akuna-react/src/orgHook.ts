'use client'

import { useOrganization, useOrganizationList } from '@clerk/clerk-react'
import { useMembershipConfig } from './provider'

// Thin, Akuna-named wrappers over Clerk's organization hooks, so a consumer
// works in "member organization" terms and never imports @clerk/clerk-react
// directly. A "member organization" is an organization the customer's end-users
// form inside the customer's Clerk instance (Clerk's B2B Organizations feature)
// — not a Sawala org. Requires Organizations to be enabled on the connected
// Clerk instance (see config.organizationsEnabled).
//
// BYO-only for now: managed projects have no Clerk on the page, and managed
// (Akuna-native) groups ship as a separate feature. The mode check throws
// before any Clerk hook runs — within one mode the hook order is consistent.

/** The current member-organization context (active org, the caller's membership, etc.). */
export function useMemberOrganization(
  ...args: Parameters<typeof useOrganization>
): ReturnType<typeof useOrganization> {
  const { config } = useMembershipConfig()
  if (config.mode !== 'byo') {
    throw new Error(
      'useMemberOrganization is BYO-only today: managed projects use Akuna-native groups (coming separately), not Clerk Organizations.',
    )
  }
  return useOrganization(...args)
}

/** The list of member-organizations the current member belongs to, with switching. */
export function useMemberOrganizationList(
  ...args: Parameters<typeof useOrganizationList>
): ReturnType<typeof useOrganizationList> {
  const { config } = useMembershipConfig()
  if (config.mode !== 'byo') {
    throw new Error(
      'useMemberOrganizationList is BYO-only today: managed projects use Akuna-native groups (coming separately), not Clerk Organizations.',
    )
  }
  return useOrganizationList(...args)
}

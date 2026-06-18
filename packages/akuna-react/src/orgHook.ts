'use client'

import { useOrganization, useOrganizationList } from '@clerk/clerk-react'

// Thin, Akuna-named wrappers over Clerk's organization hooks, so a consumer
// works in "member organization" terms and never imports @clerk/clerk-react
// directly. A "member organization" is an organization the customer's end-users
// form inside the customer's Clerk instance (Clerk's B2B Organizations feature)
// — not a Sawala org. Requires Organizations to be enabled on the connected
// Clerk instance (see config.organizationsEnabled).

/** The current member-organization context (active org, the caller's membership, etc.). */
export function useMemberOrganization(
  ...args: Parameters<typeof useOrganization>
): ReturnType<typeof useOrganization> {
  return useOrganization(...args)
}

/** The list of member-organizations the current member belongs to, with switching. */
export function useMemberOrganizationList(
  ...args: Parameters<typeof useOrganizationList>
): ReturnType<typeof useOrganizationList> {
  return useOrganizationList(...args)
}

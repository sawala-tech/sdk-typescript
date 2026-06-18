export { MembershipProvider, useMembershipConfig } from './provider'
export type { MembershipProviderProps } from './provider'

export { useMember } from './hook'
export type { UseMemberReturn } from './hook'

export { useMemberOrganization, useMemberOrganizationList } from './orgHook'

// Re-export Clerk's auth UI so consumers get pre-themed components (the theme
// comes from the appearance set on <ClerkProvider> by <MembershipProvider>)
// without adding @clerk/clerk-react to their own imports.
export {
  SignIn,
  SignUp,
  UserButton,
  SignedIn,
  SignedOut,
  RedirectToSignIn,
  // Organizations (Clerk's B2B feature). Render only when the connection has
  // organizationsEnabled — read it via useMembershipConfig().config.
  OrganizationSwitcher,
  OrganizationProfile,
  CreateOrganization,
} from '@clerk/clerk-react'

export type { AkunaConfig, AkunaAppearance, AkunaError, Member } from './types'

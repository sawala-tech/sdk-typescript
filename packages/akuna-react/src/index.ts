export { MembershipProvider, useMembershipConfig } from './provider'
export type { MembershipProviderProps } from './provider'

export { useMember } from './hook'
export type { UseMemberReturn } from './hook'

// Mode-aware drop-in components — the same JSX works for BYO and managed.
// SignedIn/SignedOut are the package's own gates (backed by Clerk state in BYO,
// by the Akuna member session in managed) — they intentionally shadow Clerk's.
export { AkunaSignIn, AkunaUserButton, SignedIn, SignedOut } from './components'
export type { AkunaSignInProps, AkunaUserButtonProps } from './components'

export { useMemberOrganization, useMemberOrganizationList } from './orgHook'

// Re-export Clerk's auth UI so consumers get pre-themed components (the theme
// comes from the appearance set on <ClerkProvider> by <MembershipProvider>)
// without adding @clerk/clerk-react to their own imports.
// BYO-ONLY: these render the customer's own Clerk instance and have no meaning
// on a managed project (which never runs Clerk on the page) — use the
// mode-aware components above for code that must serve both modes.
export {
  SignIn,
  SignUp,
  UserButton,
  UserProfile,
  RedirectToSignIn,
  // Organizations (Clerk's B2B feature). Render only when the connection has
  // organizationsEnabled — read it via useMembershipConfig().config.
  OrganizationSwitcher,
  OrganizationProfile,
  CreateOrganization,
} from '@clerk/clerk-react'

export type {
  AkunaConfig,
  AkunaByoConfig,
  AkunaManagedConfig,
  AkunaAppearance,
  AkunaError,
  Member,
} from './types'

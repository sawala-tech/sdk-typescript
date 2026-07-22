// Public types for @sawala/akuna-react.

/** Clerk appearance object, passed through to <ClerkProvider appearance={…}>. */
export type AkunaAppearance = Record<string, unknown>

/**
 * Boot config for a BYO-Clerk project: the customer connected their own Clerk
 * application and its (non-secret) publishable key boots embedded Clerk UI.
 */
export interface AkunaByoConfig {
  mode: 'byo'
  clerkPublishableKey: string
  clerkInstanceDomain: string
  appearance: AkunaAppearance | null
  signUpEnabled: boolean
  /** True when the connected Clerk instance has the Organizations feature on. */
  organizationsEnabled: boolean
}

/**
 * Boot config for a managed ("Sign in with Sawala") project: identity is
 * provided by Sawala's shared login host via a redirect flow. No Clerk
 * credentials are ever exposed to the page.
 */
export interface AkunaManagedConfig {
  mode: 'managed'
  /** The Sawala-hosted login origin, e.g. https://akuna.sawala.cloud */
  authorizeBaseUrl: string
  /** Clerk's hosted Account Portal origin, e.g. https://accounts.akuna.sawala.cloud */
  accountPortalUrl?: string
}

/** Boot config returned by GET {baseUrl}/config. Never contains secret material. */
export type AkunaConfig = AkunaByoConfig | AkunaManagedConfig

export interface AkunaError {
  code: string
  message: string
  status: number
}

/** Normalized current member (an end-user of the customer's site). */
export interface Member {
  /** BYO: the Clerk user id. Managed: Akuna's member id. */
  id: string
  email: string | null
  name: string | null
  imageUrl: string | null
}

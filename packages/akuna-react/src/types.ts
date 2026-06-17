// Public types for @sawala/akuna-react.

/** Clerk appearance object, passed through to <ClerkProvider appearance={…}>. */
export type AkunaAppearance = Record<string, unknown>

/** Boot config returned by GET {baseUrl}/config. Never contains secret material. */
export interface AkunaConfig {
  clerkPublishableKey: string
  clerkInstanceDomain: string
  appearance: AkunaAppearance | null
  signUpEnabled: boolean
}

export interface AkunaError {
  code: string
  message: string
  status: number
}

/** Normalized current member (an end-user of the customer's site). */
export interface Member {
  /** Clerk user id. */
  id: string
  email: string | null
  name: string | null
  imageUrl: string | null
}

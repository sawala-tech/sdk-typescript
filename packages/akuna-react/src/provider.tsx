'use client'

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { ClerkProvider, useClerk, useUser } from '@clerk/clerk-react'
import { fetchConfig } from './api'
import { ManagedMemberProvider } from './managed'
import { MemberContext, type MemberContextValue } from './memberContext'
import type { AkunaConfig, AkunaError } from './types'

interface MembershipContextValue {
  config: AkunaConfig
  baseUrl: string
  apiKey: string
}

const MembershipContext = createContext<MembershipContextValue | null>(null)

export interface MembershipProviderProps {
  /** A Sawala project-scoped public API key (pk_live_… / pk_test_…), scoped for `akuna`. */
  apiKey: string
  /** Override the default gateway URL. Defaults to https://api.sawala.cloud/public/akuna. */
  baseUrl?: string
  /** Rendered while the boot config is being fetched. Defaults to nothing. */
  loadingFallback?: ReactNode
  /** Rendered if the config fetch fails. Receives the error. Defaults to nothing. */
  errorFallback?: (error: AkunaError) => ReactNode
  children: ReactNode
}

function isSecureBaseUrl(url: string): boolean {
  try {
    const u = new URL(url)
    if (u.protocol === 'https:') return true
    return (
      u.protocol === 'http:' &&
      (u.hostname === 'localhost' ||
        u.hostname === '127.0.0.1' ||
        u.hostname === '::1' ||
        u.hostname.endsWith('.localhost'))
    )
  } catch {
    return false
  }
}

// BYO: rendered UNDER <ClerkProvider>, maps Clerk's live session into the
// unified MemberContext so consumers never call Clerk hooks (which would throw
// in managed mode, where no ClerkProvider exists).
function ClerkMemberBridge({ children }: { children: ReactNode }) {
  const { user, isLoaded, isSignedIn } = useUser()
  const clerk = useClerk()

  const value = useMemo<MemberContextValue>(
    () => ({
      member: user
        ? {
            id: user.id,
            email: user.primaryEmailAddress?.emailAddress ?? null,
            name: user.fullName ?? user.username ?? null,
            imageUrl: user.imageUrl ?? null,
          }
        : null,
      isLoaded,
      isSignedIn: Boolean(isSignedIn),
      signIn: () => {
        void clerk.openSignIn({})
      },
      signOut: () => clerk.signOut(),
      manageAccountUrl: null,
      refresh: () => Promise.resolve(),
    }),
    [user, isLoaded, isSignedIn, clerk],
  )

  return <MemberContext.Provider value={value}>{children}</MemberContext.Provider>
}

/**
 * Boots membership for the customer's site using ONLY a Sawala project API key.
 * On mount it fetches the connection's public config from the gateway, then
 * branches on the returned `mode`:
 *  - `byo`     → renders Clerk's <ClerkProvider> with the customer's own
 *                publishable key (the pre-0.4 behavior).
 *  - `managed` → renders the "Sign in with Sawala" session engine. No Clerk
 *                code runs on the page and no Clerk key is ever exposed.
 * The customer never hardcodes or hosts any Clerk key — it comes from Sawala.
 */
export function MembershipProvider({
  apiKey,
  baseUrl = 'https://api.sawala.cloud/public/akuna',
  loadingFallback = null,
  errorFallback,
  children,
}: MembershipProviderProps) {
  const [config, setConfig] = useState<AkunaConfig | null>(null)
  const [error, setError] = useState<AkunaError | null>(null)

  if (!isSecureBaseUrl(baseUrl) && typeof console !== 'undefined') {
    console.warn(
      `[MembershipProvider] Insecure baseUrl "${baseUrl}". Use https:// (http:// only for localhost).`,
    )
  }

  useEffect(() => {
    let cancelled = false
    setConfig(null)
    setError(null)
    fetchConfig({ apiKey, baseUrl })
      .then((c) => {
        if (!cancelled) setConfig(c)
      })
      .catch((e: AkunaError) => {
        if (!cancelled) setError(e)
      })
    return () => {
      cancelled = true
    }
  }, [apiKey, baseUrl])

  if (error) return <>{errorFallback ? errorFallback(error) : null}</>
  if (!config) return <>{loadingFallback}</>

  const ctx: MembershipContextValue = { config, baseUrl, apiKey }

  if (config.mode === 'managed') {
    return (
      <MembershipContext.Provider value={ctx}>
        <ManagedMemberProvider apiKey={apiKey} baseUrl={baseUrl} config={config}>
          {children}
        </ManagedMemberProvider>
      </MembershipContext.Provider>
    )
  }

  return (
    <ClerkProvider
      publishableKey={config.clerkPublishableKey}
      appearance={config.appearance ?? undefined}
    >
      <MembershipContext.Provider value={ctx}>
        <ClerkMemberBridge>{children}</ClerkMemberBridge>
      </MembershipContext.Provider>
    </ClerkProvider>
  )
}

/** Access the resolved Akuna config (mode, keys/urls, appearance, flags). */
export function useMembershipConfig(): MembershipContextValue {
  const ctx = useContext(MembershipContext)
  if (!ctx) {
    throw new Error('useMembershipConfig: wrap your tree in <MembershipProvider apiKey="pk_live_…">')
  }
  return ctx
}


'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { ClerkProvider } from '@clerk/clerk-react'
import { fetchConfig } from './api'
import type { AkunaConfig, AkunaError } from './types'

interface MembershipContextValue {
  config: AkunaConfig
  baseUrl: string
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

/**
 * Boots Clerk for the customer's site using ONLY a Sawala project API key.
 * On mount it fetches the connection's public config from the gateway and then
 * renders Clerk's <ClerkProvider> with the returned publishable key + appearance.
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

  return (
    <ClerkProvider
      publishableKey={config.clerkPublishableKey}
      appearance={config.appearance ?? undefined}
    >
      <MembershipContext.Provider value={{ config, baseUrl }}>{children}</MembershipContext.Provider>
    </ClerkProvider>
  )
}

/** Access the resolved Akuna config (publishable key, instance, appearance, flags). */
export function useMembershipConfig(): MembershipContextValue {
  const ctx = useContext(MembershipContext)
  if (!ctx) {
    throw new Error('useMembershipConfig: wrap your tree in <MembershipProvider apiKey="pk_live_…">')
  }
  return ctx
}

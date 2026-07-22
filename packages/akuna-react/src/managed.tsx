'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { exchangeToken, fetchMe } from './api'
import { MemberContext, type MemberContextValue } from './memberContext'
import type { AkunaManagedConfig, Member } from './types'

// ── Managed ("Sign in with Sawala") session engine ───────────────────────────
//
// The redirect flow, end to end:
//  1. signIn() stores a random `state` in sessionStorage and sends the browser
//     to {authorizeBaseUrl}/authorize?client_id=<apiKey>&redirect_uri=<here>&state=…
//  2. The visitor signs in on the Sawala-hosted login page (first join shows a
//     consent screen) and returns to redirect_uri with ?code=…&state=….
//  3. On mount we verify `state` (CSRF defense), exchange the single-use code
//     at POST {baseUrl}/auth/token for a short-lived member session JWT, store
//     it in localStorage, and clean the URL.
//  4. Membership state comes from GET {baseUrl}/auth/me; a 401 clears the token
//     (expired/revoked/banned → ordinary signed-out, never an error page).
//
// Storage is namespaced by api key so two Sawala projects on one origin never
// share tokens. The JWT is page-readable by design (SPA bearer-token posture,
// short-lived, scoped server-side to one org/connection).

function storageNs(apiKey: string): string {
  return `akuna:${apiKey.slice(0, 16)}`
}

function safeGet(storage: 'local' | 'session', key: string): string | null {
  try {
    const s = storage === 'local' ? window.localStorage : window.sessionStorage
    return s.getItem(key)
  } catch {
    return null
  }
}

function safeSet(storage: 'local' | 'session', key: string, value: string | null): void {
  try {
    const s = storage === 'local' ? window.localStorage : window.sessionStorage
    if (value === null) s.removeItem(key)
    else s.setItem(key, value)
  } catch {
    // Storage unavailable (privacy mode / SSR) — the flow degrades to signed-out.
  }
}

function randomState(): string {
  try {
    return crypto.randomUUID()
  } catch {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
  }
}

/** Derive the Account Portal profile URL for this managed connection. */
export function portalUserUrl(config: AkunaManagedConfig): string {
  if (config.accountPortalUrl) {
    return `${config.accountPortalUrl.replace(/\/+$/, '')}/user`
  }
  // Fallback for backends that predate the accountPortalUrl field: the portal
  // is the `accounts.` sibling of the authorize host.
  try {
    const u = new URL(config.authorizeBaseUrl)
    return `${u.protocol}//accounts.${u.host}/user`
  } catch {
    return 'https://accounts.akuna.sawala.cloud/user'
  }
}

export interface ManagedMemberProviderProps {
  apiKey: string
  baseUrl: string
  config: AkunaManagedConfig
  children: ReactNode
}

export function ManagedMemberProvider({ apiKey, baseUrl, config, children }: ManagedMemberProviderProps) {
  const [member, setMember] = useState<Member | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const bootedRef = useRef(false)

  const ns = storageNs(apiKey)
  const tokenKey = `${ns}:token`
  const stateKey = `${ns}:state`
  const ctx = useMemo(() => ({ apiKey, baseUrl }), [apiKey, baseUrl])

  const refresh = useCallback(async (): Promise<void> => {
    const token = safeGet('local', tokenKey)
    if (!token) {
      setMember(null)
      return
    }
    try {
      const me = await fetchMe(ctx, token)
      if (me?.isMember) {
        setMember(me.member)
      } else {
        // 401 → expired/revoked/banned: discard and show signed-out.
        safeSet('local', tokenKey, null)
        setMember(null)
      }
    } catch {
      // Network/5xx: keep the token, surface signed-out for now; the next
      // refresh() may succeed.
      setMember(null)
    }
  }, [ctx, tokenKey])

  useEffect(() => {
    // Exactly-once boot, StrictMode-safe: the ref survives StrictMode's
    // dev-only unmount/remount cycle, so the second effect run must NOT be
    // treated as a cancellation — the single in-flight boot() finishes and
    // publishes state to the (re)mounted component. No `cancelled` flag: a
    // set-state after a real unmount is a no-op in React 18, while skipping
    // setIsLoaded here would leave the UI blank forever.
    if (bootedRef.current) return
    bootedRef.current = true

    async function boot() {
      if (typeof window !== 'undefined') {
        // Step 3: handle a ?code=…&state=… return from the authorize page.
        const params = new URLSearchParams(window.location.search)
        const code = params.get('code')
        const returnedState = params.get('state')
        if (code) {
          const expected = safeGet('session', stateKey)
          if (expected && returnedState === expected) {
            safeSet('session', stateKey, null)
            try {
              const out = await exchangeToken(ctx, code)
              safeSet('local', tokenKey, out.token)
            } catch (e) {
              if (typeof console !== 'undefined') {
                console.warn('[akuna] code exchange failed:', e)
              }
            }
          } else if (typeof console !== 'undefined') {
            console.warn('[akuna] dropped auth code: state mismatch (possible CSRF or new tab)')
          }
          // Clean the URL either way so a reload never replays the code.
          params.delete('code')
          params.delete('state')
          const rest = params.toString()
          const clean = window.location.pathname + (rest ? `?${rest}` : '') + window.location.hash
          window.history.replaceState(null, '', clean)
        }
      }
      await refresh()
      setIsLoaded(true)
    }

    void boot()
  }, [ctx, refresh, stateKey, tokenKey])

  const signIn = useCallback(
    (opts?: { redirectUri?: string }) => {
      if (typeof window === 'undefined') return
      const state = randomState()
      safeSet('session', stateKey, state)
      const redirectUri =
        opts?.redirectUri ?? window.location.origin + window.location.pathname
      const u = new URL(`${config.authorizeBaseUrl.replace(/\/+$/, '')}/authorize`)
      u.searchParams.set('client_id', apiKey)
      u.searchParams.set('redirect_uri', redirectUri)
      u.searchParams.set('state', state)
      window.location.assign(u.toString())
    },
    [apiKey, config.authorizeBaseUrl, stateKey],
  )

  const signOut = useCallback(async (): Promise<void> => {
    // "Sign out of this site": the member JWT is discarded. The shared Sawala
    // identity stays signed in on the login host (like a Google account).
    safeSet('local', tokenKey, null)
    setMember(null)
  }, [tokenKey])

  const value = useMemo<MemberContextValue>(
    () => ({
      member,
      isLoaded,
      isSignedIn: member !== null,
      signIn,
      signOut,
      manageAccountUrl: portalUserUrl(config),
      refresh,
    }),
    [member, isLoaded, signIn, signOut, config, refresh],
  )

  return <MemberContext.Provider value={value}>{children}</MemberContext.Provider>
}

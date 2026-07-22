'use client'

import { useEffect, useRef, useState, type ComponentProps, type ReactNode } from 'react'
import { SignIn as ClerkSignIn, UserButton as ClerkUserButton } from '@clerk/clerk-react'
import { useMemberContext } from './memberContext'
import { useMembershipConfig } from './provider'

// ── Mode-aware drop-in components ────────────────────────────────────────────
// The same JSX serves both membership modes; each component branches on the
// `mode` from the boot config. BYO renders the customer's own Clerk UI;
// managed renders Sawala-owned equivalents over the redirect flow.

/** Gate: renders children only when the visitor is a signed-in member. */
export function SignedIn({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn } = useMemberContext()
  if (!isLoaded || !isSignedIn) return null
  return <>{children}</>
}

/** Gate: renders children only when the visitor is signed out (and state is known). */
export function SignedOut({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn } = useMemberContext()
  if (!isLoaded || isSignedIn) return null
  return <>{children}</>
}

export interface AkunaSignInProps {
  /** Managed mode: the button label. Default "Sign in with Sawala". */
  label?: string
  /** Managed mode: extra class for the button. */
  className?: string
  /** Managed mode: override the URL the visitor returns to (must be allowlisted). */
  redirectUri?: string
  /** BYO mode: props passed through to Clerk's <SignIn> (appearance, routing, …). */
  byoProps?: ComponentProps<typeof ClerkSignIn>
}

/**
 * Sign-in entry point.
 *  - BYO: renders the customer's own branded Clerk <SignIn> (byoProps pass through).
 *  - Managed: renders a "Sign in with Sawala" button that starts the redirect flow.
 */
export function AkunaSignIn({ label, className, redirectUri, byoProps }: AkunaSignInProps) {
  const { config } = useMembershipConfig()
  const { signIn } = useMemberContext()

  if (config.mode === 'byo') {
    return <ClerkSignIn {...byoProps} />
  }

  return (
    <button
      type="button"
      className={className}
      onClick={() => signIn(redirectUri ? { redirectUri } : undefined)}
      style={
        className
          ? undefined
          : {
              padding: '0.6rem 1.2rem',
              border: 0,
              borderRadius: 8,
              cursor: 'pointer',
              background: '#111827',
              color: '#fff',
              fontSize: '0.95rem',
              fontWeight: 600,
            }
      }
    >
      {label ?? 'Sign in with Sawala'}
    </button>
  )
}

// Open the Account Portal sized like a modal. Returns the window handle (null
// when the popup was blocked — the browser then opened nothing, so fall back
// to a plain new tab).
function openPortalPopup(url: string): Window | null {
  if (typeof window === 'undefined') return null
  const width = 480
  const height = 720
  const left = Math.max(0, (window.screenX ?? 0) + ((window.outerWidth ?? width) - width) / 2)
  const top = Math.max(0, (window.screenY ?? 0) + 80)
  const popup = window.open(
    url,
    'akuna-account',
    `popup,width=${width},height=${height},left=${Math.round(left)},top=${Math.round(top)}`,
  )
  if (!popup) window.open(url, '_blank', 'noopener')
  return popup
}

export interface AkunaUserButtonProps {
  /** Managed mode: extra class for the avatar button. */
  className?: string
}

/**
 * The signed-in avatar menu.
 *  - BYO: renders Clerk's <UserButton> (manage account, sign out — Clerk-hosted UI).
 *  - Managed: an avatar menu with "Manage account" (opens Clerk's hosted
 *    Account Portal in a modal-style popup; membership state refreshes when it
 *    closes) and "Sign out" (discards the member session for THIS site only).
 */
export function AkunaUserButton({ className }: AkunaUserButtonProps) {
  const { config } = useMembershipConfig()
  const { member, isSignedIn, signOut, manageAccountUrl, refresh } = useMemberContext()
  const [open, setOpen] = useState(false)
  // Edge-aware menu alignment: right-align to the avatar by default, but when
  // the avatar sits near the left viewport edge a right-anchored menu would
  // hang off-screen — flip to left-aligned.
  const [alignLeft, setAlignLeft] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const pollRef = useRef<number | null>(null)

  // Close the menu on any outside click.
  useEffect(() => {
    if (!open) return
    function onDocClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

  // Clear any popup poll on unmount.
  useEffect(
    () => () => {
      if (pollRef.current !== null && typeof window !== 'undefined') {
        window.clearInterval(pollRef.current)
      }
    },
    [],
  )

  if (config.mode === 'byo') {
    return <ClerkUserButton />
  }

  if (!isSignedIn || !member) return null

  const initials = (member.name ?? member.email ?? '?')
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  function onManageAccount() {
    setOpen(false)
    if (!manageAccountUrl) return
    const popup = openPortalPopup(manageAccountUrl)
    if (popup && typeof window !== 'undefined') {
      // When the portal window closes, re-read /auth/me so profile edits
      // (name, photo) show up immediately — the webhook has already fanned
      // them into the member row by then.
      pollRef.current = window.setInterval(() => {
        if (popup.closed) {
          if (pollRef.current !== null) window.clearInterval(pollRef.current)
          pollRef.current = null
          void refresh()
        }
      }, 500)
    }
  }

  const itemStyle: React.CSSProperties = {
    display: 'block',
    width: '100%',
    padding: '0.5rem 0.9rem',
    border: 0,
    background: 'transparent',
    textAlign: 'left',
    fontSize: '0.9rem',
    cursor: 'pointer',
    color: 'inherit',
  }

  return (
    <div ref={rootRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        aria-label="Account"
        className={className}
        onClick={() => {
          const rect = rootRef.current?.getBoundingClientRect()
          setAlignLeft(Boolean(rect && rect.left < 200))
          setOpen((v) => !v)
        }}
        style={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          border: '1px solid rgba(0,0,0,0.1)',
          padding: 0,
          overflow: 'hidden',
          cursor: 'pointer',
          background: '#e5e7eb',
          color: '#374151',
          fontSize: '0.8rem',
          fontWeight: 600,
          lineHeight: '36px',
          textAlign: 'center',
        }}
      >
        {member.imageUrl ? (
          <img
            src={member.imageUrl}
            alt={member.name ?? 'Account'}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          initials
        )}
      </button>
      {open && (
        <div
          role="menu"
          style={{
            position: 'absolute',
            ...(alignLeft ? { left: 0 } : { right: 0 }),
            top: 'calc(100% + 6px)',
            minWidth: 180,
            background: '#fff',
            color: '#111827',
            borderRadius: 10,
            boxShadow: '0 4px 16px rgba(0,0,0,0.12), 0 1px 3px rgba(0,0,0,0.08)',
            padding: '0.35rem 0',
            zIndex: 50,
          }}
        >
          <div style={{ padding: '0.4rem 0.9rem 0.5rem', borderBottom: '1px solid #f3f4f6' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{member.name ?? 'Member'}</div>
            {member.email && (
              <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{member.email}</div>
            )}
          </div>
          <button type="button" role="menuitem" style={itemStyle} onClick={onManageAccount}>
            Manage account
          </button>
          <button
            type="button"
            role="menuitem"
            style={itemStyle}
            onClick={() => {
              setOpen(false)
              void signOut()
            }}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}

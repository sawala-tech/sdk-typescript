'use client'

import { useEffect, useRef, useState, type ComponentProps, type ReactNode } from 'react'
import { SignIn as ClerkSignIn, UserButton as ClerkUserButton } from '@clerk/clerk-react'
import { useMemberContext } from './memberContext'
import { useMembershipConfig } from './provider'

// ── Mode-aware drop-in components ────────────────────────────────────────────
// The same JSX serves both membership modes; each component branches on the
// `mode` from the boot config. BYO renders the customer's own Clerk UI;
// managed renders Sawala-owned equivalents over the redirect flow.

// Managed-mode styling: one small stylesheet injected once. Dependency-free,
// inherits the host page's font, includes hover/focus states, a menu entrance
// animation, and dark-mode support — so the managed UI holds its own next to
// Clerk's components in BYO mode.
const STYLE_ID = 'akuna-react-styles'
const AKUNA_CSS = `
.akui-signin-btn{appearance:none;display:inline-flex;align-items:center;justify-content:center;gap:.5rem;padding:.625rem 1.25rem;border:0;border-radius:8px;cursor:pointer;background:#111827;color:#fff;font-family:var(--akui-font,system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif);font-size:.95rem;font-weight:600;line-height:1.2;transition:background .15s ease,transform .15s ease,box-shadow .15s ease}
.akui-signin-btn:hover{background:#1f2937;transform:translateY(-1px);box-shadow:0 4px 12px rgba(17,24,39,.25)}
.akui-signin-btn:active{transform:translateY(0);box-shadow:none}
.akui-signin-btn:focus-visible{outline:2px solid #6366f1;outline-offset:2px}
.akui-avatar-btn{width:36px;height:36px;border-radius:50%;border:1px solid rgba(0,0,0,.08);padding:0;overflow:hidden;cursor:pointer;background:#e5e7eb;color:#374151;font-family:var(--akui-font,system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif);font-size:.8rem;font-weight:600;line-height:34px;text-align:center;transition:box-shadow .15s ease}
.akui-avatar-btn:hover{box-shadow:0 0 0 3px rgba(99,102,241,.25)}
.akui-avatar-btn:focus-visible{outline:none;box-shadow:0 0 0 3px rgba(99,102,241,.5)}
.akui-avatar-img{width:100%;height:100%;object-fit:cover;display:block}
.akui-menu{position:absolute;top:calc(100% + 8px);min-width:230px;background:#fff;color:#111827;border:1px solid rgba(0,0,0,.06);border-radius:12px;box-shadow:0 12px 32px rgba(0,0,0,.12),0 2px 8px rgba(0,0,0,.06);padding:.375rem;z-index:50;font-family:var(--akui-font,system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif);animation:akui-pop .13s ease}
.akui-menu--right{right:0}
.akui-menu--left{left:0}
@keyframes akui-pop{from{opacity:0;transform:translateY(-4px) scale(.98)}to{opacity:1;transform:none}}
.akui-menu-header{padding:.5rem .625rem .625rem;border-bottom:1px solid rgba(0,0,0,.06);margin-bottom:.25rem}
.akui-menu-name{font-size:.85rem;font-weight:600}
.akui-menu-email{font-size:.75rem;color:#6b7280;margin-top:1px}
.akui-menu-item{display:flex;align-items:center;gap:.55rem;width:100%;padding:.5rem .625rem;border:0;border-radius:8px;background:transparent;text-align:left;font-family:var(--akui-font,system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif);font-size:.875rem;cursor:pointer;color:inherit;transition:background .12s ease}
.akui-menu-item:hover{background:rgba(0,0,0,.05)}
.akui-menu-item svg{width:15px;height:15px;opacity:.55;flex:none}
@media (prefers-color-scheme:dark){
  .akui-signin-btn{background:#f9fafb;color:#111827}
  .akui-signin-btn:hover{background:#fff;box-shadow:0 4px 12px rgba(0,0,0,.4)}
  .akui-avatar-btn{border-color:rgba(255,255,255,.12);background:#374151;color:#e5e7eb}
  .akui-menu{background:#16181d;color:#e5e7eb;border-color:rgba(255,255,255,.08);box-shadow:0 12px 32px rgba(0,0,0,.5),0 2px 8px rgba(0,0,0,.3)}
  .akui-menu-header{border-bottom-color:rgba(255,255,255,.08)}
  .akui-menu-email{color:#9ca3af}
  .akui-menu-item:hover{background:rgba(255,255,255,.07)}
}
`

function ensureStyles(): void {
  if (typeof document === 'undefined') return
  if (document.getElementById(STYLE_ID)) return
  const el = document.createElement('style')
  el.id = STYLE_ID
  el.textContent = AKUNA_CSS
  // Insert FIRST in <head>: the akui-* classes are a public theming contract —
  // single-class selectors injected before any customer stylesheet, so the
  // customer's own CSS (same specificity, later in the cascade) always wins.
  document.head.insertBefore(el, document.head.firstChild)
}

function PersonIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm0 1.5c-2.7 0-5.5 1.35-5.5 3.25V14h11v-1.25C13.5 10.85 10.7 9.5 8 9.5Z" />
    </svg>
  )
}

function SignOutIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M6 2H3.5A1.5 1.5 0 0 0 2 3.5v9A1.5 1.5 0 0 0 3.5 14H6M10.5 11l3-3-3-3M13.5 8H6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

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
  /** Managed mode: replace the default button styling with your own class. */
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

  ensureStyles()
  return (
    <button
      type="button"
      className={className ?? 'akui-signin-btn'}
      onClick={() => signIn(redirectUri ? { redirectUri } : undefined)}
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
  /** Managed mode: replace the default avatar styling with your own class. */
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

  ensureStyles()

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

  return (
    <div ref={rootRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        aria-label="Account"
        aria-haspopup="menu"
        aria-expanded={open}
        className={className ?? 'akui-avatar-btn'}
        onClick={() => {
          const rect = rootRef.current?.getBoundingClientRect()
          setAlignLeft(Boolean(rect && rect.left < 200))
          setOpen((v) => !v)
        }}
      >
        {member.imageUrl ? (
          <img className="akui-avatar-img" src={member.imageUrl} alt={member.name ?? 'Account'} />
        ) : (
          initials
        )}
      </button>
      {open && (
        <div role="menu" className={`akui-menu ${alignLeft ? 'akui-menu--left' : 'akui-menu--right'}`}>
          <div className="akui-menu-header">
            <div className="akui-menu-name">{member.name ?? 'Member'}</div>
            {member.email && <div className="akui-menu-email">{member.email}</div>}
          </div>
          <button type="button" role="menuitem" className="akui-menu-item" onClick={onManageAccount}>
            <PersonIcon />
            Manage account
          </button>
          <button
            type="button"
            role="menuitem"
            className="akui-menu-item"
            onClick={() => {
              setOpen(false)
              void signOut()
            }}
          >
            <SignOutIcon />
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}

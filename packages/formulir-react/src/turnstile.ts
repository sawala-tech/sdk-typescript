// Cloudflare Turnstile script-loader + render helper.
//
// The package loads the Turnstile script lazily from
// https://challenges.cloudflare.com/turnstile/v0/api.js the first time a
// form with captcha enabled mounts. The script is cached at module level so
// multiple forms on one page share a single network fetch.
//
// Sites with a Content-Security-Policy must allow:
//   script-src  https://challenges.cloudflare.com
//   frame-src   https://challenges.cloudflare.com
// Otherwise the script silently no-ops and the widget never renders.

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        opts: {
          sitekey:    string
          callback?:  (token: string) => void
          'expired-callback'?: () => void
          'error-callback'?:   () => void
        },
      ) => string
      reset:  (widgetId?: string) => void
      remove: (widgetId?: string) => void
    }
  }
}

let scriptPromise: Promise<void> | null = null

export function loadTurnstileScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve()
  if (window.turnstile)               return Promise.resolve()
  if (scriptPromise)                  return scriptPromise

  scriptPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src     = 'https://challenges.cloudflare.com/turnstile/v0/api.js'
    s.async   = true
    s.defer   = true
    s.onload  = () => resolve()
    s.onerror = () => {
      scriptPromise = null
      reject(new Error('TURNSTILE_SCRIPT_LOAD_FAILED'))
    }
    document.head.appendChild(s)
  })
  return scriptPromise
}

export interface TurnstileInstance {
  /** Current token, or null if not yet solved / expired. */
  readonly token: string | null
  /** Reset the widget so the user can issue a fresh token (after submit). */
  reset:  () => void
  /** Remove the widget from the DOM. */
  remove: () => void
}

export async function renderTurnstile(
  container: HTMLElement,
  sitekey:   string,
  onToken:   (token: string) => void,
  onExpire:  () => void,
): Promise<TurnstileInstance> {
  await loadTurnstileScript()
  if (typeof window === 'undefined' || !window.turnstile) {
    throw new Error('TURNSTILE_NOT_AVAILABLE')
  }

  let currentToken: string | null = null
  const widgetId = window.turnstile.render(container, {
    sitekey,
    callback: (token: string) => {
      currentToken = token
      onToken(token)
    },
    'expired-callback': () => {
      currentToken = null
      onExpire()
    },
    'error-callback': () => {
      currentToken = null
      onExpire()
    },
  })

  return {
    get token() {
      return currentToken
    },
    reset() {
      currentToken = null
      window.turnstile?.reset(widgetId)
    },
    remove() {
      currentToken = null
      window.turnstile?.remove(widgetId)
    },
  }
}

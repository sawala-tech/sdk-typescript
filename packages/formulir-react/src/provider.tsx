'use client'

import { createContext, useContext, type ReactNode } from 'react'
import type { FormulirAppearance } from './types'

interface FormulirContextValue {
  apiKey:      string
  baseUrl:     string
  appearance?: FormulirAppearance
  /** Default locale for all forms rendered under this provider.
   *  Overridden per-form by <FormulirForm locale="…" />. */
  locale?:     string
}

const FormulirContext = createContext<FormulirContextValue | null>(null)

export interface FormulirProviderProps {
  apiKey:      string
  /** Override the default gateway URL. Defaults to https://api.sawala.cloud/public/formulir. */
  baseUrl?:    string
  appearance?: FormulirAppearance
  /** Default BCP-47 locale applied to every <FormulirForm> in this provider's tree. */
  locale?:     string
  children:    ReactNode
}

// True for https anywhere, or http only to a local loopback host.
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

export function FormulirProvider({
  apiKey,
  baseUrl = 'https://api.sawala.cloud/public/formulir',
  appearance,
  locale,
  children,
}: FormulirProviderProps) {
  // Warn (rather than throw, to avoid breaking the host page) when pointed at a
  // non-https base. The submit API key is public (pk_), and browsers already
  // block mixed content on https pages, so this is a developer-time nudge.
  if (!isSecureBaseUrl(baseUrl) && typeof console !== 'undefined') {
    console.warn(
      `[FormulirProvider] Insecure baseUrl "${baseUrl}". Use https:// (http:// only for localhost).`,
    )
  }
  return (
    <FormulirContext.Provider value={{ apiKey, baseUrl, appearance, locale }}>
      {children}
    </FormulirContext.Provider>
  )
}

export function useFormulirContext(): FormulirContextValue {
  const ctx = useContext(FormulirContext)
  if (!ctx) {
    throw new Error('useFormulirContext: wrap your tree in <FormulirProvider apiKey="pk_live_…">')
  }
  return ctx
}

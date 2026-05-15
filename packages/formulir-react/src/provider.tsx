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

export function FormulirProvider({
  apiKey,
  baseUrl = 'https://api.sawala.cloud/public/formulir',
  appearance,
  locale,
  children,
}: FormulirProviderProps) {
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

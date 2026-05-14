'use client'

import { createContext, useContext, type ReactNode } from 'react'
import type { FormulirAppearance } from './types'

interface FormulirContextValue {
  apiKey:      string
  baseUrl:     string
  appearance?: FormulirAppearance
}

const FormulirContext = createContext<FormulirContextValue | null>(null)

export interface FormulirProviderProps {
  apiKey:      string
  /** Override the default gateway URL. Defaults to https://api.sawala.cloud/public/formulir. */
  baseUrl?:    string
  appearance?: FormulirAppearance
  children:    ReactNode
}

export function FormulirProvider({
  apiKey,
  baseUrl = 'https://api.sawala.cloud/public/formulir',
  appearance,
  children,
}: FormulirProviderProps) {
  return (
    <FormulirContext.Provider value={{ apiKey, baseUrl, appearance }}>
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

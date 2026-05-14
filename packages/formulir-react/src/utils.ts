// Tiny, dependency-free helpers — kept local so the package has no runtime deps
// beyond zod and the peer React/ReactDOM.

import type { CSSProperties } from 'react'
import type { FormulirAppearance, FormulirCssVariable } from './types'

export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}

const VAR_TO_CSS: Record<FormulirCssVariable, string> = {
  colorPrimary:      '--formulir-color-primary',
  colorPrimaryHover: '--formulir-color-primary-hover',
  colorText:         '--formulir-color-text',
  colorMuted:        '--formulir-color-muted',
  colorError:        '--formulir-color-error',
  colorBg:           '--formulir-color-bg',
  colorBorder:       '--formulir-color-border',
  radius:            '--formulir-radius',
  spacing:           '--formulir-spacing',
  fontFamily:        '--formulir-font-family',
  fontSize:          '--formulir-font-size',
}

export function appearanceToStyle(appearance: FormulirAppearance | undefined): CSSProperties | undefined {
  if (!appearance?.variables) return undefined
  const style: Record<string, string> = {}
  for (const [name, value] of Object.entries(appearance.variables)) {
    if (typeof value === 'string') {
      style[VAR_TO_CSS[name as FormulirCssVariable]] = value
    }
  }
  return style as CSSProperties
}

export function mergeAppearance(
  base:     FormulirAppearance | undefined,
  override: FormulirAppearance | undefined,
): FormulirAppearance | undefined {
  if (!base) return override
  if (!override) return base
  return {
    elements:  { ...(base.elements  ?? {}), ...(override.elements  ?? {}) },
    variables: { ...(base.variables ?? {}), ...(override.variables ?? {}) },
  }
}

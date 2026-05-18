'use client'

import type { ChangeEvent } from 'react'
import type { FormulirAppearance, SchemaField } from './types'
import { cn } from './utils'

export interface RenderFieldArgs {
  field:         SchemaField
  value:         unknown
  onChange:      (value: unknown) => void
  error?:        string
  appearance?:   FormulirAppearance
  /** BCP-47 locale to resolve `field.labels` against. Falls through to
   *  `defaultLocale`, then to `field.label`, then to `field.name`. */
  locale?:       string
  /** Fallback locale used when the primary `locale` lookup misses. */
  defaultLocale?: string
}

/**
 * Resolve a field's user-facing label for a given locale.
 *
 * Resolution order:
 *   1. `field.labels?.[locale]`     — the requested translation, if present and non-empty.
 *   2. `field.labels?.[defaultLocale]` — the form's configured default-locale translation.
 *   3. `field.label`                — the canonical singular operator-entered label.
 *   4. `field.name`                 — the field key, as a final safety net.
 *
 * Empty-string entries short-circuit to the next fallback. This matters when a
 * host i18n library hands back `''` during a transient hydration window (e.g.
 * `next-intl` before the locale is committed).
 */
export function resolveLabel(
  field:         SchemaField,
  locale:        string | undefined,
  defaultLocale: string | undefined,
): string {
  const labels = field.labels ?? {}
  if (locale && labels[locale])               return labels[locale]
  if (defaultLocale && labels[defaultLocale]) return labels[defaultLocale]
  return field.label ?? field.name
}

/**
 * Resolve the post-submission success message for a given locale.
 *
 * Resolution order:
 *   1. `success.messages?.[locale]`        — the requested translation, if present and non-empty.
 *   2. `success.messages?.[defaultLocale]` — the form's configured default-locale translation.
 *   3. `success.message`                   — the canonical singular operator-entered message.
 *
 * Only meaningful when `success.mode === 'message'`. The redirect variant has
 * no text to translate; the URL is fixed.
 */
export function resolveSuccessMessage(
  success:       { mode: 'message'; message: string; messages?: Record<string, string> },
  locale:        string | undefined,
  defaultLocale: string | undefined,
): string {
  const m = success.messages ?? {}
  if (locale && m[locale])               return m[locale]
  if (defaultLocale && m[defaultLocale]) return m[defaultLocale]
  return success.message
}

// Map of field types to baseline input components. The renderer mirrors
// `docs/wiki/concepts/dynamic-form.md` simplified for the public-submission
// case — no Berkasna picker, no TipTap, no JSON editor. Each rendered element
// carries a data-formulir-element attribute so consumers can style with CSS
// without depending on internal class names.

function inputClassName(appearance: FormulirAppearance | undefined): string {
  return cn('formulir-input', appearance?.elements?.inputField)
}

export function renderField(args: RenderFieldArgs): JSX.Element {
  const { field, value, onChange, error, appearance, locale, defaultLocale } = args
  const { name, type, required } = field
  const resolvedLabel = resolveLabel(field, locale, defaultLocale)
  const id = `formulir-${name}`

  const labelNode = (
    <label
      htmlFor={id}
      className={cn('formulir-label', appearance?.elements?.fieldLabel)}
      data-formulir-element="field-label"
    >
      {resolvedLabel}{required && <span className="formulir-required" aria-hidden="true"> *</span>}
    </label>
  )

  const errorNode = error
    ? (
      <p
        className={cn('formulir-error-text', appearance?.elements?.errorText)}
        data-formulir-element="error-text"
      >
        {error}
      </p>
    )
    : null

  const baseProps = {
    id,
    name,
    required,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': error ? `${id}-error` : undefined,
    'data-formulir-element': 'input-field' as const,
  }

  switch (type) {
    case 'text':
    case 'richtext':
    case 'markdown':
      return (
        <>
          {labelNode}
          {type === 'text' ? (
            <input
              {...baseProps}
              type="text"
              value={typeof value === 'string' ? value : ''}
              onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
              className={inputClassName(appearance)}
              minLength={field.validation?.minLength}
              maxLength={field.validation?.maxLength}
              pattern={field.validation?.pattern}
            />
          ) : (
            <textarea
              {...baseProps}
              value={typeof value === 'string' ? value : ''}
              onChange={(e) => onChange(e.target.value)}
              className={inputClassName(appearance)}
              rows={4}
              minLength={field.validation?.minLength}
              maxLength={field.validation?.maxLength}
            />
          )}
          {errorNode}
        </>
      )

    case 'number':
      return (
        <>
          {labelNode}
          <input
            {...baseProps}
            type="number"
            value={value === '' || value == null ? '' : Number(value)}
            onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
            className={inputClassName(appearance)}
            min={field.options?.min}
            max={field.options?.max}
          />
          {errorNode}
        </>
      )

    case 'boolean':
      return (
        <>
          <label
            htmlFor={id}
            className={cn('formulir-checkbox-label', appearance?.elements?.fieldLabel)}
            data-formulir-element="field-label"
          >
            <input
              {...baseProps}
              type="checkbox"
              checked={Boolean(value)}
              onChange={(e) => onChange(e.target.checked)}
              className={cn('formulir-checkbox', appearance?.elements?.inputField)}
            />
            <span>{resolvedLabel}{required && <span className="formulir-required" aria-hidden="true"> *</span>}</span>
          </label>
          {errorNode}
        </>
      )

    case 'date':
      return (
        <>
          {labelNode}
          <input
            {...baseProps}
            type="date"
            value={typeof value === 'string' ? value : ''}
            onChange={(e) => onChange(e.target.value)}
            className={inputClassName(appearance)}
          />
          {errorNode}
        </>
      )

    case 'select': {
      const opts = field.options?.enum ?? []
      return (
        <>
          {labelNode}
          <select
            {...baseProps}
            value={typeof value === 'string' ? value : ''}
            onChange={(e) => onChange(e.target.value)}
            className={inputClassName(appearance)}
          >
            <option value="">— choose —</option>
            {opts.map((o) => (<option key={o} value={o}>{o}</option>))}
          </select>
          {errorNode}
        </>
      )
    }

    case 'multiselect': {
      const opts    = field.options?.enum ?? []
      const current = Array.isArray(value) ? value as string[] : []
      return (
        <>
          {labelNode}
          <select
            {...baseProps}
            multiple
            value={current}
            onChange={(e) => onChange(Array.from(e.target.selectedOptions, (o) => o.value))}
            className={inputClassName(appearance)}
          >
            {opts.map((o) => (<option key={o} value={o}>{o}</option>))}
          </select>
          {errorNode}
        </>
      )
    }

    case 'media':
      return (
        <>
          {labelNode}
          <input
            {...baseProps}
            type="file"
            onChange={(e) => onChange(e.target.files?.[0])}
            className={inputClassName(appearance)}
          />
          {errorNode}
        </>
      )

    default:
      // json / repeater / blocks / component / relation — M1 fallback to text.
      return (
        <>
          {labelNode}
          <input
            {...baseProps}
            type="text"
            value={typeof value === 'string' ? value : value == null ? '' : JSON.stringify(value)}
            onChange={(e) => onChange(e.target.value)}
            className={inputClassName(appearance)}
            placeholder={`(${type})`}
          />
          {errorNode}
        </>
      )
  }
}

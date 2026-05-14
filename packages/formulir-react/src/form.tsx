'use client'

import type { ReactNode } from 'react'
import { useFormulirContext } from './provider'
import { useFormulirForm, type UseFormulirFormReturn } from './hook'
import { renderField } from './renderer'
import { appearanceToStyle, cn, mergeAppearance } from './utils'
import type { FormSettings, FormulirAppearance, FormulirError, SubmissionResult } from './types'

export interface FormulirFormProps {
  slug:        string
  onSubmit?:   (result: SubmissionResult) => void
  onError?:    (error: FormulirError) => void
  appearance?: FormulirAppearance
  className?:  string
  /** Override the submit button label. */
  submitLabel?:   string
  submittingLabel?: string
}

function SuccessView({
  settings,
  appearance,
  onReset,
}: {
  settings:   FormSettings
  appearance?: FormulirAppearance
  onReset:    () => void
}) {
  const success = settings.success ?? { mode: 'message' as const, message: 'Thanks! Your response has been received.' }

  if (success.mode === 'redirect') {
    // Mirror the iframe's behaviour: navigate the top window. In a non-iframe
    // host this just navigates the page itself, which is the documented intent.
    if (typeof window !== 'undefined') {
      try { window.top?.location.assign(success.url) } catch { window.location.assign(success.url) }
    }
    return null
  }

  return (
    <div
      className={cn('formulir-success', appearance?.elements?.success)}
      data-formulir-element="success"
      role="status"
    >
      <p>{success.message}</p>
      <button
        type="button"
        className={cn('formulir-link', appearance?.elements?.submitButton)}
        onClick={onReset}
        data-formulir-element="success-reset"
      >
        Submit another response
      </button>
    </div>
  )
}

export function FormulirForm(props: FormulirFormProps) {
  const ctx = useFormulirContext()
  const appearance = mergeAppearance(ctx.appearance, props.appearance)
  const rootStyle  = appearanceToStyle(appearance)

  const state = useFormulirForm({
    slug:     props.slug,
    onSubmit: props.onSubmit,
    onError:  props.onError,
  })

  if (state.status === 'loading-definition') {
    return (
      <div
        className={cn('formulir-form', 'formulir-loading', props.className, appearance?.elements?.form, appearance?.elements?.loading)}
        style={rootStyle}
        data-formulir-element="loading"
      >
        Loading form…
      </div>
    )
  }

  if (state.status === 'error-definition') {
    return (
      <div
        className={cn('formulir-form', 'formulir-error', props.className, appearance?.elements?.form, appearance?.elements?.error)}
        style={rootStyle}
        data-formulir-element="error"
        role="alert"
      >
        {state.error?.message ?? 'This form is unavailable.'}
      </div>
    )
  }

  if (state.status === 'submitted' && state.definition) {
    return (
      <div
        className={cn('formulir-form', props.className, appearance?.elements?.form)}
        style={rootStyle}
        data-formulir-element="form"
      >
        <SuccessView settings={state.definition.settings} appearance={appearance} onReset={state.reset} />
      </div>
    )
  }

  if (!state.definition) return null

  return (
    <form
      className={cn('formulir-form', props.className, appearance?.elements?.form)}
      style={rootStyle}
      data-formulir-element="form"
      onSubmit={(e) => { e.preventDefault(); void state.submit() }}
      noValidate
    >
      {state.definition.fields.map((field) => (
        <div
          key={field.name}
          className={cn('formulir-field', appearance?.elements?.field)}
          data-formulir-element="field"
          data-formulir-field={field.name}
          data-formulir-type={field.type}
        >
          {renderField({
            field,
            value:      state.values[field.name],
            onChange:   (v) => state.setValue(field.name, v),
            error:      state.errors[field.name],
            appearance,
          })}
        </div>
      ))}

      {state.status === 'error-submit' && state.error
        ? (
          <p
            className={cn('formulir-submit-error', appearance?.elements?.errorText)}
            data-formulir-element="submit-error"
            role="alert"
          >
            {state.error.message}
          </p>
        )
        : null}

      <button
        type="submit"
        className={cn('formulir-submit', appearance?.elements?.submitButton)}
        data-formulir-element="submit-button"
        disabled={state.submitting}
      >
        {state.submitting
          ? (props.submittingLabel ?? 'Submitting…')
          : (props.submitLabel ?? 'Submit')}
      </button>
    </form>
  )
}

// Headless variant — exposes the same form state via render props for
// consumers who want full ownership of markup. Same renderer-less API as the
// Tier 3 "Headless" escape hatch described in the package docs.
export interface FormulirHeadlessProps {
  slug:     string
  children: (state: UseFormulirFormReturn) => ReactNode
}

function FormulirHeadless({ slug, children }: FormulirHeadlessProps): JSX.Element {
  const state = useFormulirForm({ slug })
  return <>{children(state)}</>
}

FormulirForm.Headless = FormulirHeadless

'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useFormulirContext } from './provider'
import { useFormulirForm, type UseFormulirFormReturn } from './hook'
import { renderField, resolveSuccessMessage } from './renderer'
import { renderTurnstile, type TurnstileInstance } from './turnstile'
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
  /**
   * Pre-populate field values by name. Applied once when the form definition
   * resolves; subsequent prop changes are intentionally ignored — this is a
   * one-shot pre-fill, not a controlled-input mechanism. Useful for hidden
   * fields (whose values must come from the embedder) and for seeding
   * defaults on visible fields (still editable by the end-user).
   */
  values?: Record<string, unknown>
  /**
   * Pick a BCP-47 locale from the form's `settings.locales`. Drives per-field
   * label resolution (`field.labels[locale]`) and the post-submission success
   * message (`settings.success.messages[locale]`). Falls back through
   * `settings.defaultLocale`, then the canonical singular strings. Overrides
   * any `locale` set on the parent `<FormulirProvider>`.
   */
  locale?: string
}

function SuccessView({
  settings,
  appearance,
  onReset,
  locale,
}: {
  settings:   FormSettings
  appearance?: FormulirAppearance
  onReset:    () => void
  locale?:    string
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

  const messageText = resolveSuccessMessage(success, locale, settings.defaultLocale)

  return (
    <div
      className={cn('formulir-success', appearance?.elements?.success)}
      data-formulir-element="success"
      role="status"
    >
      <p>{messageText}</p>
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

  // Form-level locale wins over provider-level locale. The fallback chain
  // continues into `settings.defaultLocale` at the use sites below, since the
  // definition is not available until after `useFormulirForm` resolves.
  const effectiveLocale = props.locale ?? ctx.locale

  const state = useFormulirForm({
    slug:     props.slug,
    onSubmit: props.onSubmit,
    onError:  props.onError,
  })

  // One-shot pre-fill from the `values` prop. Fires once after the form
  // definition resolves. We do not re-fire on subsequent `props.values`
  // changes — the prop is documented as a pre-fill, not a controlled input.
  const filledRef = useRef(false)
  useEffect(() => {
    if (filledRef.current)  return
    if (!state.definition)  return
    if (!props.values)      return
    for (const [k, v] of Object.entries(props.values)) {
      state.setValue(k, v)
    }
    filledRef.current = true
  }, [state.definition, props.values, state])

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
        <SuccessView
          settings={state.definition.settings}
          appearance={appearance}
          onReset={state.reset}
          locale={effectiveLocale}
        />
      </div>
    )
  }

  if (!state.definition) return null

  const captcha = state.definition.settings.captcha
  const captchaEnabled       = captcha?.enabled === true && captcha.provider === 'turnstile'
  const captchaMisconfigured = captchaEnabled && captcha?.misconfigured === true
  const captchaSitekey       = captchaEnabled ? captcha?.sitekey : undefined

  if (captchaMisconfigured) {
    return (
      <div
        className={cn('formulir-form', 'formulir-error', props.className, appearance?.elements?.form, appearance?.elements?.error)}
        style={rootStyle}
        data-formulir-element="error"
        role="alert"
      >
        This form requires spam protection but the project has no spam-protection key configured.
      </div>
    )
  }

  return (
    <FormBody
      state={state}
      appearance={appearance}
      rootStyle={rootStyle}
      className={props.className}
      submitLabel={props.submitLabel}
      submittingLabel={props.submittingLabel}
      captchaSitekey={captchaSitekey}
      locale={effectiveLocale}
    />
  )
}

interface FormBodyProps {
  state:            UseFormulirFormReturn
  appearance?:      FormulirAppearance
  rootStyle?:       React.CSSProperties
  className?:       string
  submitLabel?:     string
  submittingLabel?: string
  captchaSitekey?:  string
  locale?:          string
}

function FormBody({
  state,
  appearance,
  rootStyle,
  className,
  submitLabel,
  submittingLabel,
  captchaSitekey,
  locale,
}: FormBodyProps) {
  const captchaContainerRef = useRef<HTMLDivElement | null>(null)
  const captchaInstanceRef  = useRef<TurnstileInstance | null>(null)
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const [captchaMissing, setCaptchaMissing] = useState(false)

  // Mount the Turnstile widget once the form is ready and a sitekey is
  // available. The widget's callback writes the token into local state so
  // the form can attach it to the submit payload. The script is loaded
  // lazily inside renderTurnstile().
  useEffect(() => {
    if (!captchaSitekey)               return
    if (!captchaContainerRef.current)  return

    let cancelled = false
    let instance: TurnstileInstance | null = null
    renderTurnstile(
      captchaContainerRef.current,
      captchaSitekey,
      (token) => {
        if (cancelled) return
        setCaptchaToken(token)
        setCaptchaMissing(false)
      },
      () => {
        if (cancelled) return
        setCaptchaToken(null)
      },
    ).then(
      (inst) => {
        if (cancelled) { inst.remove(); return }
        instance = inst
        captchaInstanceRef.current = inst
      },
      () => { /* script-load or render failure handled via captcha-error state */ },
    )

    return () => {
      cancelled = true
      instance?.remove()
      captchaInstanceRef.current = null
    }
  }, [captchaSitekey])

  // After a successful submit, reset the widget so the user can issue a
  // fresh token if they choose "Submit another response". The token is
  // single-use; Cloudflare's siteverify rejects the same token twice.
  useEffect(() => {
    if (state.status === 'submitted') {
      captchaInstanceRef.current?.reset()
      setCaptchaToken(null)
    }
  }, [state.status])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (captchaSitekey && !captchaToken) {
      setCaptchaMissing(true)
      return
    }
    setCaptchaMissing(false)
    const extras = captchaToken ? { 'cf-turnstile-response': captchaToken } : undefined
    void state.submit(extras)
  }

  if (!state.definition) return null
  const definition = state.definition
  const defaultLocale = definition.settings.defaultLocale

  return (
    <form
      className={cn('formulir-form', className, appearance?.elements?.form)}
      style={rootStyle}
      data-formulir-element="form"
      onSubmit={handleSubmit}
      noValidate
    >
      {definition.fields
        .filter((field) => !field.hidden)
        .map((field) => (
          <div
            key={field.name}
            className={cn('formulir-field', appearance?.elements?.field)}
            data-formulir-element="field"
            data-formulir-field={field.name}
            data-formulir-type={field.type}
          >
            {renderField({
              field,
              value:         state.values[field.name],
              onChange:      (v) => state.setValue(field.name, v),
              error:         state.errors[field.name],
              appearance,
              locale,
              defaultLocale,
            })}
          </div>
        ))}

      {captchaSitekey
        ? (
          <div
            className={cn('formulir-captcha', appearance?.elements?.captcha)}
            data-formulir-element="captcha"
          >
            <div ref={captchaContainerRef} />
            {captchaMissing
              ? (
                <p
                  className={cn('formulir-submit-error', appearance?.elements?.errorText)}
                  data-formulir-element="captcha-required"
                  role="alert"
                >
                  Please complete the spam-protection challenge before submitting.
                </p>
              )
              : null}
          </div>
        )
        : null}

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
          ? (submittingLabel ?? 'Submitting…')
          : (submitLabel ?? 'Submit')}
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

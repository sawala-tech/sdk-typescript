'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { fetchFormDefinition, submitForm } from './api'
import { useFormulirContext } from './provider'
import { validateValues } from './validation'
import type { Form, FormulirError, FormulirStatus, SubmissionResult } from './types'

// Module-level cache so multiple <FormulirForm slug="contact"> on one page
// share a single fetch for the same (baseUrl, slug). Each entry is the
// in-flight Promise, replaced with the resolved Form once it settles.
const definitionCache = new Map<string, Promise<Form>>()

function defaultFor(type: string): unknown {
  if (type === 'boolean') return false
  if (type === 'multiselect') return []
  return ''
}

function buildInitialValues(form: Form): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const f of form.fields) {
    out[f.name] = f.default !== undefined ? f.default : defaultFor(f.type)
  }
  return out
}

export interface UseFormulirFormOptions {
  slug:       string
  onSubmit?:  (result: SubmissionResult) => void
  onError?:   (error: FormulirError) => void
}

export interface UseFormulirFormReturn {
  definition: Form | null
  values:     Record<string, unknown>
  errors:     Record<string, string>
  status:     FormulirStatus
  submitting: boolean
  /** Last error encountered (definition fetch or submit). */
  error:      FormulirError | null
  setValue:   (name: string, value: unknown) => void
  /**
   * Submit the form. `extras` is merged into the value map at post time
   * (extras win on key collision) and is intended for submit-only fields
   * like the Cloudflare Turnstile token (`cf-turnstile-response`) that
   * should not live in the user-editable form state. Calling `submit()`
   * with no arguments remains valid and behaves as before.
   */
  submit:     (extras?: Record<string, unknown>) => Promise<void>
  reset:      () => void
}

export function useFormulirForm(opts: UseFormulirFormOptions): UseFormulirFormReturn {
  const ctx = useFormulirContext()
  const { slug, onSubmit, onError } = opts

  const [definition, setDefinition] = useState<Form | null>(null)
  const [values, setValues]         = useState<Record<string, unknown>>({})
  const [errors, setErrors]         = useState<Record<string, string>>({})
  const [status, setStatus]         = useState<FormulirStatus>('loading-definition')
  const [error, setError]           = useState<FormulirError | null>(null)
  const filesRef                    = useRef<Record<string, File>>({})

  const cacheKey = `${ctx.baseUrl}::${slug}`

  // Fetch the definition once per (baseUrl, slug). The module-level cache
  // dedupes parallel renders; React re-mounts (StrictMode in dev, route
  // navigation) re-read the same Promise.
  useEffect(() => {
    let cancelled = false
    let promise = definitionCache.get(cacheKey)
    if (!promise) {
      promise = fetchFormDefinition({ apiKey: ctx.apiKey, baseUrl: ctx.baseUrl }, slug)
      definitionCache.set(cacheKey, promise)
      // On failure, evict so the next mount retries.
      promise.catch(() => { definitionCache.delete(cacheKey) })
    }

    promise.then(
      (form) => {
        if (cancelled) return
        setDefinition(form)
        setValues(buildInitialValues(form))
        setErrors({})
        setStatus('ready')
      },
      (err: FormulirError) => {
        if (cancelled) return
        setError(err)
        setStatus('error-definition')
        onError?.(err)
      },
    )

    return () => { cancelled = true }
  }, [cacheKey, ctx.apiKey, ctx.baseUrl, slug, onError])

  const setValue = useCallback((name: string, value: unknown) => {
    if (value instanceof File) {
      filesRef.current[name] = value
      setValues((prev) => ({ ...prev, [name]: value.name }))
    } else {
      setValues((prev) => ({ ...prev, [name]: value }))
    }
    setErrors((prev) => {
      if (!prev[name]) return prev
      const next = { ...prev }
      delete next[name]
      return next
    })
  }, [])

  const reset = useCallback(() => {
    if (!definition) return
    setValues(buildInitialValues(definition))
    setErrors({})
    setStatus('ready')
    setError(null)
    filesRef.current = {}
  }, [definition])

  const submit = useCallback(async (extras?: Record<string, unknown>) => {
    if (!definition) return

    const result = validateValues(definition.fields, values)
    if (!result.ok) {
      setErrors(result.errors)
      return
    }

    setStatus('submitting')
    setError(null)

    try {
      const submission = await submitForm(
        { apiKey: ctx.apiKey, baseUrl: ctx.baseUrl },
        definition.slug,
        values,
        filesRef.current,
        extras,
      )
      setStatus('submitted')
      onSubmit?.(submission)
    } catch (err) {
      const fe = err as FormulirError
      setError(fe)
      setStatus('error-submit')
      onError?.(fe)
    }
  }, [definition, values, ctx.apiKey, ctx.baseUrl, onSubmit, onError])

  return useMemo(
    () => ({
      definition,
      values,
      errors,
      status,
      submitting: status === 'submitting',
      error,
      setValue,
      submit,
      reset,
    }),
    [definition, values, errors, status, error, setValue, submit, reset],
  )
}

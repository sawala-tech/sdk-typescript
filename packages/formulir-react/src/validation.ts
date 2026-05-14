// Client-side validation derived from a form's SchemaField[]. Mirrors the
// formulir worker's submission validator one-to-one so on-change feedback in
// the browser matches what the server would accept. The package ships its
// own copy — the worker's validator lives behind D1 and isn't shipped to
// browsers.

import { z, type ZodTypeAny } from 'zod'
import type { SchemaField } from './types'

function buildFieldSchema(field: SchemaField): ZodTypeAny {
  const { type, options, validation, required } = field

  let schema: ZodTypeAny

  switch (type) {
    case 'text':
    case 'richtext':
    case 'markdown': {
      let s = z.string()
      if (validation?.minLength != null) s = s.min(validation.minLength)
      if (validation?.maxLength != null) s = s.max(validation.maxLength)
      if (validation?.pattern)           s = s.regex(new RegExp(validation.pattern))
      schema = s
      break
    }
    case 'number': {
      let s = z.coerce.number()
      if (options?.min != null) s = s.min(options.min)
      if (options?.max != null) s = s.max(options.max)
      schema = s
      break
    }
    case 'boolean':
      // Multipart submissions encode booleans as the string 'true' or absent.
      // For client-side validation we accept the actual boolean (UI state).
      schema = z.boolean()
      break
    case 'date':
      schema = z.string().regex(/^\d{4}-\d{2}-\d{2}/, 'Must be a valid date')
      break
    case 'select':
      schema = options?.enum && options.enum.length > 0
        ? z.enum(options.enum as [string, ...string[]])
        : z.string()
      break
    case 'multiselect':
      schema = z.array(
        options?.enum && options.enum.length > 0
          ? z.enum(options.enum as [string, ...string[]])
          : z.string(),
      )
      break
    case 'media':
      // The actual value is a File; presence is what matters here.
      schema = z.any()
      break
    default:
      // json, repeater, blocks, component, relation, richtext etc. fall back to
      // permissive string for M1. The worker's validator is the authoritative gate.
      schema = z.any()
  }

  if (!required) {
    // Accept empty string / null / undefined for non-required fields.
    schema = schema.optional().nullable().or(z.literal(''))
  } else {
    // Required string fields must be non-empty.
    if (type === 'text' || type === 'richtext' || type === 'markdown' || type === 'date' || type === 'select') {
      schema = (schema as z.ZodString).min ? (schema as z.ZodString).min(1, 'Required') : schema
    }
  }

  return schema
}

export function buildZodSchema(fields: SchemaField[]): z.ZodObject<Record<string, ZodTypeAny>> {
  const shape: Record<string, ZodTypeAny> = {}
  for (const field of fields) {
    shape[field.name] = buildFieldSchema(field)
  }
  return z.object(shape)
}

export function validateValues(
  fields: SchemaField[],
  values: Record<string, unknown>,
): { ok: true; data: Record<string, unknown> } | { ok: false; errors: Record<string, string> } {
  const schema = buildZodSchema(fields)
  const result = schema.safeParse(values)
  if (result.success) return { ok: true, data: result.data }

  const errors: Record<string, string> = {}
  for (const issue of result.error.issues) {
    const path = issue.path[0]
    if (typeof path === 'string' && !errors[path]) errors[path] = issue.message
  }
  return { ok: false, errors }
}

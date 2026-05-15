// Public types for @sawala/formulir-react.
//
// SchemaField mirrors the cross-product type in @sawala/shared-types but the
// package keeps its own copy so npm consumers don't have to install a private
// workspace package. Keep these in sync with
// `packages/shared-types/src/index.ts` when fields are added or renamed.

// BCP-47 locale tag — short string like 'en', 'id', 'sv', or 'pt-BR'. The
// runtime resolver in `renderer.tsx` does not validate against an allow-list.
export type Locale = string

export type FieldType =
  | 'text'
  | 'richtext'
  | 'markdown'
  | 'number'
  | 'boolean'
  | 'date'
  | 'relation'
  | 'media'
  | 'blocks'
  | 'component'
  | 'json'
  | 'select'
  | 'multiselect'
  | 'repeater'

export interface FieldValidation extends Record<string, unknown> {
  pattern?:   string
  minLength?: number
  maxLength?: number
}

export interface FieldOptions extends Record<string, unknown> {
  min?:  number
  max?:  number
  enum?: string[]
}

export interface SchemaField {
  name:        string
  label?:      string
  /** Per-locale label translations, keyed by short BCP-47 tag (e.g. 'en', 'id', 'sv').
   *  Resolution at render time: labels?.[requestedLocale] ?? labels?.[defaultLocale] ?? label ?? name. */
  labels?:     Record<string, string>
  type:        FieldType
  required:    boolean
  unique?:     boolean
  localized?:  boolean
  // When true, the default <FormulirForm> renderer skips this field entirely.
  // The value still participates in submission and validation, so embedders
  // must pre-populate it via the `values` prop or via `setValue` in headless
  // mode. Has no effect in <FormulirForm.Headless>, which gives the consumer
  // full rendering control.
  hidden?:     boolean
  default?:    unknown
  validation?: FieldValidation
  options?:    FieldOptions
  subfields?:  SchemaField[]
}

export interface FormSettings {
  success?:
    | {
        mode:      'message'
        message:   string
        /** Per-locale translations of `message`, keyed by short BCP-47 tag.
         *  Resolution: messages?.[requestedLocale] ?? messages?.[defaultLocale] ?? message. */
        messages?: Record<string, string>
      }
    | { mode: 'redirect'; url: string }
  maxSubmissionsPerDay?: number
  visibility?: 'public' | 'private'
  captcha?: {
    provider: 'turnstile'
    enabled:  boolean
    /** Live sitekey, injected by the form-definition endpoint when enabled and configured. */
    sitekey?: string
    /** Set when the form has captcha.enabled but the project has no BYO config. */
    misconfigured?: boolean
  }
  /** BCP-47 locale codes the form supports. Free-form on the wire; the dashboard's picker is opinionated. */
  locales?:       string[]
  /** Secondary fallback for label/message resolution before the singular canonical strings. */
  defaultLocale?: string
}

export interface Form {
  id:           string
  slug:         string
  name:         string
  description?: string | null
  fields:       SchemaField[]
  settings:     FormSettings
}

export interface SubmissionResult {
  id:     string
  status: 'received' | 'verified' | 'rejected'
}

// Kept for forward compatibility — currently identical to SubmissionResult.
export type Submission = SubmissionResult

export interface FormulirError {
  code:    string
  message: string
  status:  number
}

export type FormulirStatus =
  | 'loading-definition'
  | 'ready'
  | 'submitting'
  | 'submitted'
  | 'error-definition'
  | 'error-submit'

// Element slots that can receive a className via FormulirAppearance.elements.
// Names align with the data-formulir-element attributes set by the renderer
// so consumers can also style via plain CSS selectors.
export type FormulirElementSlot =
  | 'form'
  | 'field'
  | 'fieldLabel'
  | 'inputField'
  | 'submitButton'
  | 'errorText'
  | 'loading'
  | 'error'
  | 'success'
  | 'captcha'

export type FormulirCssVariable =
  | 'colorPrimary'
  | 'colorPrimaryHover'
  | 'colorText'
  | 'colorMuted'
  | 'colorError'
  | 'colorBg'
  | 'colorBorder'
  | 'radius'
  | 'spacing'
  | 'fontFamily'
  | 'fontSize'

export interface FormulirAppearance {
  /** className strings merged into specific element slots. */
  elements?: Partial<Record<FormulirElementSlot, string>>
  /** CSS variable overrides applied inline at the form root. */
  variables?: Partial<Record<FormulirCssVariable, string>>
}

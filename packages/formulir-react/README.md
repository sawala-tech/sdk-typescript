# @sawala/formulir-react

Drop-in React component and headless hooks for embedding [Sawala Formulir](https://sawala.cloud/products/formulir) forms in any React 18+ app.

```bash
npm install @sawala/formulir-react
```

```tsx
'use client'
import '@sawala/formulir-react/styles.css'
import { FormulirProvider, FormulirForm } from '@sawala/formulir-react'

export default function Page() {
  return (
    <FormulirProvider apiKey="pk_live_…">
      <FormulirForm slug="contact" onSubmit={(s) => console.log(s)} />
    </FormulirProvider>
  )
}
```

Issue a publishable key from your Sawala dashboard at **Settings → API Keys** (must be scoped to a single project; product = `formulir`).

For non-React hosts (WordPress, Squarespace, static HTML, etc.) use the iframe embed:

```html
<iframe
  src="https://formulir.id/embed/<projectId>/<formSlug>?key=pk_live_…"
  style="width:100%;height:600px;border:0"
></iframe>
```

The dashboard's form editor generates ready-to-copy snippets for both modes.

## Theming

Three escalating tiers. Use whichever fits the consumer.

### 1. CSS variables — lightest

Override any of the `--formulir-*` variables in your own CSS. The form repaints with no re-render.

```css
.my-app .formulir-form {
  --formulir-color-primary: #9333ea;
  --formulir-radius:        0;
}
```

### 2. `appearance` prop — Clerk-style overrides

```tsx
<FormulirProvider
  apiKey="pk_live_…"
  appearance={{
    variables: { colorPrimary: '#9333ea', radius: '0' },
    elements:  {
      submitButton: 'bg-purple-600 hover:bg-purple-700 px-6 py-3 rounded-none',
      inputField:   'border-2 border-purple-200 focus:border-purple-600',
    },
  }}
>
  <FormulirForm slug="contact" />
</FormulirProvider>
```

`variables` writes inline CSS variables on the form root. `elements` merges class names into specific slots (`form`, `field`, `fieldLabel`, `inputField`, `submitButton`, `errorText`, `loading`, `error`, `success`).

### 3. Headless — full ownership

```tsx
<FormulirForm.Headless slug="contact">
  {({ definition, values, errors, setValue, submit, submitting, status }) => (
    /* render whatever markup you like */
  )}
</FormulirForm.Headless>
```

## Hidden fields and pre-filled values

Mark any field as **Hidden** in the dashboard's form editor (Required / Unique / **Hidden**) when its value should come from the embedder rather than the end-user. The default renderer skips hidden fields entirely; you supply their values via the `values` prop:

```tsx
<FormulirForm
  slug="download-report"
  values={{
    report_slug:   'annual-report-2024',
    report_locale: 'id',
    report_title:  'Laporan Tahunan 2024',
  }}
  onSubmit={(s) => console.log(s)}
/>
```

`values` is a one-shot pre-fill applied when the form definition resolves; subsequent prop changes are intentionally ignored (this is not a controlled-input mechanism). It also works for visible fields — the end-user can still edit those after the prefill seeds them.

Hidden required fields whose value isn't supplied cause submission to fail with the same `FIELD_VALIDATION_FAILED` error as a missing visible required field — so always pass the prop when a hidden field is required.

For the iframe embed, supply the same values via URL query parameters with bracket syntax:

```html
<iframe src="https://formulir.id/embed/<projId>/<slug>?key=pk_live_…&values[report_slug]=annual-report-2024&values[report_locale]=id"></iframe>
```

## API

```ts
import { useFormulirForm } from '@sawala/formulir-react'

const {
  definition, values, errors,
  status, submitting, error,
  setValue, submit, reset,
} = useFormulirForm({ slug: 'contact' })
```

Status values: `'loading-definition' | 'ready' | 'submitting' | 'submitted' | 'error-definition' | 'error-submit'`.

## Self-hosting the gateway

If you front the Formulir API with your own gateway, override `baseUrl` on the provider:

```tsx
<FormulirProvider apiKey="…" baseUrl="https://api.example.com/public/formulir">
```

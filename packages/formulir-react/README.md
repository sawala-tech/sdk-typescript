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

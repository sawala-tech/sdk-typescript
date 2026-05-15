# Changelog

## 0.3.0

- Cloudflare Turnstile spam protection. When the parent form has captcha enabled
  in the dashboard (Settings → Projects → Edit → Spam protection, then a
  per-form toggle), `<FormulirForm>` mounts a Cloudflare Turnstile widget above
  the submit button, captures the token, and submits it as
  `cf-turnstile-response` alongside the other field values. Submit is blocked
  with an inline message until the challenge is solved.
- `useFormulirForm().submit` accepts an optional `extras` argument:
  `submit(extras?)` merges `extras` into the value map at post time (extras win
  on key collision). Backwards-compatible — `submit()` with no args is
  unchanged. Useful for submit-only fields that should not live in the
  user-editable form state.
- New `FormulirElementSlot` value `'captcha'` for theming the widget wrapper
  via `appearance.elements.captcha`.
- New error codes surfaced through `humanMessage`: `CAPTCHA_REQUIRED` (400),
  `CAPTCHA_FAILED` (403), `CAPTCHA_NOT_CONFIGURED` (503).
- CSP requirement (only when captcha is enabled): allow
  `script-src https://challenges.cloudflare.com` and
  `frame-src https://challenges.cloudflare.com`.

## 0.2.1

- Docs: add a "Hidden fields and pre-filled values" section to the README documenting the `values` prop on `<FormulirForm>` and the `?values[name]=value` URL syntax for the embed iframe. README didn't make it into the `0.2.0` tarball; `0.2.1` exists solely to publish the corrected docs. No code changes.

## 0.2.0

- New `values` prop on `<FormulirForm>` for pre-populating field values by name. Applied once when the form definition resolves; subsequent changes are ignored.
- Fields marked `hidden: true` in the form definition are skipped by the default renderer. Their values still flow into submissions — supply them via the new `values` prop or via `setValue()` in headless mode. `<FormulirForm.Headless>` is unaffected (consumer-controlled rendering).

## 0.1.0 — published

- First published release. (Version was published to npm as 0.1.0; source `package.json` lagged at `0.0.1` until 0.2.0.)
- Initial package skeleton: `FormulirProvider`, `FormulirForm`, `FormulirForm.Headless`, `useFormulirForm`.
- Baseline renderer for text, number, boolean, date, select, multiselect, media, plus textarea fallback for richtext/markdown and text-input fallback for json/repeater/blocks/component/relation.
- Tier-1 (CSS variables) and Tier-2 (`appearance` prop) theming. Tier-3 headless mode via `FormulirForm.Headless`.

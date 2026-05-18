# Changelog

## 0.4.1

### Patch Changes

- 48a254b: Relocate `@sawala/formulir-react` to the `sawala-tech/sdk-typescript` monorepo. No code or API changes — the published bundle is functionally identical to 0.4.0.

  The `package.json`'s `repository` field now points at the public source at https://github.com/sawala-tech/sdk-typescript/tree/main/packages/formulir-react, and the issue tracker at https://github.com/sawala-tech/sdk-typescript/issues is open for community bug reports and PRs.

  Releases from this version onward ship via npm Trusted Publishing (OIDC), with provenance attestations attached automatically.

## 0.4.0 — 2026-05-15

- New `locale` prop on `<FormulirProvider>` and `<FormulirForm>`. When set,
  the renderer resolves each field's label through `field.labels?.[locale]`,
  falling back through `field.labels?.[settings.defaultLocale]`, then
  `field.label`, then `field.name`. The post-submission success message
  resolves through the same chain via `settings.success.messages?.[locale]`,
  falling back through `settings.success.messages?.[settings.defaultLocale]`,
  then `settings.success.message`. Provider-level `locale` is overridden by
  any form-level `locale` on the same `<FormulirForm>`.
- New exported helpers `resolveLabel(field, locale, defaultLocale)` and
  `resolveSuccessMessage(success, locale, defaultLocale)` for consumers
  using `<FormulirForm.Headless>` or a custom renderer.
- Type widenings: `SchemaField` gains `labels?: Record<string, string>`;
  `FormSettings` gains `locales?: string[]` and `defaultLocale?: string`;
  the success-message variant of `FormSettings.success` gains
  `messages?: Record<string, string>`. New `Locale = string` type alias
  exported for documentation. All additions are optional and backwards
  compatible — existing consumers see no behavioural change.
- Skipped 0.3.x is reserved for the prior Turnstile work; this minor advances
  to 0.4.0 because it adds new public-API surface (the `locale` prop and
  helper exports). Fully additive — no migration required.

## 0.3.1 — republish of 0.3.0

- **Bad publish in 0.3.0**: the `0.3.0` tarball on npm shipped a stale pre-Turnstile bundle (21 KB) under the bumped version string. A fresh `npm run build` from main produces the correct ~26 KB bundle containing `renderTurnstile`, `cf-turnstile-response`, the `captcha` slot, and the new error codes — none of which made it into `0.3.0`. Result: every consumer of `0.3.0` got a no-op for spam protection regardless of dashboard configuration.
- **Fix**: `0.3.1` is a clean rebuild with all the `0.3.0` features actually present in the tarball.
- **Guardrail**: added a `verify-bundle` script that fails publish when the built `dist/index.js` lacks markers present in `src/`. Chained into `prepublishOnly` so a future stale-dist publish aborts before it lands on npm.
- **No code or API changes** compared to the intended `0.3.0`. Consumers on `^0.2.x` should jump straight to `^0.3.1`.

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

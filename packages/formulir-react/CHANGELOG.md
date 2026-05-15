# Changelog

## 0.2.0

- New `values` prop on `<FormulirForm>` for pre-populating field values by name. Applied once when the form definition resolves; subsequent changes are ignored.
- Fields marked `hidden: true` in the form definition are skipped by the default renderer. Their values still flow into submissions — supply them via the new `values` prop or via `setValue()` in headless mode. `<FormulirForm.Headless>` is unaffected (consumer-controlled rendering).

## 0.1.0 — published

- First published release. (Version was published to npm as 0.1.0; source `package.json` lagged at `0.0.1` until 0.2.0.)
- Initial package skeleton: `FormulirProvider`, `FormulirForm`, `FormulirForm.Headless`, `useFormulirForm`.
- Baseline renderer for text, number, boolean, date, select, multiselect, media, plus textarea fallback for richtext/markdown and text-input fallback for json/repeater/blocks/component/relation.
- Tier-1 (CSS variables) and Tier-2 (`appearance` prop) theming. Tier-3 headless mode via `FormulirForm.Headless`.

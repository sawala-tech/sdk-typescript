---
"@sawala/akuna-react": minor
---

Add Clerk Organizations support: re-export `OrganizationSwitcher`, `OrganizationProfile`, and `CreateOrganization`, and add `useMemberOrganization()` / `useMemberOrganizationList()` hooks (Akuna-named wrappers over Clerk's organization hooks). The connection's `config.organizationsEnabled` (from `useMembershipConfig()`) tells you whether to render organization UI.

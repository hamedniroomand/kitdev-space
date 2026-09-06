Write in ASD-STE100.

Follow `docs/writing-rules.md` for all human-readable technical English.

Follow `docs/tool-architecture.md` for every tool in the hub. It states where the work runs, how
the registry drives the page copy, and how analytics is wired.

### VueUse First

Use VueUse before writing custom Vue composables or utility logic.

When you need functionality in a Vue component, first check if VueUse provides a suitable composable or utility.

Prefer an existing VueUse solution when it meets the requirement.

Do not create a custom composable when VueUse already provides the required functionality.

If VueUse does not provide a suitable solution, implement the smallest custom solution that meets the requirement.

### Icon Rules

Never use the `i-lucide-sparkles` icon. Use a specific semantic icon instead (such as `i-lucide-database`, `i-lucide-file-text`, `i-lucide-refresh-cw`, or `i-lucide-folder-open`).

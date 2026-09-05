# Accessibility Checklist (Phase 1)

Use this checklist when you review the homepage and tool pages.

## Checks

1. The user can reach main actions with the keyboard.
2. Focus is visible on interactive controls.
3. Form fields have labels.
4. Error text is available to assistive technology (`ToolError` / `UAlert`).
5. Primary UI meets contrast needs for body text and controls.
6. `⌘Enter` runs the primary action on tool pages.
7. `⌘K` opens tool search.

## Manual pass notes

- Homepage search control is labeled.
- Tool editors use `UFormField` labels.
- Color contrast warnings from `@nuxt/a11y` need review on primary buttons in light and dark modes.

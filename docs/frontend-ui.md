# Frontend UI conventions

All three Vite apps use Tailwind v4 through `@tailwindcss/vite`. Shared source-owned components and theme live in `packages/ui`, matching each app's `components.json`. Import primitives by subpath, for example `@vinlook/ui/button`; keep feature components and state in their app.

## Authoring

Use utilities in JSX for layout, spacing, typography, responsive behavior and states. Reuse `vinlook-*` color tokens in the shared theme. Use `cn()` for conditional classes and CVA for reusable variants. Extend the theme when a value is a real design decision shared across screens. Existing pixel-specific values preserve the current layouts: the apps have different root font sizes, so blindly replacing pixels with rem spacing changes their appearance.

`Button` and `Input` retain their styled defaults. The `custom` presentation is for existing feature designs whose utilities and scoped styles own their appearance. It does not inject default sizes, colors or layout. Always specify button type in forms; the migrated controls explicitly preserve the previous native submit behavior. New generic controls should use the styled defaults. `Textarea`, `NativeSelect` and `Table` preserve native semantics and accept feature-authored utility classes. Native select is deliberate for browser keyboard/mobile selection; file inputs and checkboxes keep native semantics too.

Use the shared Radix `Dialog` for new declarative modals and `AlertDialog` for consequential confirmations. The account lock confirmation uses Radix AlertDialog: cancel receives initial focus, Escape cancels, outside clicks do not confirm, and focus returns to its opener. Busy state blocks dismissal. `NativeDialog` is retained for the existing imperative `HTMLDialogElement` refs, browser top-layer behavior and mobile-sheet/map integrations. Do not mix imperative `showModal()` with Radix portals.

## CSS retained deliberately

- Global typography, inherited native-control foundation and application variable definitions.
- Leaflet markers, generated map DOM, attribution and map-library interaction selectors.
- Mobile sheet's runtime CSS variables, drag state, dynamic visual viewport and virtual-keyboard calculations.
- Native dialog backdrops, portal scope, animations and compound state/descendant selectors.
- Existing responsive/cascade combinations where moving one declaration alone would override a remaining shorthand or state selector. Preserve the complete property family until the whole interaction can be migrated and visually verified together.

This is a mixed migration: ordinary feature rules now have utilities, while these remaining rules continue to own their cascade. Do not add new component-specific CSS when utilities can express the behavior. Keep semantic class hooks used by tests, Leaflet or scoped selectors. Do not remove a rule without checking dialogs, errors and mobile states.

## Validation

Run `npm run check`. Interaction coverage includes the form payload/validation tests, monitoring CPU/RAM states, location sessions, mobile-sheet keyboard/drag behavior, and shared-control form/disabled/value semantics. Browser verification uses a local API fixture with a fixed POI, two users and fixed monitoring data; it does not write production data. Check at 1440px desktop and 390px mobile, plus overflow, modal cancellation/focus, form scrolling, discovery and route controls.

Actual GPS hardware, mobile OS keyboard behavior and external TTS/provider calls require device/provider testing; desktop viewport emulation and fixture data do not establish those results.

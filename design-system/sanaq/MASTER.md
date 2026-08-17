# SANAQ Design System

This document is the visual source of truth for the SANAQ learning platform. Page-specific specifications may extend these rules but must not replace semantic tokens or accessibility requirements.

## Product direction

SANAQ is an adaptive education product for students in grades 7–12 and their teachers. The interface is calm, clear, encouraging, and age-neutral. It must feel supportive rather than childish. The established lavender visual language is canonical; orange claymorphism, Comic Neue, and Pet Tech references are not part of SANAQ.

## Foundations

### Color roles

| Role | Tailwind token | CSS variable | Value |
|---|---|---|---|
| Canvas | `canvas` | `--color-canvas` | `#F7F6F2` |
| Surface | `paper` | `--color-paper` | `#FEFDF9` |
| Primary text | `ink` | `--color-ink` | `#232329` |
| Muted text | `stone-500/600` | `--color-muted` | `#696874` |
| Primary action | `lavender-600` | `--color-primary` | `#5B3FA8` |
| Primary soft | `lavender-100` | `--color-primary-soft` | `#E9E2FF` |
| Success | `mint-700` | `--color-success` | `#16735A` |
| Danger | `danger-700` | `--color-danger` | `#9B3D2D` |
| Danger soft | `danger-100` | `--color-danger-soft` | `#FFE8E2` |
| Warning | `warning-700` | `--color-warning` | `#6B550A` |
| Warning soft | `warning-100` | `--color-warning-soft` | `#FFF1BF` |
| Focus | `lavender-500` | `--focus-ring` | `#7459C9` |

Use semantic `danger` and `warning` tokens instead of raw hex values. Color must never be the only carrier of meaning.

### Typography

- Body: Manrope Variable, with Manrope and sans-serif fallbacks.
- Display: Unbounded Variable for short headings and key numeric values.
- Default body: 16 px, line height 1.6.
- Page title: responsive 30–48 px, compact tracking, `overflow-wrap:anywhere`.
- Minimum auxiliary text: 11 px only for uppercase metadata; never for essential instructions.

### Shape and depth

- Controls: 16 px radius (`rounded-2xl`).
- Cards and dialogs: 24–32 px radius (`rounded-3xl`/`rounded-4xl`).
- Standard card: subtle border plus `shadow-soft`.
- Overlay: `shadow-overlay`; avoid arbitrary one-off shadows.
- Hover must not cause layout shifts. Small transforms are allowed only when reduced motion is respected.

### Spacing

Use the Tailwind 4 px spacing scale. Standard control height is 48 px; compact controls are at least 44 px. Page gutters are 16 px on mobile, 24 px on tablet, and 32 px on desktop.

## Core components

### Buttons

Use the shared `Button` component. Supported variants: primary, secondary, dark, ghost, outline, success, and danger. Buttons always include visible focus, disabled, loading, hover, and active states.

### Inputs

Use `field-label`, `field-control`, or the shared `Input` component. Every field requires a programmatic label. Error text uses `danger` tokens and `role="alert"` when submitted.

### Cards

Use the shared `Card`/`surface-card`. Nested cards should rely on a soft background rather than stacking heavy shadows.

### Dialogs

Dialogs trap focus, close on Escape and overlay click, restore focus, and use a bottom-sheet layout on mobile. Footer actions stack on narrow screens.

### Feedback states

- Loading: `Skeleton` for content areas; a labeled spinner for actions.
- Empty: `state-empty` with a title, explanation, and optional action.
- Error: `state-error`, never raw red utility combinations.
- Success: mint surface plus icon and text.
- Warning: warning surface plus icon and text.

## Responsive rules

Validate at 320, 375, 768, 1024, and 1440 px. No horizontal page scrolling is allowed. Long RU/KK/EN text must wrap. Fixed controls must not cover mobile navigation or primary actions. Grids collapse to one column before content becomes cramped.

## Accessibility

- WCAG AA contrast: 4.5:1 for normal text, 3:1 for large text and meaningful UI graphics.
- Minimum target: 44×44 px.
- Full keyboard operation and visible focus.
- Correct headings, labels, landmarks, and live regions.
- Respect `prefers-reduced-motion` and the in-app reduced-motion setting.
- Support 200% zoom and large-text mode without lost content.
- Speech controls use the active RU/KK/EN locale.

## Localization

No user-facing string is written directly in a page component when it can be translated. RU, KK, and EN expose identical key sets; automated tests enforce parity. Dates and numbers use locale-aware formatters.

## Pre-delivery checklist

- No raw hex colors in JSX.
- Shared components used for common controls and feedback.
- Loading, empty, error, disabled, and success states covered.
- Keyboard and screen-reader labels verified.
- 320–1440 px layouts checked.
- RU/KK/EN wrapping checked.
- Reduced motion and 200% zoom checked.
- Tests and production build pass.

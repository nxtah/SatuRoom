# UX and Visual Principles

## Character
Friendly, calm, modern, practical, polished. Avoid the feel of a generic admin template.

## Principles
1. Clarity before density.
2. One obvious primary action per screen.
3. Progressive disclosure: reveal advanced options when needed.
4. Plain language familiar to owners, managers, coaches, and parents.
5. Explain why unfamiliar/sensitive information is requested.
6. Preserve progress and communicate unsaved changes.
7. Prevent errors with sensible defaults, inline validation, confirmations, and undo where practical.
8. Empty states explain purpose and next action.
9. Dashboards prioritize actions and exceptions; metrics must support a decision.
10. Similar actions should behave consistently.

## Avoid
Walls of cards, meaningless KPI tiles, accidental empty space, too many borders/badges/colors, tiny low-contrast text, decorative charts without value, competing primary buttons, dead controls, fake live data, unlabeled ambiguous icons, unexplained jargon, long setup forms, and errors visible only in console.

## Visual workflow
For each significant screen, state user goal, primary action, hierarchy, and loading/empty/populated/error/success/denied/narrow-screen states. Reuse tokens/components. Implement a working flow, not only a screenshot. Inspect representative viewports and fix visible issues.

## Design system
Document semantic color roles, typography, spacing, radii/elevation, breakpoints, focus states, forms, buttons, navigation, lists/tables, dialogs, toasts, empty states, and loading patterns. Use a limited purposeful palette. Do not invent approved logo/colors if no approved assets exist; inspect repo first.

## Accessibility/responsive
Semantic HTML, keyboard support, visible focus, proper labels/errors, contrast, reduced-motion consideration, and status not conveyed by color alone. Define a sensible small-screen strategy for data-heavy views. Responsive web is not a native mobile app.

## Onboarding hypothesis
Welcome/explain benefit → essential academy details → invite staff now or later → create first squad → add first player → schedule first session → completion summary/next action. Validate sequence. Allow skipping nonessential steps and resuming progress.

# Pixel Agents — Design System

A design system for an AI-agents-as-an-office product. The visual model is **dark modern chrome wrapping pixel-art content**: an isometric pixel office where each agent is a tiny character, surrounded by a contemporary dark dashboard (sidebar, stat tiles, charts, panels).

## Visual DNA
- **Surfaces:** deep midnight (#0E1424 → #2B3650) — five steps of a cool, slightly warm dark scale
- **Brand accents:** six function-coded gradients for the stat-tile family
  - Blue (Email), Purple (Calendar), Green (Tasks), Orange (Jobs), Teal (API/cost), Pink (Agents)
- **Type:** Inter (UI) · JetBrains Mono (data, time codes) · Press Start 2P / VT323 (pixel labels & speech bubbles inside the office scene)
- **Borders:** thin 1px slate hairlines (#28324A) instead of shadows for separation; soft drop shadows reserved for elevated tiles
- **Pixel content:** rendered with `image-rendering: pixelated` — see `.pixelated` utility

## Files
- `colors_and_type.css` — design tokens (CSS variables) + type role utilities
- `assets/imagery/office-hero.png` — the full reference (uploaded)
- `assets/imagery/office-scene.png` — cropped pixel office scene (used in UI kits)
- `preview/` — tokens & components review cards (Colors, Type, Components, Spacing, Brand)
- `ui_kits/office-dashboard/` — full desktop dashboard
- `ui_kits/mobile/` — three-screen mobile companion

## Principles
- **Function = color.** The six accent hues are role-coded; never use them decoratively.
- **Pixel inside, modern outside.** Pixel fonts and pixel art are reserved for the office scene; everything chrome stays Inter and crisp SVG.
- **Hairline > shadow.** Use 1px borders for separation in dark mode; only stat tiles + dropdowns get a subtle shadow.
- **WCAG.** All text on tinted surfaces tested against AA. Pair `--fg-primary` with surfaces ≤ `--bg-surface-3`.

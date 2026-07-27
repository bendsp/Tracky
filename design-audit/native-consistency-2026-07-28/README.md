# Tracky native consistency audit — 2026-07-28

## Scope

Current iOS Simulator review of the Track overview, tracker detail, tracker editor,
icon picker, Settings, Privacy, and light/dark appearances. The audit focused on
visual hierarchy, sizing, theming, native interaction patterns, and the new
habit-color boundary.

## Product rule

- Tracky chrome and content remain monochrome.
- A tracker color appears only in the tracker editor's color grid and as the
  completion ring around that tracker's icon.
- Neutral is the default tracker color. It resolves to white in dark mode and
  near-black in light mode.
- Destructive actions may use the system danger color.

## Findings and changes

1. **Healthy — root hierarchy:** Track and Settings now share the same 28 pt,
   semibold root title and 16 pt horizontal page margin.
2. **Healthy — secondary hierarchy:** grouped-section and icon-category titles
   use a quieter 17 pt semibold role. Privacy article headings use a distinct
   20 pt role instead of competing with screen titles.
3. **Healthy — habit color containment:** the tracker editor exposes an
   accessible 12-swatch grid. The overview and detail screens render the chosen
   color only as a 3 pt completed-state ring; icons and all surrounding UI stay
   monochrome.
4. **Healthy — native surfaces:** full-height flows continue to use the shared
   native sheet surface and circular header actions. Settings retains native
   segmented controls and grouped rows.
5. **Healthy — touch and semantics:** color swatches are 44 by 44 pt, expose
   selected accessibility state, and use selection haptics. Shared sheet,
   screen, section, and icon-picker titles expose heading semantics.
6. **Watch — proof boundary:** screenshots and the runtime accessibility tree
   verify visible layout and target semantics, but do not replace a dedicated
   VoiceOver, maximum Dynamic Type, or physical-device haptic pass.

## Captures

- `01-track-overview.jpg` — overview baseline
- `03-settings.jpg` — standardized Settings hierarchy
- `04-tracker-detail.jpg` — tracker detail structure
- `06-icon-picker.jpg` — reduced icon-category hierarchy
- `07-track-color-ring.jpg` — completed neutral ring in dark mode
- `08-new-tracker-color-grid-light.jpg` — neutral default in light mode
- `10-new-tracker-color-grid-dark.jpg` — neutral default in dark mode

## Verification

- `npm run typecheck`
- `npm test` — 26 passing
- `git diff --check`
- Existing `Codex iPhone 17` simulator only; no simulator was created.
- Dark and light color-grid rendering checked in the running iOS app.
- Completion ring toggled in the running iOS app, then the test state was
  restored to incomplete and appearance was restored to System.

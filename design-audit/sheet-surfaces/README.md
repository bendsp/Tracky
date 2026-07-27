# Sheet Surface Audit

## Scope

Tracky's native form-sheet routes and reusable Expo UI sheets in dark
appearance, verified on the existing Codex iPhone 17 Simulator at 368 × 800.

## Flow

1. **Tracker detail before — needs correction**
   - Evidence: `01-detail-before.jpg`
   - The detail route used the app canvas color for both its native navigation
     header and content. Against the black presenting screen, the full-height
     form sheet lost its visible boundary.
2. **Tracker detail after — healthy**
   - Evidence: `02-detail-standardized.jpg`
   - The native header and content now share Tracky's raised sheet surface.
     The rounded top edge reads clearly while cards preserve their existing
     hierarchy and contrast.
3. **Nested tracker editor — healthy**
   - Evidence: `03-editor-reference.jpg`
   - The editor uses the same raised sheet token through the reusable `Sheet`
     component. Opening and closing it above tracker detail preserves native
     stacked-sheet behavior.

## System Findings

- Native route sheets now receive one shared Expo Router configuration from
  `nativeSheetOptions`.
- React Native content mounted inside native route sheets now uses
  `NativeSheetScreen`, which owns the shared sheet background.
- Expo UI sheets already use `Sheet`, so all currently reachable sheet
  presentations resolve to `theme.colors.sheetBackground`.
- Destructive confirmations, import results, and error prompts use native iOS
  alerts rather than custom modal surfaces.

## Accessibility

- Existing close and edit controls retain explicit accessibility labels and
  native button roles.
- The surface change improves visible sheet boundaries without changing focus,
  reading order, or gesture dismissal.
- Screenshot and runtime-tree inspection cannot prove VoiceOver announcement
  timing; that remains a device-level verification item.

## Result

No actionable high- or medium-priority sheet-surface inconsistency remains in
the currently reachable Track, tracker detail, tracker editor, icon picker, and
Settings flows.

# Tracker goal editor design QA

- Source visual truth:
  `/Users/ben/.codex/generated_images/019f8f36-2d3c-7a12-a41a-9c3b383b0ade/call_MQt76DwcI1SYsPHeOt8D9m5X.png`
- Implementation screenshot:
  `/var/folders/_b/g355wxdn0xqc1f5cr2b49p8c0000gn/T/screenshot_optimized_cfb85a9e-c235-413d-8da1-3d9398dfd955.jpg`
- Combined comparison:
  `/tmp/tracky-goal-comparison.png`
- Source pixels: 853 × 1844
- Implementation pixels: 368 × 800
- Viewport: existing Codex iPhone 17, iOS 26.2, dark appearance
- State: new tracker, neutral color, target 3 times every week, start date today
- Density normalization: source and implementation were each scaled to 800 px
  high and placed side by side in the same 738 × 800 comparison image.

## Full-view comparison

The implementation preserves the selected hierarchy and visual direction: a
small centered sheet title with glass actions, one icon preview, rounded name
input, compact color grid, and one grouped Goal surface. The goal sentence below
the card is intentionally absent because the user explicitly asked to remove
it.

## Focused comparison

No separate crop was needed because the normalized side-by-side comparison keeps
the complete Goal surface readable. The stepper, `times every` copy, native menu,
divider, calendar icon, start-date label, and compact date value are visible in
both artifacts.

## Required fidelity surfaces

- **Fonts and typography:** system typography and Tracky's regular/medium
  hierarchy match the native-feeling reference; labels remain legible without
  adding decorative type.
- **Spacing and layout rhythm:** both rows now use one 56 pt rhythm. The custom
  stepper, native period menu, and date value share a 36 pt control height,
  capsule rounding, and a single hairline separator. The date row no longer
  expands to the height of an embedded calendar.
- **Colors and visual tokens:** app chrome remains monochrome and uses Tracky's
  existing sheet, surface, border, and secondary-text tokens.
- **Image and asset fidelity:** the screen uses existing Hugeicons and native
  Expo controls; no handcrafted SVG, emoji, or placeholder asset was added.
- **Copy and content:** `Goal`, `times every`, `Week`, `Start Date`, and `Today`
  are concise. The unwanted explanatory sentence is removed.
- **Behavior and accessibility:** plus/minus use labeled 44 pt controls, the
  period is a native menu, and Start Date is a labeled button that opens a
  stacked native graphical date sheet with Cancel and Done.

## Comparison history

1. The first implementation embedded a compact date picker directly in the
   Goal row. Its native host expanded unpredictably, producing a P1 broken
   layout and an unreliable control.
2. The embedded picker was replaced with a fixed-height Start Date button and a
   nested native date sheet. The row was reduced from 68 pt to 56 pt.
3. A follow-up hierarchy pass normalized both rows to 56 pt, all inline
   controls to 36 pt, and row text to a 16–17 pt native scale.
4. Post-fix simulator evidence confirms the sheet opens without dismissing the
   tracker editor, a date can be selected, Done returns the chosen date, and a
   new tracker defaults back to Today.

## Findings

No actionable P0, P1, or P2 mismatch remains for the selected direction.

## Follow-up polish

- P3: the implementation uses the platform-native menu indicator instead of the
  reference's heavier custom dropdown pill.

## Final result

final result: passed

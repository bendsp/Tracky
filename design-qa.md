# Tracker detail design QA

- Source visual truth:
  `/var/folders/_b/g355wxdn0xqc1f5cr2b49p8c0000gn/T/codex-clipboard-2c1e42c7-1729-47c5-abff-163003895118.png`
- Implementation:
  `design-qa-assets/tracker-detail-2026-07-28.jpg`
- Source pixels: 1206 × 2622
- Implementation pixels: 368 × 800
- Viewport: existing Codex iPhone 17, iOS 26.2
- State: dark appearance, Water checked in today, one total check-in
- Density normalization: both captures share the same 0.46 mobile aspect ratio;
  comparison focused on proportional layout because the source is a higher
  density capture.

## Full-view comparison

The implementation preserves the selected hierarchy from the reference: a
centered tracker identity and completion circle, a sparse stats surface, a
calendar surface, and a persistent bottom check-in action. The user explicitly
excluded the source progress card and score metric, so those omissions are
intentional rather than fidelity defects.

## Focused comparison

The completion area, stats card, and bottom action were inspected at full
resolution. The implementation uses Tracky's existing native sheet header,
monochrome tokens, Hugeicons tracker icon, 16 pt surface radius, and semantic
completion-ring color rather than copying the reference's segmented decorative
ring or unrelated header actions.

## Required fidelity surfaces

- **Fonts and typography:** system typography, semibold tracker name and stat
  values, compact secondary labels; hierarchy is clear at the target viewport.
- **Spacing and layout rhythm:** 16 pt page margin, 24 pt section rhythm, large
  116 pt completion circle, balanced two-column stats card.
- **Colors and visual tokens:** app chrome remains monochrome; only the completed
  tracker ring can use its assigned habit color.
- **Image and asset fidelity:** no raster imagery is required. Existing
  Hugeicons assets are used; no handcrafted SVG or placeholder asset was added.
- **Copy and content:** `Check In`, `Undo Check In`, `Streak`, and `Check Ins`
  are concise and match the requested model.

## Comparison history

1. Initial implementation still used a small horizontal status card and a
   sentence-style consistency card.
2. Replaced them with a centered completion circle and a two-column Streak /
   Check Ins card; changed the primary action to `+ Check In`.
3. Simulator verification confirmed immediate updates to completion ring,
   streak, check-in count, calendar, history, and undo state.

## Findings

No actionable P0, P1, or P2 mismatch remains for the explicitly selected parts
of the reference.

## Follow-up polish

- P3: revisit month navigation when scheduling frequency is implemented; the
  current calendar intentionally remains a read-only history view.

## Final result

final result: passed

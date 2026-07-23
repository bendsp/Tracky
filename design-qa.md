# Track V1 design QA

## Comparison target

- Source visual truth:
  - `/Users/ben/.codex/generated_images/019f8a39-0788-7191-befa-0a514d5fa3d0/call_smHCW7RprwBDNRguazRCpY5O.png` (Track overview)
  - `/Users/ben/.codex/generated_images/019f8a39-0788-7191-befa-0a514d5fa3d0/call_HzP6UBeAPUVAiHo2CJm0sbxS.png` (Add field)
  - `/Users/ben/.codex/generated_images/019f8a39-0788-7191-befa-0a514d5fa3d0/call_OC6XFokluO6DsIJMBcKHCStR.png` (Tracker history)
- Implementation screenshots:
  - `/var/folders/_b/g355wxdn0xqc1f5cr2b49p8c0000gn/T/screenshot_optimized_c9468f8f-718f-4280-8b86-f61ca29d0af2.jpg` (overview)
  - `/var/folders/_b/g355wxdn0xqc1f5cr2b49p8c0000gn/T/screenshot_optimized_e76583c6-d159-4ad8-8be5-e304e4cebe22.jpg` (Add field)
  - `/var/folders/_b/g355wxdn0xqc1f5cr2b49p8c0000gn/T/screenshot_optimized_1833d103-cb22-437c-86d2-0195c5822541.jpg` (grouped history)
- Combined comparison evidence:
  - `/tmp/tracky-overview-comparison-final.png`
  - `/tmp/tracky-add-field-comparison.png`
  - `/tmp/tracky-history-comparison-final.png`

## Viewport and normalization

- Device: Codex iPhone 17, iOS 26.2, dark appearance.
- Implementation viewport: 368 × 800 pixels, captured directly from the real iOS Simulator.
- Source images: 853 × 1844 pixels.
- CSS size/device scale factor: not applicable to the native Simulator capture.
- Density normalization: each 368 × 800 implementation capture was proportionally scaled to 1844 pixels high, producing an approximately 848 × 1844 comparison image beside the 853 × 1844 source. The five-pixel width difference is aspect-ratio rounding and was excluded from findings.
- State:
  - Overview: Drinking at 500 ml Today, Meditation visible, permanent New item, Track tab selected.
  - Add field: Choice type selected with the new-choice input visible.
  - History: Drinking at 500 ml Today, entries grouped into Today and Yesterday.
- The Expo development-client Tools control is visible over the upper-right corner of native screenshots. It is development chrome, not Tracky UI, and is excluded from the product findings.

## Full-view comparison evidence

- Overview preserves the reference hierarchy: tracker identity, large summary value, timeframe, restrained colored icon tile, sparse card surface, universal plus, and bottom navigation. The implementation intentionally uses the later-approved native Expo tab bar, compact native header, and permanent New row.
- Add field preserves the reference task structure with Name, a Choice/Number/Date segmented control, choice creation, explanatory copy, and a single completion action. It intentionally uses the requested native bottom sheet rather than the full-screen reference.
- History preserves the reference's text-first grouped chronology, summary identity, date sections, sparse entry rows, trailing values, and entry disclosure. The implementation intentionally uses the later-requested native fading header.

## Focused region comparison evidence

- Tracker cards: system typography has the same three-level hierarchy as the reference, Hugeicons stay optically centered, and accent colors remain restrained. The implementation is slightly denser by design, without clipping or cramped wrapping.
- Add-field controls: the native segmented control, text field, and completion button have consistent tap sizing and spacing. No icons were introduced on fields or choices.
- History rows: titles, times, values, notes, dividers, and disclosure affordances remain readable at native size. Today and Yesterday grouping was verified with real persisted entries.
- No standalone image assets are required in these screens; all visible pictograms come from the established Hugeicons/SF Symbols component system rather than handcrafted SVG or CSS art.

## Findings

No actionable P0, P1, or P2 visual findings remain.

- Typography: native San Francisco sizing and weights preserve the intended hierarchy; long values use one-line truncation where appropriate.
- Spacing/layout: 18–20 point outer margins, consistent card padding, native safe-area handling, and the transparent navigation-bar inset avoid overlap and preserve the compact direction.
- Colors/tokens: monochrome surfaces, semantic text tiers, and tracker-specific cool accents match the product direction and use reusable theme/tracker tokens.
- Image quality/assets: no raster imagery is used; library icons are sharp and consistently stroked.
- Copy/content: labels are functional and standalone. The universal optional note remains optional, fields and choices have no icons, and the New item is unambiguous.
- Accessibility/state: named buttons, adjustable reorder handles, native date/time controls, destructive confirmation, and 44-point-or-larger primary targets are present.

## Comparison history

### Iteration 1

- Earlier P2 finding: the Track title rendered as a separate large row while Edit occupied the bar above it, wasting vertical space and breaking the requested Teiimo-style native hierarchy.
- Earlier evidence: `/var/folders/_b/g355wxdn0xqc1f5cr2b49p8c0000gn/T/screenshot_optimized_8d02f04a-da1d-4fbe-984f-d961fd371e1a.jpg`.
- Fix: moved Track and tracker-history screens onto a shared native Stack configuration with `headerLargeTitle: false`, a transparent iOS header, the iOS 26 system progressive scroll-edge effect, and `contentInsetAdjustmentBehavior="automatic"` on both scroll views.
- Post-fix evidence:
  - `/var/folders/_b/g355wxdn0xqc1f5cr2b49p8c0000gn/T/screenshot_optimized_c9468f8f-718f-4280-8b86-f61ca29d0af2.jpg`
  - `/var/folders/_b/g355wxdn0xqc1f5cr2b49p8c0000gn/T/screenshot_optimized_1833d103-cb22-437c-86d2-0195c5822541.jpg`
- Result: title, back button, and Edit/Done now share the native bar; content scrolls beneath the system fade without being hidden.

## Primary interactions tested

- Fresh-state Drinking and Meditation seeds.
- Create a tracker and add Choice, Number, and Date fields.
- Add and immediately use a custom choice while logging.
- Optional note, native occurrence date/time controls, and summary rendering.
- Open and edit an entry.
- Today/Yesterday history grouping.
- Enter edit mode by long press.
- Drag reorder, destructive delete confirmation, and persistence.
- Global universal plus versus the Track screen's New tracker action.

## Runtime checks

- TypeScript: passed.
- Expo Doctor: 20/20 checks passed.
- Native iOS Simulator build: passed.
- No app-owned runtime error remained after the final reorder animation fix.

## Follow-up polish

- P3: repeat visual QA with the development-client Tools control disabled or a release build when preparing App Store screenshots.
- P3: populate Meditation with three real sessions for a marketing-style screenshot; this is sample state, not a product gap.

## Final result

passed

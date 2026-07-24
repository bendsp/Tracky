# New Tracker gateway design QA

**Source visual truth**

- `/Users/ben/.codex/generated_images/019f94b8-ffd4-7dc3-b73b-69b26fb784e1/call_4uqe6TVSHPRsFPU4yIn68MJo.png`
- Source pixels: 853 × 1844.

**Implementation evidence**

- Dark: `/var/folders/_b/g355wxdn0xqc1f5cr2b49p8c0000gn/T/screenshot_optimized_98350d09-056e-47d1-bd91-289a22406b8c.jpg`
- Light: `/var/folders/_b/g355wxdn0xqc1f5cr2b49p8c0000gn/T/screenshot_optimized_7877ad39-6326-42b3-b776-899956c3c7aa.jpg`
- Implementation pixels: 368 × 800.
- Runtime viewport: Codex iPhone 17 Simulator, iOS 26.2, 368 × 800 screenshot.
- Density normalization: the source was proportionally downsampled to 370 × 800 for the combined comparison; the implementation remained at its native 368 × 800 capture.
- Combined comparison: `/tmp/tracky-template-qa-comparison.png`.
- State: initial New Tracker gateway, dark appearance. Light appearance was checked separately.

**Findings**

- No actionable P0, P1, or P2 differences remain.
- Fonts and typography: the implementation preserves Tracky’s current native typography and hierarchy. It is more compact than the conceptual reference but retains the same title, intro, section heading, row labels, and emphasis.
- Spacing and layout rhythm: the grouped example rows and separate custom row match the reference hierarchy. Insets, separators, radii, and section spacing are native and consistent in both appearances.
- Colors and visual tokens: the gateway uses Tracky’s semantic background, text, border, and cool-blue accent tokens in dark and light modes.
- Image quality and asset fidelity: every visible icon comes from the existing Hugeicons integration. Water uses the droplet, Workouts uses the running figure, Reading uses the book, and Custom tracker uses the plus. No placeholder or code-drawn assets are present.
- Copy and content: `New Tracker`, the approved intro sentence, the three approved template names, and `Custom tracker` match the handoff exactly.
- Affordances: all four rows have native disclosure chevrons and full-row hit targets. The close button remains the existing accessible native-feeling control.

**Focused comparison**

The full-view combined comparison is readable enough to inspect title hierarchy, exact copy, all four icons, row spacing, separators, radii, colors, and chevrons. No smaller focused crop was necessary.

**Primary interactions tested**

- Water, Workouts, Reading, and Custom tracker each open the editable tracker form.
- Template names, icons, fields, summary calculation, and timeframe arrive prefilled.
- Editing the prefilled name works.
- Closing a template draft creates nothing.
- Creating Reading uses the normal tracker persistence path and survives app termination and relaunch.
- Editing the created tracker opens the existing edit form directly rather than the template gateway.
- Accessibility snapshots expose all four gateway rows as labeled buttons.

**Comparison history**

1. Initial Simulator capture showed only Water and Workouts because the embedded native form had insufficient measured height. This was a P1 because two required actions were inaccessible.
2. The gateway received a viewport-aware content height. The revised dark and light captures show Water, Workouts, Reading, and Custom tracker without clipping.
3. Native interaction testing found the example-row hit region did not include the spacer area. A rectangular native content shape was added, and all three example rows then opened reliably from their full row target.

**Follow-up polish**

- P3: the approved concept uses a larger editorial title and taller rows. The implementation intentionally keeps Tracky’s existing compact native sheet typography and row density.

**Count-label annotation regression**

- Before: `/var/folders/_b/g355wxdn0xqc1f5cr2b49p8c0000gn/T/screenshot_optimized_fb5cc9be-8bb0-49b5-adf7-74130d194a9c.jpg`
- After: `/var/folders/_b/g355wxdn0xqc1f5cr2b49p8c0000gn/T/screenshot_optimized_95c27d37-25fd-49f9-9df8-cf6a8c027ae0.jpg`
- Combined comparison: `/tmp/tracky-count-label-spacing-comparison.png`.
- The original React Native label and native SwiftUI text field were measured by separate layout systems, allowing the field surface to paint over the caption.
- The shared field now renders its caption and input in one native SwiftUI vertical stack. The Count label and Name states both keep a clear native spacing rhythm, full-width field surface, and existing accessibility label.
- No actionable P0, P1, P2, or P3 issue remains in the annotated region.

**Final result**

final result: passed

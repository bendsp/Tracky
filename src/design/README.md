# Tracky design system

Tracky aims to be indistinguishable from a first-party iOS app. When in doubt,
do what Settings.app, Reminders or Fitness does — not what a web design system
does. Everything below is enforced by `theme.ts`; if you find yourself writing a
raw number, you're off-system.

## Typography

`type` in `theme.ts` is the iOS text-style ramp at the default Dynamic Type
size, rendered in SF Pro (the system font — Tracky loads no custom face). The
token names match the SwiftUI `textStyle` vocabulary exactly, so the same word
works in React Native and in `@expo/ui` modifiers:

```tsx
<Text style={[type.footnote, { color: theme.colors.textSecondary }]} />
<NativeText modifiers={[font({ textStyle: 'footnote' })]} />
```

| Token | Size | Weight | Line height | Tracking | Use for |
| --- | --- | --- | --- | --- | --- |
| `largeTitle` | 34 | 700 | 41 | +0.37 | reserved for native headers |
| `title` | 28 | 700 | 34 | +0.36 | stat values |
| `title2` | 22 | 600 | 28 | +0.35 | sheet hero titles |
| `title3` | 20 | 600 | 25 | +0.38 | article headings, empty-state titles |
| `headline` | 17 | 600 | 22 | −0.41 | row titles, button labels |
| `body` | 17 | 400 | 22 | −0.41 | primary copy, form row labels |
| `callout` | 16 | 400 | 21 | −0.32 | secondary inline controls |
| `subheadline` | 15 | 400 | 20 | −0.24 | row detail lines |
| `footnote` | 13 | 400 | 18 | −0.08 | section headers, timestamps, captions |
| `caption` | 12 | 400 | 16 | 0 | calendar cells, dense numerics |
| `caption2` | 11 | 400 | 13 | +0.06 | last resort |

The per-size tracking is the point. Apple's curve runs negative through the
reading sizes and turns positive at display sizes; a single blanket
`letterSpacing` is wrong at both ends.

**Rule: never write `fontSize`, `fontWeight`, `lineHeight` or `letterSpacing`
outside `theme.ts`.** Pick the closest token. `fontVariant: ['tabular-nums']` is
fine — it isn't a size.

Because `<Text>` scales with Dynamic Type by default, prefer `minHeight` over
`height` on anything containing text.

## Section headers

There is exactly one: `SectionHeader` in `src/components/Screen.tsx`. Footnote,
`textSecondary`, sentence case, sitting *above* a grouped card and never inside
one. It adds no horizontal padding, so it aligns to the leading edge of the
cards it labels — render it in the same container as them.

Do not invent all-caps headers, bolder variants, or in-card titles.

## Radius

```ts
radius = { sm: 8, md: 16, pill: 999 }
```

- `sm` — small icon tiles, inline chips
- `md` — cards, grouped containers, rows
- `pill` — circles, capsules, buttons

**Anything at `md` also sets `borderCurve: 'continuous'`**, which gives Apple
squircle corners instead of circular arcs. This is one of the strongest "native"
tells in the app and it is free.

No raw `borderRadius` numbers.

## Surfaces

Two background contexts, mirroring UIKit's `systemBackground` /
`systemGroupedBackground` split:

| Context | Screen background | Cards on it |
| --- | --- | --- |
| Plain (Track) | `background` | `surface` |
| Grouped (Settings, every sheet) | `groupedBackground` | `groupedSurface` |

In light mode a card is *darker* than a plain background and *lighter* than a
grouped one. That inversion is why one surface token can't serve both — pick the
pair that matches the screen you're on.

`surfaceMuted` is for pressed states and inset controls (steppers). Wells cut
*into* a card — the circle behind a tracker icon — use `background`.

## Navigation

Tab screens and pushed screens use `nativeStackOptions` from
`src/navigation/screenOptions.ts`: native large titles that collapse on scroll,
transparent header, Liquid Glass on iOS 26 and an explicit blur below it.

Two constraints come with large titles:

1. The `ScrollView` must be the screen's **first child**, or the title won't
   collapse.
2. It must set `contentInsetAdjustmentBehavior="automatic"`.

Header actions are `Stack.Toolbar` / `Stack.Toolbar.Button` with SF Symbol
names — not custom views in the content area.

Modals use `nativeSheetOptions`: full-height native form sheets.

Screens inside `(tabs)` add `tabBarInset` to their scroll content padding. Don't
hand-roll a clearance number.

## Progress ring

`TrackerProgressRing` wraps a tracker icon with one segment per required
check-in in the current goal period, filled in the tracker's colour as they're
logged — a "3 times per day" tracker with one check-in shows one of three
segments filled. This is currently the only place a tracker's colour appears, so
don't add a second, competing indicator.

The geometry lives in `progressRing.ts`, kept free of React Native imports so it
stays unit-testable (`tests/progressRing.test.ts`). Rules baked into it:

- A goal of 1 draws an unbroken circle, not a single segment with a gap.
- Segments tile the circumference exactly: `dash + gap === unit`.
- The pattern is shifted by `startOffset` (half a gap) so gap *centres* land on
  multiples of `unit`, putting one gap at 12 o'clock and making the ring
  symmetric about the vertical axis. Drawing the first segment's edge at the top
  instead makes the whole ring look rotated — it's the obvious-looking version
  and it's wrong.
- Gaps must exceed `strokeWidth`, because round caps eat `strokeWidth/2` at each
  end of every dash.
- Above `MAX_RING_SEGMENTS` (12) the arcs stop being readable, so the ring
  degrades to one continuous proportional arc.
- `count` is clamped into `[0, target]` — logging past the goal can't overfill.

Use `colors.separator` for the unfilled track and `resolveHabitColor` for the
fill.

**Stroke width is derived from `size` (`RING_STROKE_RATIO`, 7.5% of diameter)
and is not a prop.** Both terms of the gap formula scale with size too, so the
ring is scale-invariant: a 56pt list ring and a 116pt hero ring are the same
shape, not merely similar ones. Passing fixed pixel widths per call site is what
made the hero ring look thinner than the list ring — don't reintroduce it.

## Selection grids

Habit colours and tracker icons share `selectionTile` in
`src/components/tracking/selectionTile.ts` — same 56pt circle, same 3pt ring in
`colors.text`. Colour swatches additionally draw a checkmark, because the
swatch's own fill is the content and a ring alone would be ambiguous; icon tiles
don't need one.

## Haptics

Already consistent, keep it that way: `successHaptic` when a goal completes,
`tapHaptic` for navigation and undo, `selectionHaptic` for picker changes.

## Known exception

`src/components/calendar/*`, `UniversalAdd`, `Sheet`, `TrackerEntryForm`,
`EmptyState` and `app/log-tracker.tsx` belong to a first-generation calendar
feature that is currently unreachable — `app/(tabs)/calendar.tsx` has no
`NativeTabs.Trigger`. Its tokens have been migrated so it still compiles and is
on-system, but its *layout* is deliberately frozen pending a redesign. Don't
restyle it; don't treat it as a reference either.

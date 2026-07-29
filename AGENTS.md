# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

Prefer native primitives over hand-rolled ones wherever the SDK offers them:
`@expo/ui/swift-ui` controls, `Stack.Toolbar`, `NativeTabs`, native large-title
headers, `expo-glass-effect`. Tracky targets iOS only (deployment target 16.4),
so glass and iOS 26 features need a fallback path, not a guard that drops them.

# Design system

**Read `src/design/README.md` before writing any UI.** It is short and it is
binding. The rules that get broken most often:

- Never write `fontSize`, `fontWeight`, `lineHeight` or `letterSpacing` outside
  `src/design/theme.ts`. Use a `type` token.
- Never write a raw `borderRadius` number. Use a `radius` token, and pair
  `radius.md` with `borderCurve: 'continuous'`.
- There is exactly one section header: `SectionHeader` in
  `src/components/Screen.tsx`. Don't invent another.
- Pick the surface pair that matches the screen: `background`/`surface` on plain
  screens, `groupedBackground`/`groupedSurface` on Settings and every sheet.

`src/components/calendar/*`, `UniversalAdd`, `Sheet`, `TrackerEntryForm`,
`EmptyState` and `app/log-tracker.tsx` are a frozen first-generation feature
that is currently unreachable. Keep them compiling; don't restyle them.

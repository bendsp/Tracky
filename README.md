# Tracky

Track what you did and the things that happened, without being told what is
worth tracking.

Tracky is an iOS-first personal timeline and event logger. It combines:

- **Activities** — time intervals such as Working, Chores, Reading, or Resting.
- **Tracked events** — discrete observations such as a coffee, 500 ml of water,
  a medication, a mood, or anything else the user defines.
- **One universal `+`** — a thumb-reachable action available from every main
  view for switching activity or logging an event.

## Product shape

The primary view is a day timeline. Starting a new activity ends the current
one. Everything can be corrected retrospectively because real life is messy
and people will forget to switch.

The Track view lets the user define reusable event types without Tracky
prescribing what matters. A tracker can eventually support a count, amount and
unit, rating, yes/no value, or note. The first version should implement only
the smallest subset that feels genuinely useful.

See [docs/PRODUCT.md](docs/PRODUCT.md) for the product brief and MVP boundary.

## Principles

- Local-first and useful without an account.
- Fast enough to capture something in a few seconds.
- Flexible without becoming a custom database builder.
- Reflection over judgement: no guilt, streak pressure, or unsolicited health
  claims.
- Manual and retrospective before automatic background surveillance.

## Initial MVP

1. Day timeline with one current activity.
2. Switch activity from the universal `+`.
3. Edit the start/end time of past activity blocks.
4. Create a simple tracker with a name and optional unit.
5. Log an event with an optional numeric amount and note.
6. Browse today's events and activity timeline.
7. Persist everything on-device.
8. Export or delete all local data.

Week summaries, widgets, Shortcuts, sync, shared tracking, automated insights,
HealthKit, location, and background sensing are intentionally later decisions.

## Technology

- Expo 57
- React Native
- TypeScript
- iOS only for the first release

The repository contains the first functional vertical slice: a persistent local
timeline, user-defined trackers and events, native Liquid Glass navigation, and
on-device export/delete controls. The UI uses one shared token system and
Hugeicons so new screens inherit the same visual language.

## Development

```sh
npm install
npm run ios
npm run typecheck
```

Before creating an App Store build, choose and reserve a unique iOS bundle
identifier, add the public privacy-policy URL, and configure EAS Build/Submit.

## License

[MIT](LICENSE)

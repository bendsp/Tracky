# Tracky product brief

## The idea

Tracky answers two related questions:

1. How did I spend my time?
2. What happened during that time?

Activities form a continuous, editable timeline. Events are discrete
observations. Users define both using their own language.

Examples:

- Working from 09:10 to 11:45
- Coffee, 250 ml, at 10:30
- Chores from 11:45 to 12:20
- Medication, one tablet, at 12:05

Tracky should not assume that coffee, medication, mood, exercise, or anything
else is universally important. The user decides what exists.

## Core interaction

Every main view has one large, thumb-reachable `+`.

Tapping it opens two immediate choices:

- Switch activity
- Log an event

The sheet should remember recent choices so common actions take very few taps.
Switching activity ends the previous block and begins the new one at the same
timestamp. Logging an event must not interrupt the current activity.

Long-pressing or expanding the action can expose retrospective entry, but the
primary tap path should always optimize for “right now.”

## Information architecture

### Today

The default view:

- current activity and elapsed time;
- today's vertical timeline;
- event markers placed alongside activity blocks;
- gaps and overlaps made easy to correct;
- previous/next day navigation.

### Week

A compact comparison of days and activity totals. This is for reflection, not
performance scoring.

### Track

Manage user-defined event types and browse their histories. A tracker contains:

- name;
- icon and color;
- value type;
- optional default unit;
- recent/default values;
- archived state.

### Settings

- export data;
- delete all data;
- appearance and time format;
- later: backup/sync and integrations.

## Visual direction

Tracky should feel quiet, precise, and native:

- predominantly monochrome surfaces, typography, dividers, and controls;
- restrained use of one cool-blue accent for the current activity, primary
  action, selection, and meaningful timeline emphasis;
- no rainbow category system or large decorative gradients;
- hierarchy should come primarily from spacing, typography, weight, and
  contrast—not from filling every object with color;
- the universal `+` remains visually obvious and thumb-reachable without
  overwhelming the timeline.

The accent must be represented as a semantic design token rather than embedded
throughout components. Cool blue is the initial default, but the model should
allow user-selectable accents later while preserving contrast and accessibility
in light and dark mode.

## Data model

The first implementation can stay deliberately small:

```text
ActivityType
  id, name, icon, color, archivedAt

ActivityBlock
  id, activityTypeId, startedAt, endedAt, note

Tracker
  id, name, icon, color, valueType, defaultUnit, archivedAt

TrackedEvent
  id, trackerId, occurredAt, numericValue, unit, note
```

All records should have creation/update timestamps. Editing an activity block
must preserve a valid timeline and explain how neighboring blocks move.

## MVP boundary

Ship:

- local on-device storage;
- activity switching and retrospective editing;
- simple user-defined trackers;
- numeric amount, optional unit, and note;
- day timeline and basic week totals;
- export and delete;
- accessibility, Dynamic Type, dark mode, and VoiceOver labels.

Do not ship initially:

- login or cloud accounts;
- social or shared data;
- ads or third-party behavioral analytics;
- location or continuous background tracking;
- HealthKit;
- medical advice, diagnosis, or claims;
- AI-generated correlations;
- streaks or punitive notifications;
- an unrestricted form/schema builder.

## App Store posture

The lowest-risk first release is an offline personal utility:

- no account;
- no off-device collection;
- no advertising or tracking SDK;
- no protected-system permissions;
- no medical positioning;
- an accessible in-app privacy policy and matching public URL;
- clear export and delete controls.

This does not guarantee approval, but it keeps the privacy declaration and
review surface straightforward. If syncing, analytics, HealthKit, location, or
accounts are later added, the privacy disclosures and in-app controls must be
revisited before release.

## Open product decisions

- Is a day required to have complete coverage, or may it contain empty gaps?
- When a past block is expanded, should its neighbor shrink automatically?
- Which event value types earn inclusion in version one?
- Should recent events be loggable with one tap using their previous value?
- Is the week view necessary for 1.0, or should the day capture loop ship first?
- What neutral App Store category and wording best avoid accidental health
  positioning?

## First vertical slice

A useful first build needs only:

1. persistent activity types;
2. one current activity;
3. an editable day timeline;
4. persistent trackers and events;
5. the universal `+`;
6. local export/delete.

If that loop feels fast and pleasant for a week of real use, the product has
earned summaries and integrations.

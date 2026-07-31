import type {
  LocalDate,
  TrackyData,
} from '../domain/models';
import {
  addLocalDays,
  buildDayPlan,
  localDateAtNoon,
} from '../domain/planning';
import { localDateKey } from '../domain/tracking';

export const PLANNING_NOTIFICATION_HORIZON_DAYS = 14;
export const MAX_PLANNING_NOTIFICATIONS = 48;

export type PlanningNotificationSpec = {
  body: string;
  data: {
    entityId: string;
    forDate: LocalDate;
    kind: 'routine' | 'task' | 'tracker';
    trackyPlanning: true;
    url: string;
  };
  title: string;
  triggerAt: Date;
};

type PlanningData = Pick<
  TrackyData,
  'events' | 'routineProgress' | 'routines' | 'tasks' | 'trackers'
>;

function dateAtTime(date: LocalDate, time: string) {
  const result = localDateAtNoon(date);
  const [hour, minute] = time.split(':').map(Number);
  result.setHours(hour, minute, 0, 0);
  return result;
}

function routeFor(
  kind: PlanningNotificationSpec['data']['kind'],
  entityId: string,
  forDate: LocalDate,
) {
  const id = encodeURIComponent(entityId);
  const date = encodeURIComponent(forDate);
  if (kind === 'task') return `/task-editor?taskId=${id}`;
  if (kind === 'routine') {
    return `/routine-runner?routineId=${id}&date=${date}`;
  }
  return `/tracker-detail?trackerId=${id}&date=${date}`;
}

/**
 * Builds one-off notifications from Tracky's local projection. Rebuilding a
 * short rolling window keeps exceptions, completions, and edited recurrence
 * rules authoritative without maintaining a second notification schedule.
 */
export function buildPlanningNotificationSpecs(
  data: PlanningData,
  now = new Date(),
  horizonDays = PLANNING_NOTIFICATION_HORIZON_DAYS,
  limit = MAX_PLANNING_NOTIFICATIONS,
) {
  if (!Number.isFinite(now.getTime()) || horizonDays < 0 || limit < 1) {
    return [];
  }

  const today = localDateKey(now);
  const specs: PlanningNotificationSpec[] = [];

  for (let offset = 0; offset <= Math.floor(horizonDays); offset += 1) {
    const forDate = addLocalDays(today, offset);
    const plan = buildDayPlan({ date: forDate, ...data });

    for (const item of plan) {
      if (!item.time || item.complete || item.skipped) continue;
      const triggerAt = dateAtTime(forDate, item.time);
      if (triggerAt.getTime() <= now.getTime()) continue;

      const kind = item.kind;
      const entityId = item.source.id;
      specs.push({
        title: item.source.name,
        body:
          kind === 'routine'
            ? `${item.target} ${item.target === 1 ? 'step' : 'steps'}, one at a time.`
            : 'Ready when you are.',
        triggerAt,
        data: {
          entityId,
          forDate,
          kind,
          trackyPlanning: true,
          url: routeFor(kind, entityId, forDate),
        },
      });
    }
  }

  return specs
    .sort((left, right) => left.triggerAt.getTime() - right.triggerAt.getTime())
    .slice(0, Math.floor(limit));
}

import type { MissionInstance, MissionTemplate, RecurrenceRule, Weekday } from '@/lib/types';
import { missionCategories } from '@/lib/types';
import { Timestamp } from 'firebase/firestore';
import {
  addDays,
  eachDayOfInterval,
  endOfMonth,
  getDay,
  isAfter,
  isBefore,
  isSameDay,
  startOfDay,
  startOfMonth,
} from 'date-fns';

export interface CalendarEvent {
  date: Date;
  title: string;
  color: string;
  type: 'template' | 'instance';
  data: MissionTemplate | MissionInstance;
}

const getDayToWeekday: Record<number, Weekday> = { 0: 'SU', 1: 'MO', 2: 'TU', 3: 'WE', 4: 'TH', 5: 'FR', 6: 'SA' };

// This is a simplified recurrence generator for client-side display.
// It does not handle `count` and only handles interval=1 for weekly recurrence.
export function generateRecurringEvents(
  templates: MissionTemplate[],
  viewStart: Date,
  viewEnd: Date
): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  const daysInView = eachDayOfInterval({ start: viewStart, end: viewEnd });
  const categoryColorMap = new Map(missionCategories.map(cat => [cat.id, cat.color]));

  templates.forEach(template => {
    if (!template.recurrenceRule || template.status === 'archived') return;

    const rule = template.recurrenceRule;
    const templateStartDate = (template.createdAt as Timestamp).toDate();

    daysInView.forEach(day => {
      // Basic checks to see if the event can occur on this day
      if (isBefore(day, templateStartDate)) return;
      if (rule.endDate && isAfter(day, rule.endDate.toDate())) return;

      let shouldOccur = false;
      if (rule.freq === 'DAILY') {
        const diff = Math.round(Math.abs(day.getTime() - templateStartDate.getTime()) / (1000 * 60 * 60 * 24));
        if (diff % rule.interval === 0) {
          shouldOccur = true;
        }
      } else if (rule.freq === 'WEEKLY') {
        const dayOfWeek = getDayToWeekday[getDay(day)];
        if (rule.interval === 1 && rule.byDay?.includes(dayOfWeek)) {
          // Note: This simplified logic only works correctly for interval=1
          shouldOccur = true;
        }
      }

      if (shouldOccur) {
        events.push({
          date: day,
          title: template.title,
          color: categoryColorMap.get(template.category) || 'hsl(var(--foreground))',
          type: 'template',
          data: template,
        });
      }
    });
  });

  return events;
}

export function groupEventsByDate(events: CalendarEvent[]): Record<string, CalendarEvent[]> {
  return events.reduce((acc, event) => {
    const dateKey = format(event.date, 'yyyy-MM-dd');
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(event);
    return acc;
  }, {} as Record<string, CalendarEvent[]>);
}

// Helper to format date in a consistent way for keys
export function format(date: Date, fmt: string) {
    // This is a minimal polyfill since date-fns format is not directly used here for grouping anymore.
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
}

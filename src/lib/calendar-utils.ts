
import type { MissionInstance, MissionTemplate, RecurrenceRule, Weekday } from '@/lib/types';
import { missionCategories, weekdays } from '@/lib/types';
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
    const templateStartDate = template.startDate ? template.startDate.toDate() : (template.createdAt as Timestamp).toDate();
    const templateEndDate = template.endDate ? template.endDate.toDate() : null;
    
    // Set time to start of day for accurate date comparison
    const normalizedTemplateStartDate = startOfDay(templateStartDate);

    daysInView.forEach(day => {
      if (isBefore(day, normalizedTemplateStartDate)) return;
      if (templateEndDate && isAfter(day, templateEndDate)) return;

      let shouldOccur = false;
      const dayOfWeek = getDayToWeekday[getDay(day)];

      if (rule.freq === 'DAILY') {
        shouldOccur = true;
      } else if (rule.freq === 'WEEKLY') {
        if (rule.byDay && rule.byDay.length > 0) {
            if (rule.byDay.includes(dayOfWeek)) {
                shouldOccur = true;
            }
        } else {
            // If no specific days are set, assume it repeats on the same day of the week as the start date
            if (getDay(day) === getDay(normalizedTemplateStartDate)) {
                shouldOccur = true;
            }
        }
      } else if (rule.freq === 'MONTHLY') {
          // Repeats on the same day of the month as the start date
          if (day.getDate() === normalizedTemplateStartDate.getDate()) {
              shouldOccur = true;
          }
      } else if (rule.freq === 'YEARLY') {
          // Repeats on the same month and day of the year as the start date
          if (day.getDate() === normalizedTemplateStartDate.getDate() && day.getMonth() === normalizedTemplateStartDate.getMonth()) {
              shouldOccur = true;
          }
      }
      
      if (shouldOccur) {
        // Create a date object for the event that includes the time from the start date
        const eventDate = new Date(day);
        eventDate.setHours(templateStartDate.getHours(), templateStartDate.getMinutes(), templateStartDate.getSeconds());
        
        events.push({
          date: eventDate,
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

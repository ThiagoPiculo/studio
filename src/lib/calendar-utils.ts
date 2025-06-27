
import type { MissionInstance, MissionTemplate, RecurrenceRule, Weekday } from '@/lib/types';
import { missionCategories, weekdayLabels } from '@/lib/types';
import { Timestamp } from 'firebase/firestore';
import {
  addDays,
  addMonths,
  addWeeks,
  addYears,
  eachDayOfInterval,
  getDay,
  isAfter,
  isBefore,
  isSameDay,
  startOfDay,
  format as formatDateFns
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
  const categoryColorMap = new Map(missionCategories.map(cat => [cat.color, cat.color]));

  templates.forEach(template => {
    if (!template.isRecurring || !template.recurrenceRule || template.status === 'archived' || !template.startDate) return;

    const rule = template.recurrenceRule;
    const startDate = template.startDate.toDate();
    const ruleEndDate = rule.endDate ? rule.endDate.toDate() : null;
    let occurrenceCount = 0;

    let currentDate = startDate;

    while (isBefore(currentDate, viewEnd) && (!ruleEndDate || !isAfter(currentDate, ruleEndDate))) {
      if (rule.count && occurrenceCount >= rule.count) {
        break; // Stop if max occurrences reached
      }

      // Check if the current date is a valid occurrence
      let isOccurrence = false;
      if (rule.freq === 'DAILY') {
        isOccurrence = true;
      } else if (rule.freq === 'WEEKLY') {
        const dayOfWeek = getDayToWeekday[getDay(currentDate)];
        if (!rule.byDay || rule.byDay.length === 0 || rule.byDay.includes(dayOfWeek)) {
          isOccurrence = true;
        }
      } else if (rule.freq === 'MONTHLY') {
        if (currentDate.getDate() === startDate.getDate()) {
            isOccurrence = true;
        }
      } else if (rule.freq === 'YEARLY') {
        if (currentDate.getDate() === startDate.getDate() && currentDate.getMonth() === startDate.getMonth()) {
            isOccurrence = true;
        }
      }
      
      if (isOccurrence) {
        occurrenceCount++;
        // Check if the occurrence is within the view's interval
        if (isAfter(currentDate, viewStart) || isSameDay(currentDate, viewStart)) {
          events.push({
            date: currentDate,
            title: template.title,
            color: categoryColorMap.get(template.category) || 'hsl(var(--foreground))',
            type: 'template',
            data: template,
          });
        }
      }
      
      // Move to the next potential date based on the interval
      if(rule.freq === 'DAILY') {
          currentDate = addDays(currentDate, 1);
          // For interval based daily, we have to recalculate
          if(rule.interval > 1) {
              currentDate = addDays(startDate, occurrenceCount * rule.interval);
          }
      } else if(rule.freq === 'WEEKLY') {
           // For weekly, we check each day, so just advance one day
           currentDate = addDays(currentDate, 1);
           // Special handling for interval > 1. Logic becomes more complex.
           // A simple approach is to jump weeks if we pass the last day of the current week pattern.
           // This part needs refinement for complex intervals.
           // For now, let's assume a basic check within the loop is enough if we advance day by day.
      } else if (rule.freq === 'MONTHLY') {
          currentDate = addMonths(currentDate, rule.interval);
      } else if (rule.freq === 'YEARLY') {
          currentDate = addYears(currentDate, rule.interval);
      } else {
          // Default break for safety
          break;
      }
    }
  });

  return events;
}

export function groupEventsByDate(events: CalendarEvent[]): Record<string, CalendarEvent[]> {
    return events.reduce((acc, event) => {
        const dateKey = formatToYyyyMmDd(event.date);
        if (!acc[dateKey]) {
            acc[dateKey] = [];
        }
        acc[dateKey].push(event);
        return acc;
    }, {} as Record<string, CalendarEvent[]>);
}

// Helper to format date in a consistent way for keys
function formatToYyyyMmDd(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
}


export function formatRecurrenceSummary(template: MissionTemplate): string {
  if (!template.isRecurring || !template.recurrenceRule) {
    if (template.startDate) {
      const date = (template.startDate as Timestamp).toDate();
      return `Missão única em ${formatDateFns(date, 'PPP', { locale: ptBR })}`;
    }
    return "Missão única";
  }

  const rule = template.recurrenceRule;

  const getFrequencyText = () => {
    if (rule.interval === 1) {
      switch (rule.freq) {
        case 'DAILY': return 'Diariamente';
        case 'WEEKLY': return 'Semanalmente';
        case 'MONTHLY': return 'Mensalmente';
        case 'YEARLY': return 'Anualmente';
      }
    }
    const unit = {
      DAILY: 'dia',
      WEEKLY: 'semana',
      MONTHLY: 'mês',
      YEARLY: 'ano'
    }[rule.freq];

    const plural = rule.freq === 'MONTHLY' ? 'meses' : `${unit}s`;
    return `A cada ${rule.interval} ${plural}`;
  };

  let summary = getFrequencyText();

  if (rule.byDay && rule.byDay.length > 0 && rule.byDay.length < 7 && rule.freq === 'WEEKLY') {
    const translatedDays = rule.byDay.map(day => weekdayLabels[day].short).join(', ');
    summary += ` em ${translatedDays}`;
  }

  return summary;
}

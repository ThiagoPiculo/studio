
import type { MissionInstance, MissionTemplate, RecurrenceRule, Weekday } from '@/lib/types';
import { missionCategories, weekdayLabels, weekdays as allWeekdays } from '@/lib/types';
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
  format as formatDateFns,
  startOfWeek
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface CalendarEvent {
  date: Date;
  title: string;
  color: string;
  type: 'template' | 'instance';
  data: MissionTemplate | MissionInstance;
}

const weekdayToGetDay: Record<Weekday, number> = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };

export function generateRecurringEvents(
  templates: MissionTemplate[],
  viewStart: Date,
  viewEnd: Date
): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  const categoryDetailsMap = new Map(missionCategories.map(cat => [cat.id, cat]));

  templates.forEach(template => {
    if (!template.isRecurring || !template.recurrenceRule || !template.startDate || template.status === 'archived') {
      return;
    }

    const rule = template.recurrenceRule;
    const ruleEndDate = rule.endDate ? rule.endDate.toDate() : null;
    let occurrenceCount = 0;
    
    let iterDate = template.startDate.toDate();

    while (iterDate <= viewEnd && (!rule.count || occurrenceCount < rule.count) && (!ruleEndDate || isSameDay(iterDate, ruleEndDate) || isBefore(iterDate, ruleEndDate))) {

      if (rule.freq === 'DAILY') {
        if (iterDate >= viewStart) {
          events.push({
            date: iterDate,
            title: template.title,
            color: categoryDetailsMap.get(template.category)?.color || 'hsl(var(--foreground))',
            type: 'template',
            data: template,
          });
        }
        occurrenceCount++;
        iterDate = addDays(iterDate, rule.interval);

      } else if (rule.freq === 'WEEKLY') {
        const daysToRepeatOn = rule.byDay && rule.byDay.length > 0 ? rule.byDay : allWeekdays;
        
        // Iterate through the days of the current week for the iterator
        for (const dayShort of daysToRepeatOn) {
            const dayNumber = weekdayToGetDay[dayShort];
            // Find the date for this weekday within the current week of iterDate
            const weekStart = startOfWeek(iterDate, { weekStartsOn: 1 });
            const occurrenceDate = addDays(weekStart, dayNumber - 1); // Adjust since our week starts on Monday (1)

             if (occurrenceDate < iterDate) continue; // Don't generate for past days in the first week
             if (ruleEndDate && isAfter(occurrenceDate, ruleEndDate)) continue; // Don't generate after end date
             if (rule.count && occurrenceCount >= rule.count) break;

            if (occurrenceDate >= viewStart && occurrenceDate <= viewEnd) {
                 events.push({
                    date: occurrenceDate,
                    title: template.title,
                    color: categoryDetailsMap.get(template.category)?.color || 'hsl(var(--foreground))',
                    type: 'template',
                    data: template,
                });
            }
        }
        
        occurrenceCount++; // This logic is simplified; count might not be perfectly accurate with byDay
        iterDate = addWeeks(startOfWeek(iterDate, { weekStartsOn: 1 }), rule.interval);
        
      } else if (rule.freq === 'MONTHLY') {
         if (iterDate >= viewStart) {
            events.push({
              date: iterDate,
              title: template.title,
              color: categoryDetailsMap.get(template.category)?.color || 'hsl(var(--foreground))',
              type: 'template',
              data: template,
            });
        }
        occurrenceCount++;
        iterDate = addMonths(iterDate, rule.interval);

      } else if (rule.freq === 'YEARLY') {
         if (iterDate >= viewStart) {
            events.push({
              date: iterDate,
              title: template.title,
              color: categoryDetailsMap.get(template.category)?.color || 'hsl(var(--foreground))',
              type: 'template',
              data: template,
            });
        }
        occurrenceCount++;
        iterDate = addYears(iterDate, rule.interval);
      } else {
        break; // Should not happen
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

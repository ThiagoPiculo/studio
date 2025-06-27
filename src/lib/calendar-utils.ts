
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
    
    let iterDate = startOfDay(template.startDate.toDate());

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
        
        let weekStartForLoop = startOfWeek(iterDate, { weekStartsOn: 1 });
        if (isAfter(weekStartForLoop, iterDate)) {
            weekStartForLoop = addWeeks(weekStartForLoop, -1);
        }

        for (let i = 0; i < 7; i++) {
            const currentDayInWeek = addDays(weekStartForLoop, i);
            
            if (isBefore(currentDayInWeek, iterDate)) continue;

            const dayShort = allWeekdays[getDay(currentDayInWeek)];

            if (daysToRepeatOn.includes(dayShort)) {
                 if (ruleEndDate && isAfter(currentDayInWeek, ruleEndDate)) continue;
                 if (rule.count && occurrenceCount >= rule.count) break;

                 if (currentDayInWeek >= viewStart && currentDayInWeek <= viewEnd) {
                     events.push({
                        date: currentDayInWeek,
                        title: template.title,
                        color: categoryDetailsMap.get(template.category)?.color || 'hsl(var(--foreground))',
                        type: 'template',
                        data: template,
                    });
                 }
                 occurrenceCount++;
            }
        }
        iterDate = addWeeks(iterDate, rule.interval);
        
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


type RecurrenceSummarySource = {
  isRecurring?: boolean;
  recurrenceRule?: RecurrenceRule | null;
  startDate?: Timestamp | null;
  dueDate?: Timestamp;
};

// Helper function to check if two arrays of strings have the same elements, regardless of order.
const haveSameElements = (arr1: string[], arr2: string[]): boolean => {
  if (arr1.length !== arr2.length) {
    return false;
  }
  const sorted1 = [...arr1].sort();
  const sorted2 = [...arr2].sort();
  return sorted1.every((value, index) => value === sorted2[index]);
};

export function formatRecurrenceSummary(mission: RecurrenceSummarySource): string {
  if (!mission.isRecurring || !mission.recurrenceRule) {
    const date = (mission.dueDate || mission.startDate) as Timestamp | undefined | null;
    if (date) {
      return `Missão única em ${formatDateFns(date.toDate(), 'PPP', { locale: ptBR })}`;
    }
    return "Missão única";
  }

  const rule = mission.recurrenceRule;

  const getFrequencyText = () => {
    if (rule.interval === 1) {
      switch (rule.freq) {
        case 'DAILY': return 'Diariamente';
        case 'WEEKLY': return 'Semanalmente';
        case 'MONTHLY': return 'Mensalmente';
        case 'YEARLY': return 'Anualmente';
      }
    }
    
    let unit: string;
    let plural: string;
    switch (rule.freq) {
        case 'DAILY': unit = 'dia'; plural = 'dias'; break;
        case 'WEEKLY': unit = 'semana'; plural = 'semanas'; break;
        case 'MONTHLY': unit = 'mês'; plural = 'meses'; break;
        case 'YEARLY': unit = 'ano'; plural = 'anos'; break;
    }
    
    return `A cada ${rule.interval} ${plural}`;
  };
  
  let summary = getFrequencyText();
  
  if (rule.freq === 'WEEKLY' && rule.byDay && rule.byDay.length > 0) {
    const weekdaysArr: Weekday[] = ['MO', 'TU', 'WE', 'TH', 'FR'];
    const weekendsArr: Weekday[] = ['SA', 'SU'];
    
    if (haveSameElements(rule.byDay, allWeekdays)) {
        if (rule.interval === 1) {
          summary = 'Diariamente';
        }
    } else if (haveSameElements(rule.byDay, weekdaysArr)) {
        summary = `${summary} nos dias de semana`;
    } else if (haveSameElements(rule.byDay, weekendsArr)) {
        summary = `${summary} nos fins de semana`;
    } else {
      const orderedSelectedDays = allWeekdays.filter(day => rule.byDay!.includes(day));
      const translatedDays = orderedSelectedDays.map(day => weekdayLabels[day].short).join(', ');
      summary += ` em ${translatedDays}`;
    }
  }

  if (rule.endDate) {
    const date = (rule.endDate as Timestamp).toDate();
    summary += `, até ${formatDateFns(date, 'dd/MM/yyyy')}`;
  } else if (rule.count) {
    summary += `, ${rule.count} ${rule.count > 1 ? 'vezes' : 'vez'}`;
  }

  return summary;
}

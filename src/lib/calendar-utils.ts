
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
  endOfDay,
  format as formatDateFns,
  startOfWeek,
  differenceInDays,
  differenceInWeeks,
  differenceInMonths,
  differenceInYears,
  isValid,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

const weekdayToGetDay: Record<Weekday, number> = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };
export const getDayToWeekday: Record<number, Weekday> = { 0: 'SU', 1: 'MO', 2: 'TU', 3: 'WE', 4: 'TH', 5: 'FR', 6: 'SA' };

// Helper to safely get a JS Date object from various possible inputs
export const getDateObject = (dateInput: Timestamp | Date | null | undefined): Date | null => {
    if (!dateInput) return null;
    if (dateInput instanceof Date && isValid(dateInput)) return dateInput;
    if (typeof (dateInput as any).toDate === 'function') {
        const d = (dateInput as Timestamp).toDate();
        if (isValid(d)) return d;
    }
    return null;
}

export const getPeriodOfDay = (date: Date | null | undefined): 'Manhã' | 'Tarde' | 'Noite' | null => {
    if (!date) return null;
    const hour = date.getHours();
    if (hour >= 6 && hour < 12) return 'Manhã';
    if (hour >= 12 && hour < 18) return 'Tarde';
    return 'Noite';
};

export const parseTime = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes)) {
    return 0;
  }
  return hours * 60 + minutes;
};

export function isMissionScheduledForDate(mission: MissionInstance, date: Date): boolean {
    const checkDate = startOfDay(date);
    const weekStartsOn = 1; // Monday

    const dateKeyForException = formatDateFns(checkDate, 'yyyy-MM-dd');
    if (mission.exceptionDates && mission.exceptionDates[dateKeyForException]) {
        return false;
    }

    if (!mission.isRecurring) {
        const dueDate = getDateObject(mission.dueDate);
        // For non-recurring missions, it's scheduled if the checkDate is the same as the dueDate.
        return !!dueDate && isSameDay(dueDate, checkDate);
    }

    const rule = mission.recurrenceRule;
    if (!rule) return false;

    // Fallback to assignedAt for older mission instances that don't have startDate
    const sDateRaw = mission.startDate || mission.assignedAt;
    const startDate = getDateObject(sDateRaw);
    if (!startDate) return false; // Safety check if no valid start date is found

    const sDate = startOfDay(startDate);

    // Basic checks: before start date, after end date, or count exceeded.
    if (isBefore(checkDate, sDate)) return false;
    
    const endDate = getDateObject(rule.endDate);
    if (endDate && isAfter(checkDate, startOfDay(endDate))) return false;

    if (rule.count && (mission.completionCount || 0) >= rule.count) return false;

    switch (rule.freq) {
        case 'DAILY': {
            const daysDifference = differenceInDays(checkDate, sDate);
            return daysDifference % rule.interval === 0;
        }
        case 'WEEKLY': {
            // If byDay is not specified, it should repeat on the same day of the week as the start date.
            const daysToRepeatOn = rule.byDay?.length ? rule.byDay : [getDayToWeekday[getDay(sDate)]];
            
            const dayOfWeek = getDayToWeekday[getDay(checkDate)];
            
            if (!daysToRepeatOn.includes(dayOfWeek)) {
                return false;
            }

            const startOfWeekForSDate = startOfWeek(sDate, { weekStartsOn });
            const startOfWeekForCheckDate = startOfWeek(checkDate, { weekStartsOn });
            const weeksDifference = Math.floor(differenceInDays(startOfWeekForCheckDate, startOfWeekForSDate) / 7);

            if (weeksDifference < 0) return false;
            
            return weeksDifference % rule.interval === 0;
        }
        case 'MONTHLY': {
            if (sDate.getDate() !== checkDate.getDate()) return false;
            const monthsDifference = differenceInMonths(checkDate, sDate);
            if (monthsDifference < 0) return false;
            return monthsDifference % rule.interval === 0;
        }
        case 'YEARLY': {
            if (sDate.getDate() !== checkDate.getDate() || sDate.getMonth() !== checkDate.getMonth()) return false;
            const yearsDifference = differenceInYears(checkDate, sDate);
            if (yearsDifference < 0) return false;
            return yearsDifference % rule.interval === 0;
        }
        default:
            return false;
    }
}

export function isMissionCompletedForDate(mission: MissionInstance, date: Date): boolean {
    if (!mission.completionLog) {
      return false;
    }
    const dateKey = formatDateFns(startOfDay(date), 'yyyy-MM-dd');
    return !!mission.completionLog[dateKey];
}


export function getTodaysMissions(
  instances: MissionInstance[],
  today: Date
): { todaysMissions: MissionInstance[]; otherPendingMissions: MissionInstance[] } {
    const todaysMissions: MissionInstance[] = [];
    const otherPendingMissions: MissionInstance[] = [];

    const pendingInstances = instances.filter(m => m.status === 'pending');

    for (const inst of pendingInstances) {
        if (isMissionScheduledForDate(inst, today)) {
            todaysMissions.push(inst);
        } else {
            otherPendingMissions.push(inst);
        }
    }

    return { todaysMissions, otherPendingMissions };
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
  recurrenceRule?: (Omit<RecurrenceRule, 'endDate'> & { endDate?: Timestamp | Date | null }) | null;
  startDate?: Timestamp | Date | null;
  dueDate?: Timestamp | Date | null;
};


// Helper to check if two arrays of strings have the same elements, regardless of order.
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
    const date = getDateObject(mission.dueDate || mission.startDate);
    if (date) {
      return `Missão única em ${formatDateFns(date, 'PPP', { locale: ptBR })}`;
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
    const date = getDateObject(rule.endDate);
    if (date) {
        summary += `, até ${formatDateFns(date, 'dd/MM/yyyy')}`;
    }
  } else if (rule.count) {
    summary += `, ${rule.count} ${rule.count > 1 ? 'vezes' : 'vez'}`;
  }

  return summary;
}


'use server';

import type { OnboardingFormValues } from '@/components/dashboard/onboarding/OnboardingForm';
import { predefinedMissionGroups } from '@/lib/predefined-missions';
import type { ScheduleItem, Weekday, MissionCategory } from '@/lib/types';
import { allWeekdays } from '@/lib/types';

// Helper para converter "HH:mm" para minutos desde o início do dia
const parseTime = (time: string): number => {
  if (!time || !time.includes(':')) return 0;
  const [hours, minutes] = time.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes)) return 0;
  return hours * 60 + minutes;
};

// Helper para converter minutos para "HH:mm"
const formatTime = (minutes: number): string => {
    const totalMinutes = Math.round(minutes);
    const hours = Math.floor(totalMinutes / 60) % 24;
    const mins = totalMinutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

const findMissionDetails = (title: string) => {
  const predefined = predefinedMissionGroups.flatMap(g => g.items).find(i => i.title === title);
  if (predefined) {
      return {
          emoji: predefined.emoji,
          category: predefined.suggestedAppCategory,
      };
  }
  return {
    emoji: '✨',
    category: 'hobbies' as MissionCategory,
  };
};

export async function generateSchedule(input: OnboardingFormValues): Promise<{ schedule: ScheduleItem[] }> {
    const finalSchedule: ScheduleItem[] = [];
    const occupiedSlots: { day: Weekday, start: number, end: number, activity: string }[] = [];
    const weekdays: Weekday[] = ['MO', 'TU', 'WE', 'TH', 'FR'];

    const addAndOccupy = (item: Omit<ScheduleItem, 'type' | 'category' | 'emoji'>, type: ScheduleItem['type']) => {
        const details = findMissionDetails(item.activity);
        if (item.startTime && item.endTime && item.days) {
             item.days.forEach(day => {
                const startMins = parseTime(item.startTime!);
                const endMins = parseTime(item.endTime!);
                if (endMins > startMins) {
                    occupiedSlots.push({ day, start: startMins, end: endMins, activity: item.activity });
                }
            });
        }
        finalSchedule.push({ ...item, type, emoji: details.emoji, category: details.category });
    };

    // 1. Bloquear horários fixos (Escola e Atividades Extras)
    if (input.schoolShift !== 'not_applicable' && input.schoolShiftStart && input.schoolShiftEnd) {
        addAndOccupy({ activity: 'Escola', startTime: input.schoolShiftStart, endTime: input.schoolShiftEnd, days: weekdays }, 'school_entry');
    }

    (input.extraActivities || []).forEach(activity => {
        if (activity.name && activity.days && activity.startTime && activity.endTime) {
            addAndOccupy({
                activity: activity.name,
                startTime: activity.startTime,
                endTime: activity.endTime,
                days: activity.days as Weekday[],
            }, 'extra_activity');
        }
    });
    
    // 2. Mapear âncoras de horário
    const anchors = {
        schoolStart: parseTime(input.schoolShiftStart || '00:00'),
        schoolEnd: parseTime(input.schoolShiftEnd || '00:00'),
        wakeUp: parseTime(input.wakeUpTime!),
        lunch: parseTime(input.lunchTime!),
        dinner: parseTime(input.dinnerTime!),
        sleep: parseTime(input.sleepTime!),
    };

    const dinnerDuration = 20;
    const lunchDuration = 20;
    const breakfastDuration = 20;

    // 3. Definir a estrutura da rotina com base nas regras de negócio fornecidas
    const routineRules = [
      { title: 'Hora de acordar', duration: 10, startTime: anchors.wakeUp, days: allWeekdays },
      { title: 'Arrumar a cama', duration: 5, startTime: anchors.wakeUp + 10, days: allWeekdays },
      { title: 'Tomar café da manhã', duration: breakfastDuration, startTime: anchors.wakeUp + 15, days: allWeekdays },
      { title: 'Escovar os dentes', duration: 5, startTime: anchors.wakeUp + 15 + breakfastDuration, days: allWeekdays },
      { title: 'Fazer a lição de casa', duration: 50, startTime: anchors.wakeUp + 60, days: weekdays },
      { title: 'Organizar a mochila para amanhã', duration: 5, startTime: anchors.wakeUp + 115, days: weekdays },
      { title: 'Hora livre para brincar', duration: 60, startTime: anchors.wakeUp + 120, days: weekdays },
      { title: 'Tomar banho', duration: 15, startTime: anchors.schoolStart - 60, days: weekdays },
      { title: 'Almoçar', duration: lunchDuration, startTime: anchors.lunch, days: allWeekdays },
      { title: 'Escovar os dentes', duration: 5, startTime: anchors.lunch + lunchDuration, days: allWeekdays },
      { title: 'Sair para escola', duration: 20, startTime: anchors.schoolStart - 20, days: weekdays },
      { title: 'Hora livre para brincar', duration: 60, startTime: anchors.schoolEnd + 30, days: weekdays },
      { title: 'Jantar', duration: dinnerDuration, startTime: anchors.dinner, days: allWeekdays },
      { title: 'Escovar os dentes', duration: 5, startTime: anchors.dinner + dinnerDuration, days: allWeekdays },
      { title: 'Hora livre para brincar', duration: 30, startTime: anchors.dinner + 20, days: weekdays },
      { title: 'Hora livre para brincar', duration: 30, startTime: anchors.dinner + 50, days: weekdays },
      { title: 'Hora livre para brincar', duration: 30, startTime: anchors.dinner + 80, days: weekdays },
      { title: 'Tomar banho', duration: 20, startTime: anchors.sleep - 20, days: allWeekdays },
      { title: 'Hora de dormir', duration: 20, startTime: anchors.sleep, days: allWeekdays },
    ];
    
     // 4. Processar rotina essencial, resolvendo conflitos
    for (const rule of routineRules) {
        if (!input.essentialRoutines?.includes(rule.title)) continue;

        let scheduledDays: Weekday[] = [];

        for (const day of rule.days) {
            let attemptTime = rule.startTime;
            let endTime = attemptTime + rule.duration;
            let hasConflict = false;
            let isScheduled = false;
            let attempts = 0;

            do {
                hasConflict = false;
                for (const slot of occupiedSlots) {
                    if (slot.day === day && Math.max(attemptTime, slot.start) < Math.min(endTime, slot.end)) {
                        hasConflict = true;
                        if (rule.title.includes('Hora livre')) {
                            break; 
                        }
                        attemptTime = slot.end + 15;
                        endTime = attemptTime + rule.duration;
                        break;
                    }
                }
                 if(hasConflict && rule.title.includes('Hora livre')) break;
                 attempts++;

            } while (hasConflict && attempts < 20);

            if (!hasConflict) {
                 const newActivity = {
                    activity: rule.title,
                    startTime: formatTime(attemptTime),
                    endTime: formatTime(endTime),
                    days: [day],
                };
                addAndOccupy(newActivity, 'essential_routine');
                isScheduled = true;
            }
        }
    }

    return {
        schedule: finalSchedule.sort((a,b) => parseTime(a.startTime!) - parseTime(b.startTime!)),
    };
}

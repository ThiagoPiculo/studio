
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
        addAndOccupy({ activity: 'Escola', startTime: input.schoolShiftStart, endTime: input.schoolShiftEnd, days: ['MO', 'TU', 'WE', 'TH', 'FR'] }, 'school_entry');
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
        wakeUp: parseTime(input.wakeUpTime!),
        schoolStart: parseTime(input.schoolShiftStart || '00:00'),
        lunch: parseTime(input.lunchTime!),
        dinner: parseTime(input.dinnerTime!),
        sleep: parseTime(input.sleepTime!),
    };

    // 3. Definir a estrutura da rotina com base nas regras de negócio fornecidas
    const routineRules = [
        { id: 'acordar', mission: 'Hora de acordar', duration: 10, days: allWeekdays, rule: (anchors: any) => anchors.wakeUp },
        { id: 'arrumarCama', mission: 'Arrumar a cama', duration: 5, days: allWeekdays, rule: (anchors: any, previous: any) => previous.acordar.start + 10 },
        { id: 'cafe', mission: 'Tomar café da manhã', duration: 20, days: allWeekdays, rule: (anchors: any, previous: any) => previous.acordar.start + 15 },
        { id: 'escovarDentesManha', mission: 'Escovar os dentes (após acordar)', duration: 5, days: allWeekdays, rule: (anchors: any, previous: any) => previous.cafe.start + 5 },
        { id: 'licaoCasa', mission: 'Fazer a lição de casa', duration: 50, days: ['MO', 'TU', 'WE', 'TH', 'FR'], rule: (anchors: any, previous: any) => previous.acordar.start + 60 },
        { id: 'mochila', mission: 'Organizar a mochila para amanhã', duration: 10, days: ['MO', 'TU', 'WE', 'TH', 'FR'], rule: (anchors: any, previous: any) => previous.licaoCasa.start + 55 },
        { id: 'brincar1', mission: 'Hora livre para brincar', duration: 60, days: ['MO', 'TU', 'WE', 'TH', 'FR'], rule: (anchors: any, previous: any) => previous.mochila.start + 5 },
        { id: 'brincar2', mission: 'Hora livre para brincar', duration: 60, days: ['MO', 'TU', 'WE', 'TH', 'FR'], rule: (anchors: any, previous: any) => 660 }, // 11:00
        { id: 'banhoPreEscola', mission: 'Tomar banho', duration: 15, days: ['MO', 'TU', 'WE', 'TH', 'FR'], rule: (anchors: any) => anchors.schoolStart - 60 },
        { id: 'almocar', mission: 'Almoçar', duration: 20, days: allWeekdays, rule: (anchors: any) => anchors.lunch },
        { id: 'escovarDentesAlmoco', mission: 'Escovar os dentes (após almoço)', duration: 5, days: allWeekdays, rule: (anchors: any, previous: any) => previous.almocar.start + 20 },
        { id: 'sairEscola', mission: 'Sair para escola', duration: 5, days: ['MO', 'TU', 'WE', 'TH', 'FR'], rule: (anchors: any) => anchors.schoolStart - 25 },
        { id: 'jantar', mission: 'Jantar', duration: 15, days: allWeekdays, rule: (anchors: any) => anchors.dinner },
        { id: 'escovarDentesJantar', mission: 'Escovar os dentes (após jantar)', duration: 5, days: allWeekdays, rule: (anchors: any, previous: any) => previous.jantar.start + 15 },
        { id: 'brincar3', mission: 'Hora livre para brincar', duration: 60, days: ['MO', 'TU', 'WE', 'TH', 'FR'], rule: (anchors: any, previous: any) => previous.escovarDentesJantar.start + 5 },
        { id: 'brincar4', mission: 'Hora livre para brincar', duration: 60, days: ['MO', 'TU', 'WE', 'TH', 'FR'], rule: (anchors: any, previous: any) => previous.brincar3.start + 60 },
        { id: 'brincar5', mission: 'Hora livre para brincar', duration: 30, days: ['MO', 'TU', 'WE', 'TH', 'FR'], rule: (anchors: any, previous: any) => previous.brincar4.start + 60 },
        { id: 'banhoNoite', mission: 'Tomar banho', duration: 20, days: allWeekdays, rule: (anchors: any) => anchors.sleep - 20 },
        { id: 'dormir', mission: 'Hora de dormir', duration: 20, days: allWeekdays, rule: (anchors: any) => anchors.sleep }
    ];

    const scheduledTimes: Record<string, { start: number, end: number }> = {};
    
     // 4. Processar rotina essencial, resolvendo conflitos
    for (const rule of routineRules) {
        if (!input.essentialRoutines?.includes(rule.mission)) continue;

        for (const day of rule.days) {
            let startTime = rule.rule(anchors, scheduledTimes);
            let endTime = startTime + rule.duration;
            let hasConflict = false;
            let isFlexible = rule.mission.includes('livre para brincar');
            let isEssential = ['Jantar', 'Tomar banho'].includes(rule.mission);

            do {
                hasConflict = false;
                for (const slot of occupiedSlots) {
                    if (slot.day === day && Math.max(startTime, slot.start) < Math.min(endTime, slot.end)) {
                        hasConflict = true;
                        
                        if (isEssential || isFlexible) {
                            startTime = slot.end + (isFlexible ? 20 : 15);
                            endTime = startTime + rule.duration;
                        } else {
                            // Non-essential, non-flexible tasks might be skipped or logged as a problem
                        }
                        break; 
                    }
                }
            } while (hasConflict && (isEssential || isFlexible));

            if (!hasConflict || (isEssential || isFlexible)) {
                 addAndOccupy({
                    activity: rule.mission,
                    startTime: formatTime(startTime),
                    endTime: formatTime(endTime),
                    days: [day],
                }, 'essential_routine');
            }
        }
        // Store the calculated time for dependency chain
        scheduledTimes[rule.id] = { start: rule.rule(anchors, scheduledTimes), end: rule.rule(anchors, scheduledTimes) + rule.duration };
    }

    return {
        schedule: finalSchedule.sort((a,b) => parseTime(a.startTime!) - parseTime(b.startTime!)),
    };
}

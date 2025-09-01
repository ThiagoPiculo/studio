
'use server';

import type { OnboardingFormValues } from '@/components/dashboard/onboarding/OnboardingForm';
import { predefinedMissionGroups } from '@/lib/predefined-missions';
import type { ScheduleItem, Weekday, MissionCategory } from '@/lib/types';

// Helper para converter "HH:mm" para minutos desde o início do dia
const parseTime = (time: string | undefined): number => {
  if (!time || !time.includes(':')) return 0;
  const [hours, minutes] = time.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes)) return 0;
  return hours * 60 + minutes;
};

// Helper para converter minutos para "HH:mm"
const formatTime = (minutes: number): string => {
    if (isNaN(minutes)) return "00:00"; // Safeguard against NaN
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
    emoji: '✨', // Fallback emoji
    category: 'hobbies' as MissionCategory, // Fallback category
  };
};

const routineRules = [
    // --- Bloco da Manhã ---
    { id: 'Hora de acordar', duration: 10, rule: (anchors: any, prevEnd: number) => anchors.wakeUp, days: ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'] as Weekday[] },
    { id: 'Arrumar a cama', duration: 5, rule: (anchors: any, prevEnd: number) => prevEnd, days: ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'] as Weekday[] },
    { id: 'Tomar café da manhã', duration: 20, rule: (anchors: any, prevEnd: number) => prevEnd, days: ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'] as Weekday[] },
    { id: 'Escovar os dentes (após acordar)', duration: 5, rule: (anchors: any, prevEnd: number) => prevEnd, days: ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'] as Weekday[] },

    // --- Bloco de Estudo (se houver tempo antes do almoço) ---
    { id: 'Fazer a lição de casa', duration: 55, rule: (anchors: any, prevEnd: number) => prevEnd, days: ['MO', 'TU', 'WE', 'TH', 'FR'] as Weekday[] },
    { id: 'Organizar a mochila para amanhã', duration: 5, rule: (anchors: any, prevEnd: number) => prevEnd, days: ['SU', 'MO', 'TU', 'WE', 'TH'] as Weekday[] },
    
    // --- Bloco Pré-Escola ---
    { id: 'Almoçar', duration: 20, rule: (anchors: any, prevEnd: number) => anchors.lunch, days: ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'] as Weekday[] },
    { id: 'Escovar os dentes (após almoço)', duration: 5, rule: (anchors: any, prevEnd: number) => prevEnd, days: ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'] as Weekday[] },
    { id: 'Banho Matinal', duration: 15, rule: (anchors: any, prevEnd: number) => prevEnd, days: ['MO', 'TU', 'WE', 'TH', 'FR'] as Weekday[] },
    
    // --- Âncoras da Escola (não são tarefas, mas definem o bloco) ---
    { id: 'Início da Escola', duration: 0, rule: (anchors: any, prevEnd: number) => anchors.schoolStart, days: ['MO', 'TU', 'WE', 'TH', 'FR'] as Weekday[], type: 'school_entry' },
    { id: 'Saída da Escola', duration: 0, rule: (anchors: any, prevEnd: number) => anchors.schoolShiftEnd, days: ['MO', 'TU', 'WE', 'TH', 'FR'] as Weekday[], type: 'school_exit' },

    // --- Bloco da Noite ---
    { id: 'Jantar', duration: 20, rule: (anchors: any, prevEnd: number) => anchors.dinner, days: ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'] as Weekday[] },
    { id: 'Escovar os dentes (após jantar)', duration: 5, rule: (anchors: any, prevEnd: number) => prevEnd, days: ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'] as Weekday[] },
    { id: 'Banho Noturno', duration: 20, rule: (anchors: any, prevEnd: number) => prevEnd, isFlexible: true, days: ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'] as Weekday[] },
    { id: 'Hora de dormir', duration: 0, rule: (anchors: any, prevEnd: number) => anchors.sleep, days: ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'] as Weekday[] },
];

const addAndOccupy = (
    activityName: string, 
    startTime: number, 
    duration: number, 
    occupiedSlots: any[], 
    schedule: ScheduleItem[], 
    days: Weekday[], 
    type: 'essential_routine' | 'extra_activity' | 'school_entry' | 'school_exit'
) => {
    // Only add if duration is meaningful for actual tasks
    if (duration < 1 && type === 'essential_routine') return;
    
    const endTime = startTime + duration;
    const details = findMissionDetails(activityName);
    
    const newScheduleItem = {
        activity: activityName,
        startTime: formatTime(startTime),
        endTime: formatTime(endTime),
        days: days,
        type: type,
        emoji: type === 'school_entry' ? '🏫' : type === 'school_exit' ? '🏡' : details.emoji,
        category: details.category
    };

    if (type !== 'school_entry' && type !== 'school_exit') {
        schedule.push(newScheduleItem);
    }
    
    days.forEach(day => {
        occupiedSlots.push({ day, start: startTime, end: endTime, activity: activityName });
    });
};
    
export async function generateSchedule(input: OnboardingFormValues): Promise<{ schedule: ScheduleItem[] }> {
    const finalSchedule: ScheduleItem[] = [];
    const occupiedSlots: { day: Weekday, start: number, end: number, activity: string }[] = [];

    // 1. Bloquear horários de atividades extras primeiro
    (input.extraActivities || []).forEach(activity => {
        if (activity.name && activity.days && activity.startTime && activity.endTime) {
            addAndOccupy(activity.name, parseTime(activity.startTime), parseTime(activity.endTime) - parseTime(activity.startTime), occupiedSlots, finalSchedule, activity.days as Weekday[], 'extra_activity');
        }
    });

    // 2. Mapear âncoras de horário
    const anchors = {
        wakeUp: parseTime(input.wakeUpTime),
        schoolStart: parseTime(input.schoolShiftStart),
        schoolShiftEnd: parseTime(input.schoolShiftEnd),
        lunch: parseTime(input.lunchTime),
        dinner: parseTime(input.dinnerTime),
        sleep: parseTime(input.sleepTime),
    };
    
    // 3. Bloquear o horário escolar
    if (input.schoolShift !== 'not_applicable') {
        const schoolDuration = anchors.schoolShiftEnd - anchors.schoolStart;
        if (schoolDuration > 0) {
            addAndOccupy(
                'Escola', 
                anchors.schoolStart, 
                schoolDuration, 
                occupiedSlots, 
                [], // Não adiciona à lista final de missões, apenas ocupa o tempo
                ['MO', 'TU', 'WE', 'TH', 'FR'], 
                'school_entry'
            );
        }
    }
    
    const userRoutines = new Set(input.essentialRoutines);

    let lastEndTimeByDay: Record<Weekday, number> = { MO: 0, TU: 0, WE: 0, TH: 0, FR: 0, SA: 0, SU: 0 };
    Object.keys(lastEndTimeByDay).forEach(day => {
        lastEndTimeByDay[day as Weekday] = anchors.wakeUp;
    });

    const rulesToProcess = routineRules.filter(r => userRoutines.has(r.id));
    
    for (const rule of rulesToProcess) {
        if (!userRoutines.has(rule.id)) continue;

        rule.days.forEach(day => {
            let startTime = rule.rule(anchors, lastEndTimeByDay[day]);
            let duration = rule.duration;

            let conflict = occupiedSlots.some(slot => 
                slot.day === day &&
                Math.max(startTime, slot.start) < Math.min(startTime + duration, slot.end)
            );

            if (conflict && rule.isFlexible) {
                // Tenta encontrar um novo slot
                let foundSlot = false;
                for(let t = startTime + 5; t < anchors.sleep - duration; t += 5) {
                    const potentialEndTime = t + duration;
                    const newConflict = occupiedSlots.some(slot => 
                        slot.day === day &&
                        Math.max(t, slot.start) < Math.min(potentialEndTime, slot.end)
                    );
                    if (!newConflict) {
                        startTime = t;
                        foundSlot = true;
                        break;
                    }
                }
                 if (!foundSlot) return; // Skip if no slot found for flexible task
            } else if (conflict) {
                return; // Skip non-flexible conflicting tasks
            }
            
            const type = (rule as any).type || 'essential_routine';
            addAndOccupy(rule.id, startTime, duration, occupiedSlots, finalSchedule, [day], type);

            // Update lastEndTime for the sequential tasks for this specific day
            if (!rule.rule.toString().includes('anchors.')) {
                 lastEndTimeByDay[day] = startTime + duration;
            }
        });
    }
    
    // Remove duplicates that might arise from different rules mapping to the same task
    const uniqueSchedule = Array.from(new Map(finalSchedule.map(item => [item.activity + item.startTime, item])).values());

    return {
        schedule: uniqueSchedule.sort((a,b) => parseTime(a.startTime!) - parseTime(b.startTime!)),
    };
}

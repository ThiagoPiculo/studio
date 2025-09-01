
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

const addAndOccupy = (
    activityName: string, 
    startTime: number, 
    duration: number, 
    occupiedSlots: any[], 
    schedule: ScheduleItem[], 
    days: Weekday[], 
    type: 'essential_routine' | 'extra_activity' | 'school_entry' | 'school_exit'
) => {
    // Only add if duration is meaningful
    if (duration < 5) return;
    
    const endTime = startTime + duration;
    const details = findMissionDetails(activityName);
    
    schedule.push({
        activity: activityName,
        startTime: formatTime(startTime),
        endTime: formatTime(endTime),
        days: days,
        type: type,
        emoji: type === 'school_entry' ? '📒' : details.emoji, // Specific emoji for school
        category: details.category
    });

    days.forEach(day => {
        occupiedSlots.push({ day, start: startTime, end: endTime, activity: activityName });
    });
};

const routineRules = [
    // --- Bloco da Manhã ---
    { id: 'Hora de acordar', duration: 0, rule: (anchors: any, prevEnd: number) => anchors.wakeUp, days: ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'] as Weekday[] },
    { id: 'Arrumar a cama', duration: 0, rule: (anchors: any, prevEnd: number) => anchors.wakeUp + 10, days: ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'] as Weekday[] },
    { id: 'Tomar café da manhã', duration: 0, rule: (anchors: any, prevEnd: number) => anchors.wakeUp + 15, days: ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'] as Weekday[] },
    { id: 'Escovar os dentes (após acordar)', duration: 0, rule: (anchors: any, prevEnd: number) => anchors.wakeUp + 30, days: ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'] as Weekday[] },

    // --- Bloco de Estudo (se houver tempo antes do almoço) ---
    { id: 'Fazer a lição de casa', duration: 0, rule: (anchors: any, prevEnd: number) => anchors.wakeUp + 60, days: ['MO', 'TU', 'WE', 'TH', 'FR'] as Weekday[] },
    { id: 'Organizar a mochila para amanhã', duration: 0, rule: (anchors: any, prevEnd: number) => anchors.wakeUp + 60 + 55, days: ['SU', 'MO', 'TU', 'WE', 'TH'] as Weekday[] },

    // --- Bloco Pré-Escola ---
    { id: 'Tomar banho', duration: 0, rule: (anchors: any, prevEnd: number) => anchors.schoolStart - 60, days: ['MO', 'TU', 'WE', 'TH', 'FR'] as Weekday[] },
    { id: 'Almoçar', duration: 0, rule: (anchors: any, prevEnd: number) => anchors.lunch, days: ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'] as Weekday[] },
    { id: 'Escovar os dentes (após almoço)', duration: 0, rule: (anchors: any, prevEnd: number) => anchors.lunch + 20, days: ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'] as Weekday[] },
    { id: 'Sair para escola', duration: 0, rule: (anchors: any) => anchors.schoolStart - 20, days: ['MO', 'TU', 'WE', 'TH', 'FR'] as Weekday[] },

    // --- Âncoras da Escola (não são tarefas, mas definem o bloco) ---
    { id: 'Início da Escola', duration: 0, rule: (anchors: any, prevEnd: number) => anchors.schoolStart, days: ['MO', 'TU', 'WE', 'TH', 'FR'] as Weekday[], type: 'school_entry' },
    { id: 'Saída da Escola', duration: 0, rule: (anchors: any, prevEnd: number) => anchors.schoolShiftEnd, days: ['MO', 'TU', 'WE', 'TH', 'FR'] as Weekday[], type: 'school_exit' },

    // --- Bloco da Noite ---
    { id: 'Jantar', duration: 0, rule: (anchors: any, prevEnd: number) => anchors.dinner, isFlexible: true, days: ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'] as Weekday[] },
    { id: 'Escovar os dentes (após jantar)', duration: 0, rule: (anchors: any, prevEnd: number) => anchors.dinner + 20, days: ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'] as Weekday[] },
    { id: 'Tomar banho', duration: 0, rule: (anchors: any, prevEnd: number) => anchors.sleep - 20, isFlexible: true, days: ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'] as Weekday[] },
    { id: 'Hora de dormir', duration: 0, rule: (anchors: any, prevEnd: number) => anchors.sleep, days: ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'] as Weekday[] },
];
    
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
    
    // Processar tarefas sequencialmente por dia e por bloco
    const allDays: Weekday[] = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];
    for (const day of allDays) {
        let lastEndTime = 0;
        
        const dayRules = routineRules.filter(r => r.days.includes(day) && input.essentialRoutines?.includes(r.id));
        const blocks = ['morning', 'pre-school', 'night'];

        for (const block of blocks) {
            const blockRules = dayRules.filter(r => (r as any).block === block).sort((a, b) => a.rule(anchors, 0) - b.rule(anchors, 0));
            let blockLastEndTime = 0;
            let isFirstInBlock = true;

            for (const rule of blockRules) {
                let startTime = isFirstInBlock ? rule.rule(anchors, 0) : blockLastEndTime;
                isFirstInBlock = false;
                let duration = rule.duration;
                
                // Lógica de encaixe
                let conflict = true;
                let iterations = 0;
                const MAX_ITERATIONS = 100;
                
                while (conflict && iterations < MAX_ITERATIONS) {
                    conflict = false;
                    iterations++;
                    
                    let potentialEndTime = startTime + duration;
                    const daySlots = occupiedSlots.filter(s => s.day === day).sort((a,b) => a.start - b.start);
                    
                    for (const slot of daySlots) {
                        if (Math.max(startTime, slot.start) < Math.min(potentialEndTime, slot.end)) {
                            conflict = true;
                            startTime = slot.end + 1; // Tenta agendar 1 min depois
                            potentialEndTime = startTime + duration;
                            break; 
                        }
                    }
                }
                
                if (duration > 0 && !conflict) {
                    const type = (rule as any).type || 'essential_routine';
                    addAndOccupy(rule.id, startTime, duration, occupiedSlots, finalSchedule, [day], type);
                    blockLastEndTime = startTime + duration;
                }
            }
        }
    }
    
    const uniqueSchedule = Array.from(new Map(finalSchedule.map(item => [item.activity + item.days.join(','), item])).values());
    
    // Manually add the school entry and exit to ensure they are present and correct
    if (input.schoolShift !== 'not_applicable') {
        uniqueSchedule.push({
            activity: 'Início da Escola', startTime: formatTime(anchors.schoolStart), endTime: formatTime(anchors.schoolStart),
            days: ['MO', 'TU', 'WE', 'TH', 'FR'], type: 'school_entry', emoji: '📒', category: 'school'
        });
        uniqueSchedule.push({
            activity: 'Saída da Escola', startTime: formatTime(anchors.schoolShiftEnd), endTime: formatTime(anchors.schoolShiftEnd),
            days: ['MO', 'TU', 'WE', 'TH', 'FR'], type: 'school_exit', emoji: '🏫', category: 'school'
        });
    }

    return {
        schedule: uniqueSchedule.sort((a,b) => parseTime(a.startTime!) - parseTime(b.startTime!)),
    };
}

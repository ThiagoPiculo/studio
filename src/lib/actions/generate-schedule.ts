
'use server';

import type { OnboardingFormValues } from '@/components/dashboard/onboarding/OnboardingForm';
import { predefinedMissionGroups } from '@/lib/predefined-missions';
import type { ScheduleItem, Weekday, MissionCategory, SchoolShift } from '@/lib/types';
import { allWeekdays } from '@/lib/types';

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
  return {
    emoji: predefined?.emoji || '✨',
    category: predefined?.suggestedAppCategory || ('essential_routines' as MissionCategory),
  };
};

type RoutineRule = {
    id: string;
    duration: number; // in minutes
    anchor: 'wakeUp' | 'lunch' | 'dinner' | 'sleep' | 'schoolStart' | 'schoolEnd' | 'prevTask';
    offset?: number; // in minutes, relative to anchor
    days: Weekday[];
};

const routineBlueprints: Record<SchoolShift, RoutineRule[]> = {
    morning: [
        // Bloco: Hora de Acordar
        { id: 'Hora de acordar', duration: 10, anchor: 'wakeUp', offset: 0, days: allWeekdays },
        { id: 'Arrumar a cama', duration: 5, anchor: 'prevTask', days: allWeekdays },
        { id: 'Tomar café da manhã', duration: 20, anchor: 'prevTask', days: allWeekdays },
        { id: 'Escovar os dentes (após acordar)', duration: 5, anchor: 'prevTask', days: allWeekdays },
        // Bloco: antes da escola
        { id: 'Sair para escola', duration: 0, anchor: 'schoolStart', offset: -15, days: ['MO', 'TU', 'WE', 'TH', 'FR'] },
        { id: 'Entrada na escola', duration: 0, anchor: 'schoolStart', offset: 0, days: ['MO', 'TU', 'WE', 'TH', 'FR'] },
        // Bloco: após a escola
        { id: 'Saída da escola', duration: 0, anchor: 'schoolEnd', offset: 0, days: ['MO', 'TU', 'WE', 'TH', 'FR'] },
        { id: 'Almoçar', duration: 20, anchor: 'lunch', days: allWeekdays },
        { id: 'Escovar os dentes (após almoço)', duration: 5, anchor: 'prevTask', days: allWeekdays },
        { id: 'Fazer a lição de casa', duration: 50, anchor: 'prevTask', offset: 15, days: ['MO', 'TU', 'WE', 'TH', 'FR'] },
        { id: 'Organizar a mochila para escola', duration: 10, anchor: 'prevTask', days: ['SU', 'MO', 'TU', 'WE', 'TH'] },
        { id: 'Lanche da tarde', duration: 15, anchor: 'lunch', offset: 180, days: allWeekdays },
        { id: 'Hora do Jantar', duration: 20, anchor: 'dinner', days: allWeekdays },
        { id: 'Escovar os dentes (após jantar)', duration: 5, anchor: 'prevTask', days: allWeekdays },
        // Bloco: Hora de Dormir
        { id: 'Tomar banho a Noite', duration: 20, anchor: 'sleep', offset: -30, days: allWeekdays },
        { id: 'Escovar os dentes (antes de dormir)', duration: 5, anchor: 'prevTask', days: allWeekdays },
        { id: 'Hora de dormir', duration: 0, anchor: 'sleep', offset: 0, days: allWeekdays },
    ],
    afternoon: [
        // Bloco: Hora de Acordar
        { id: 'Hora de acordar', duration: 10, anchor: 'wakeUp', offset: 0, days: allWeekdays },
        { id: 'Arrumar a cama', duration: 5, anchor: 'prevTask', days: allWeekdays },
        { id: 'Tomar café da manhã', duration: 20, anchor: 'prevTask', days: allWeekdays },
        { id: 'Escovar os dentes (após acordar)', duration: 5, anchor: 'prevTask', days: allWeekdays },
        { id: 'Fazer a lição de casa', duration: 50, anchor: 'prevTask', offset: 15, days: ['MO', 'TU', 'WE', 'TH', 'FR'] },
        { id: 'Organizar a mochila para escola', duration: 10, anchor: 'prevTask', days: ['SU', 'MO', 'TU', 'WE', 'TH'] },
        // Bloco: Antes da escola
        { id: 'Tomar banho pela Manhã', duration: 20, anchor: 'lunch', offset: -30, days: allWeekdays },
        { id: 'Almoçar', duration: 20, anchor: 'lunch', offset: 0, days: allWeekdays },
        { id: 'Escovar os dentes (após almoço)', duration: 5, anchor: 'prevTask', days: allWeekdays },
        { id: 'Sair para escola', duration: 0, anchor: 'schoolStart', offset: -15, days: ['MO', 'TU', 'WE', 'TH', 'FR'] },
        // Bloco: após a escola
        { id: 'Saída da escola', duration: 0, anchor: 'schoolEnd', offset: 0, days: ['MO', 'TU', 'WE', 'TH', 'FR'] },
        { id: 'Hora do Jantar', duration: 20, anchor: 'dinner', days: allWeekdays },
        { id: 'Escovar os dentes (após jantar)', duration: 5, anchor: 'prevTask', days: allWeekdays },
        // Bloco: Hora de Dormir
        { id: 'Tomar banho a Noite', duration: 20, anchor: 'sleep', offset: -30, days: allWeekdays },
        { id: 'Escovar os dentes (antes de dormir)', duration: 5, anchor: 'prevTask', days: allWeekdays },
        { id: 'Hora de dormir', duration: 0, anchor: 'sleep', offset: 0, days: allWeekdays },
    ],
    full_time: [
        // Bloco: Hora de Acordar
        { id: 'Hora de acordar', duration: 10, anchor: 'wakeUp', offset: 0, days: allWeekdays },
        { id: 'Arrumar a cama', duration: 5, anchor: 'prevTask', days: allWeekdays },
        { id: 'Tomar café da manhã', duration: 20, anchor: 'prevTask', days: allWeekdays },
        { id: 'Escovar os dentes (após acordar)', duration: 5, anchor: 'prevTask', days: allWeekdays },
        // Bloco: antes da escola
        { id: 'Sair para escola', duration: 0, anchor: 'schoolStart', offset: -15, days: ['MO', 'TU', 'WE', 'TH', 'FR'] },
        { id: 'Entrada na escola', duration: 0, anchor: 'schoolStart', offset: 0, days: ['MO', 'TU', 'WE', 'TH', 'FR'] },
        // Bloco: após a escola
        { id: 'Saída da escola', duration: 0, anchor: 'schoolEnd', offset: 0, days: ['MO', 'TU', 'WE', 'TH', 'FR'] },
        { id: 'Hora do Jantar', duration: 20, anchor: 'dinner', days: allWeekdays },
        { id: 'Escovar os dentes (após jantar)', duration: 5, anchor: 'prevTask', days: allWeekdays },
        // Bloco: Hora de Dormir
        { id: 'Tomar banho a Noite', duration: 20, anchor: 'sleep', offset: -30, days: allWeekdays },
        { id: 'Escovar os dentes (antes de dormir)', duration: 5, anchor: 'prevTask', days: allWeekdays },
        { id: 'Hora de dormir', duration: 0, anchor: 'sleep', offset: 0, days: allWeekdays },
    ],
    not_applicable: [
         // Bloco: Hora de Acordar
        { id: 'Hora de acordar', duration: 10, anchor: 'wakeUp', offset: 0, days: allWeekdays },
        { id: 'Arrumar a cama', duration: 5, anchor: 'prevTask', days: allWeekdays },
        { id: 'Tomar café da manhã', duration: 20, anchor: 'prevTask', days: allWeekdays },
        { id: 'Escovar os dentes (após acordar)', duration: 5, anchor: 'prevTask', days: allWeekdays },
        // Bloco: Almoço
        { id: 'Tomar banho pela Manhã', duration: 20, anchor: 'lunch', offset: -30, days: allWeekdays },
        { id: 'Almoçar', duration: 20, anchor: 'lunch', offset: 0, days: allWeekdays },
        { id: 'Escovar os dentes (após almoço)', duration: 5, anchor: 'prevTask', days: allWeekdays },
        { id: 'Lanche da tarde', duration: 15, anchor: 'lunch', offset: 180, days: allWeekdays },
        // Bloco: Jantar
        { id: 'Hora do Jantar', duration: 20, anchor: 'dinner', days: allWeekdays },
        { id: 'Escovar os dentes (após jantar)', duration: 5, anchor: 'prevTask', days: allWeekdays },
        // Bloco: Hora de Dormir
        { id: 'Tomar banho a Noite', duration: 20, anchor: 'sleep', offset: -30, days: allWeekdays },
        { id: 'Escovar os dentes (antes de dormir)', duration: 5, anchor: 'prevTask', days: allWeekdays },
        { id: 'Hora de dormir', duration: 0, anchor: 'sleep', offset: 0, days: allWeekdays },
    ],
};

const findNextAvailableSlot = (startTime: number, duration: number, occupiedSlots: { start: number; end: number }[]): number => {
    let proposedStart = startTime;
    const proposedEnd = proposedStart + duration;

    // Check for conflict and adjust start time if needed
    for (const slot of occupiedSlots) {
        // If the proposed task overlaps with an occupied slot
        if (proposedStart < slot.end && proposedEnd > slot.start) {
            // Move the start time to the end of the conflicting slot
            proposedStart = slot.end;
        }
    }
    return proposedStart;
};


export async function generateSchedule(input: OnboardingFormValues): Promise<{ schedule: ScheduleItem[] }> {
    const finalSchedule: ScheduleItem[] = [];
    const occupiedSlotsByDay: Record<Weekday, { start: number; end: number }[]> = { MO: [], TU: [], WE: [], TH: [], FR: [], SA: [], SU: [] };

    // 1. Prioritize and block fixed schedules (school and extra activities)
    if (input.schoolShift !== 'not_applicable') {
        const schoolStart = parseTime(input.schoolShiftStart);
        const schoolEnd = parseTime(input.schoolShiftEnd);
        const schoolDays: Weekday[] = ['MO', 'TU', 'WE', 'TH', 'FR'];
        schoolDays.forEach(day => {
            occupiedSlotsByDay[day].push({ start: schoolStart, end: schoolEnd });
        });
    }

    (input.extraActivities || []).forEach(activity => {
        if (activity.name && activity.days && activity.startTime && activity.endTime) {
            const start = parseTime(activity.startTime);
            const end = parseTime(activity.endTime);
            const details = findMissionDetails(activity.name);
            activity.days.forEach(day => {
                occupiedSlotsByDay[day as Weekday].push({ start, end });
                finalSchedule.push({
                    activity: activity.name,
                    startTime: formatTime(start),
                    endTime: formatTime(end),
                    days: [day as Weekday],
                    type: 'extra_activity',
                    emoji: details.emoji,
                    category: details.category
                });
            });
        }
    });

    // Sort occupied slots to make conflict checking efficient
    for (const day in occupiedSlotsByDay) {
        occupiedSlotsByDay[day as Weekday].sort((a, b) => a.start - b.start);
    }

    // 2. Select the correct blueprint based on school shift
    const blueprint = routineBlueprints[input.schoolShift] || routineBlueprints.not_applicable;
    const userRoutines = new Set(input.essentialRoutines);

    // 3. Define anchor times
    const anchors = {
        wakeUp: parseTime(input.wakeUpTime),
        schoolStart: parseTime(input.schoolShiftStart),
        schoolEnd: parseTime(input.schoolShiftEnd),
        lunch: parseTime(input.lunchTime),
        dinner: parseTime(input.dinnerTime),
        sleep: parseTime(input.sleepTime),
    };

    const lastEndTimeByDay: Partial<Record<Weekday, number>> = {};

    // 4. Process the blueprint sequentially
    for (const rule of blueprint) {
        if (!userRoutines.has(rule.id)) continue;

        for (const day of rule.days) {
            let baseTime: number;
            
            if (rule.anchor === 'prevTask') {
                // If it's the first task of the day for this sequential block, it should anchor to something else.
                // This logic assumes the blueprint is ordered correctly. A more robust solution might search for the appropriate anchor.
                baseTime = lastEndTimeByDay[day] || anchors.wakeUp;
            } else {
                baseTime = anchors[rule.anchor];
            }

            let startTime = baseTime + (rule.offset || 0);

            // "Rio que desvia" logic
            let resolvedStartTime = findNextAvailableSlot(startTime, rule.duration, occupiedSlotsByDay[day]);
            
            // If the time was pushed forward, check against the next task's anchor to avoid jumping over it.
            // This is a simplified conflict resolution. More complex scenarios might need more rules.
            const nextAnchorRule = blueprint.find(r => r.anchor !== 'prevTask' && r.anchor !== rule.anchor && parseTime(input[r.anchor] as string) > resolvedStartTime);
            if (nextAnchorRule) {
                const nextAnchorTime = parseTime(input[nextAnchorRule.anchor] as string);
                if (resolvedStartTime + rule.duration > nextAnchorTime) {
                   // Skip adding this task if it doesn't fit before the next major anchor
                   continue;
                }
            }
            
            const endTime = resolvedStartTime + rule.duration;

            const details = findMissionDetails(rule.id);
            const type = (rule as any).type || 'essential_routine';

            finalSchedule.push({
                activity: rule.id,
                startTime: formatTime(resolvedStartTime),
                endTime: formatTime(endTime),
                days: [day],
                type: type,
                emoji: details.emoji,
                category: details.category
            });

            // Update the last end time for the next sequential task on this day
            lastEndTimeByDay[day] = endTime;
        }
    }

    // 5. Clean up and sort the final schedule
    const uniqueSchedule = Array.from(new Map(finalSchedule.map(item => [item.activity + item.startTime + item.days.join(), item])).values());

    return {
        schedule: uniqueSchedule.sort((a,b) => parseTime(a.startTime!) - parseTime(b.startTime!)),
    };
}

    
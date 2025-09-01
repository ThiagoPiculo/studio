
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
};

const routineBlueprints: Record<SchoolShift, RoutineRule[]> = {
    morning: [
        // Bloco: Hora de Acordar
        { id: 'Hora de acordar', duration: 10, anchor: 'wakeUp', offset: 0 },
        { id: 'Arrumar a cama', duration: 5, anchor: 'prevTask' },
        { id: 'Tomar café da manhã', duration: 20, anchor: 'prevTask' },
        { id: 'Escovar os dentes (após acordar)', duration: 5, anchor: 'prevTask' },
        // Bloco: antes da escola
        { id: 'Sair para escola', duration: 20, anchor: 'schoolStart', offset: -20 },
        // Bloco: após a escola
        { id: 'Almoçar', duration: 20, anchor: 'lunch', offset: 0 },
        { id: 'Escovar os dentes (após almoço)', duration: 5, anchor: 'prevTask' },
        { id: 'Fazer a lição de casa', duration: 50, anchor: 'lunch', offset: 120 },
        { id: 'Organizar a mochila para escola', duration: 10, anchor: 'prevTask' },
        { id: 'Lanche da tarde', duration: 15, anchor: 'lunch', offset: 180 },
        // Bloco: Jantar
        { id: 'Hora do Jantar', duration: 20, anchor: 'dinner', offset: 0 },
        { id: 'Escovar os dentes (após jantar)', duration: 5, anchor: 'prevTask' },
        // Bloco: Hora de Dormir
        { id: 'Tomar banho a Noite', duration: 20, anchor: 'sleep', offset: -55 },
        { id: 'Escovar os dentes (antes de dormir)', duration: 5, anchor: 'sleep', offset: -35 },
        { id: 'Hora de dormir', duration: 30, anchor: 'sleep', offset: -30 },
    ],
    afternoon: [
        // Bloco: Hora de Acordar
        { id: 'Hora de acordar', duration: 10, anchor: 'wakeUp', offset: 0 },
        { id: 'Arrumar a cama', duration: 5, anchor: 'prevTask' },
        { id: 'Tomar café da manhã', duration: 20, anchor: 'prevTask' },
        { id: 'Escovar os dentes (após acordar)', duration: 5, anchor: 'prevTask' },
        { id: 'Fazer a lição de casa', duration: 50, anchor: 'wakeUp', offset: 60 },
        { id: 'Organizar a mochila para escola', duration: 10, anchor: 'prevTask' },
        // Bloco: Antes da escola
        { id: 'Tomar banho pela Manhã', duration: 20, anchor: 'lunch', offset: -55 },
        { id: 'Almoçar', duration: 20, anchor: 'lunch', offset: -35 },
        { id: 'Escovar os dentes (após almoço)', duration: 5, anchor: 'lunch', offset: -15 },
        { id: 'Sair para escola', duration: 20, anchor: 'schoolStart', offset: -20 },
        // Bloco: Jantar
        { id: 'Hora do Jantar', duration: 20, anchor: 'dinner', offset: 0 },
        { id: 'Escovar os dentes (após jantar)', duration: 5, anchor: 'prevTask' },
        // Bloco: Hora de Dormir
        { id: 'Tomar banho a Noite', duration: 20, anchor: 'sleep', offset: -55 },
        { id: 'Escovar os dentes (antes de dormir)', duration: 5, anchor: 'sleep', offset: -35 },
        { id: 'Hora de dormir', duration: 30, anchor: 'sleep', offset: -30 },
    ],
    full_time: [
        // Bloco: Hora de Acordar
        { id: 'Hora de acordar', duration: 10, anchor: 'wakeUp', offset: 0 },
        { id: 'Arrumar a cama', duration: 5, anchor: 'prevTask' },
        { id: 'Tomar café da manhã', duration: 20, anchor: 'prevTask' },
        { id: 'Escovar os dentes (após acordar)', duration: 5, anchor: 'prevTask' },
        // Bloco: antes da escola
        { id: 'Sair para escola', duration: 20, anchor: 'schoolStart', offset: -20 },
        // Bloco: Jantar
        { id: 'Hora do Jantar', duration: 20, anchor: 'dinner', offset: 0 },
        { id: 'Escovar os dentes (após jantar)', duration: 5, anchor: 'prevTask' },
        // Bloco: Hora de Dormir
        { id: 'Tomar banho a Noite', duration: 20, anchor: 'sleep', offset: -55 },
        { id: 'Escovar os dentes (antes de dormir)', duration: 5, anchor: 'sleep', offset: -35 },
        { id: 'Hora de dormir', duration: 30, anchor: 'sleep', offset: -30 },
    ],
    not_applicable: [
         // Bloco: Hora de Acordar
        { id: 'Hora de acordar', duration: 10, anchor: 'wakeUp', offset: 0 },
        { id: 'Arrumar a cama', duration: 5, anchor: 'prevTask' },
        { id: 'Tomar café da manhã', duration: 20, anchor: 'prevTask' },
        { id: 'Escovar os dentes (após acordar)', duration: 5, anchor: 'prevTask' },
        // Bloco: Almoço
        { id: 'Tomar banho pela Manhã', duration: 20, anchor: 'lunch', offset: -55 },
        { id: 'Almoçar', duration: 20, anchor: 'lunch', offset: -35 },
        { id: 'Escovar os dentes (após almoço)', duration: 5, anchor: 'lunch', offset: -15 },
        { id: 'Lanche da tarde', duration: 15, anchor: 'lunch', offset: 180 },
        // Bloco: Jantar
        { id: 'Hora do Jantar', duration: 20, anchor: 'dinner', offset: 0 },
        { id: 'Escovar os dentes (após jantar)', duration: 5, anchor: 'prevTask' },
        // Bloco: Hora de Dormir
        { id: 'Tomar banho a Noite', duration: 20, anchor: 'sleep', offset: -55 },
        { id: 'Escovar os dentes (antes de dormir)', duration: 5, anchor: 'sleep', offset: -35 },
        { id: 'Hora de dormir', duration: 30, anchor: 'sleep', offset: -30 },
    ],
};

const findNextAvailableSlot = (startTime: number, duration: number, occupiedSlots: { start: number; end: number }[]): number => {
    let proposedStart = startTime;

    while (true) {
        let conflict = false;
        const proposedEnd = proposedStart + duration;
        for (const slot of occupiedSlots) {
            if (proposedStart < slot.end && proposedEnd > slot.start) {
                proposedStart = slot.end; // Move to the end of the conflicting slot
                conflict = true;
                break; 
            }
        }
        if (!conflict) {
            return proposedStart;
        }
    }
};


export async function generateSchedule(input: OnboardingFormValues): Promise<{ schedule: ScheduleItem[] }> {
    const finalScheduleByDay: Record<Weekday, ScheduleItem[]> = { MO: [], TU: [], WE: [], TH: [], FR: [], SA: [], SU: [] };
    const occupiedSlotsByDay: Record<Weekday, { start: number; end: number }[]> = { MO: [], TU: [], WE: [], TH: [], FR: [], SA: [], SU: [] };

    // 1. Prioritize and block fixed schedules
    const schoolDays: Weekday[] = ['MO', 'TU', 'WE', 'TH', 'FR'];
    if (input.schoolShift !== 'not_applicable') {
        const schoolStart = parseTime(input.schoolShiftStart);
        const schoolEnd = parseTime(input.schoolShiftEnd);
        schoolDays.forEach(day => {
            occupiedSlotsByDay[day].push({ start: schoolStart, end: schoolEnd });
            finalScheduleByDay[day].push({
                activity: 'Entrada na escola', startTime: formatTime(schoolStart), endTime: formatTime(schoolStart),
                days: [day], type: 'school_entry', emoji: '📒', category: 'school'
            });
             finalScheduleByDay[day].push({
                activity: 'Saída da escola', startTime: formatTime(schoolEnd), endTime: formatTime(schoolEnd),
                days: [day], type: 'school_exit', emoji: '📒', category: 'school'
            });
        });
    }

    (input.extraActivities || []).forEach(activity => {
        if (activity.name && activity.days && activity.startTime && activity.endTime) {
            const start = parseTime(activity.startTime);
            const end = parseTime(activity.endTime);
            const details = findMissionDetails(activity.name);
            activity.days.forEach(day => {
                occupiedSlotsByDay[day as Weekday].push({ start, end });
                finalScheduleByDay[day as Weekday].push({
                    activity: activity.name, startTime: formatTime(start), endTime: formatTime(end),
                    days: [day as Weekday], type: 'extra_activity', emoji: details.emoji, category: details.category
                });
            });
        }
    });

    // Sort occupied slots
    for (const day in occupiedSlotsByDay) {
        occupiedSlotsByDay[day as Weekday].sort((a, b) => a.start - b.start);
    }
    
    const userRoutines = new Set(input.essentialRoutines);

    // 2. Process each day of the week
    for (const day of allWeekdays) {
        const isWeekend = day === 'SA' || day === 'SU';
        const shiftForThisDay = isWeekend ? 'not_applicable' : input.schoolShift;
        const blueprint = routineBlueprints[shiftForThisDay];
        
        const anchors = {
            wakeUp: parseTime(input.wakeUpTime),
            schoolStart: parseTime(input.schoolShiftStart),
            schoolEnd: parseTime(input.schoolShiftEnd),
            lunch: parseTime(input.lunchTime),
            dinner: parseTime(input.dinnerTime),
            sleep: parseTime(input.sleepTime),
        };

        let lastEndTime = 0;

        // 3. Process the blueprint for the current day
        for (const rule of blueprint) {
            if (!userRoutines.has(rule.id)) continue;

            let baseTime: number;
            
            if (rule.anchor === 'prevTask') {
                baseTime = lastEndTime;
            } else {
                baseTime = anchors[rule.anchor];
            }

            let startTime = baseTime + (rule.offset || 0);
            
            // "Rio que desvia" logic
            let resolvedStartTime = findNextAvailableSlot(startTime, rule.duration, occupiedSlotsByDay[day]);
            
            const endTime = resolvedStartTime + rule.duration;
            
            const details = findMissionDetails(rule.id);
            const type = (rule as any).type || 'essential_routine';

            finalScheduleByDay[day].push({
                activity: rule.id,
                startTime: formatTime(resolvedStartTime),
                endTime: formatTime(endTime),
                days: [day],
                type: type,
                emoji: details.emoji,
                category: details.category
            });

            occupiedSlotsByDay[day].push({ start: resolvedStartTime, end: endTime });
            occupiedSlotsByDay[day].sort((a, b) => a.start - b.start);

            lastEndTime = endTime;
        }
    }
    
    // 4. Flatten and sort the final schedule
    const finalSchedule = Object.values(finalScheduleByDay).flat();

    return {
        schedule: finalSchedule.sort((a,b) => parseTime(a.startTime!) - parseTime(b.startTime!)),
    };
}

    
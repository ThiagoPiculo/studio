
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
    duration: 15, // Default duration if not specified, can be more specific later
  };
};

// --- NEW ROUTINE BLUEPRINTS ---
type RoutineRule = {
  id: string;
  duration: number; // in minutes
  anchor: 'wakeUp' | 'lunch' | 'dinner' | 'sleep' | 'schoolStart' | 'schoolEnd' | 'prevTask' | 'none'; // 'none' for fixed offset from another anchor
  offset?: number; // in minutes, relative to anchor
};

const routineBlueprints: Record<SchoolShift, RoutineRule[]> = {
  morning: [
    { id: 'Hora de acordar', duration: 10, anchor: 'wakeUp' },
    { id: 'Arrumar a cama', duration: 5, anchor: 'prevTask' },
    { id: 'Tomar café da manhã', duration: 20, anchor: 'prevTask' },
    { id: 'Escovar os dentes (após acordar)', duration: 5, anchor: 'prevTask' },
    { id: 'Sair para escola', duration: 20, anchor: 'schoolStart', offset: -20 },
    { id: 'Entrada na escola', duration: 0, anchor: 'schoolStart' }, // Zero duration event
    { id: 'Saída da escola', duration: 0, anchor: 'schoolEnd' }, // Zero duration event
    { id: 'Almoçar', duration: 20, anchor: 'lunch' },
    { id: 'Escovar os dentes (após almoço)', duration: 5, anchor: 'prevTask' },
    { id: 'Fazer a lição de casa', duration: 50, anchor: 'none', offset: 120 }, // Relative to lunch
    { id: 'Organizar a mochila para escola', duration: 10, anchor: 'prevTask' },
    { id: 'Lanche da tarde', duration: 15, anchor: 'none', offset: 180 }, // Relative to lunch
    { id: 'Hora do Jantar', duration: 20, anchor: 'dinner' },
    { id: 'Escovar os dentes (após jantar)', duration: 5, anchor: 'prevTask' },
    { id: 'Hora de dormir', duration: 30, anchor: 'sleep' },
    { id: 'Escovar os dentes (antes de dormir)', duration: 5, anchor: 'prevTask' },
    { id: 'Tomar banho a Noite', duration: 20, anchor: 'prevTask' },
  ],
  afternoon: [
    { id: 'Hora de acordar', duration: 10, anchor: 'wakeUp' },
    { id: 'Arrumar a cama', duration: 5, anchor: 'prevTask' },
    { id: 'Tomar café da manhã', duration: 20, anchor: 'prevTask' },
    { id: 'Escovar os dentes (após acordar)', duration: 5, anchor: 'prevTask' },
    { id: 'Fazer a lição de casa', duration: 50, anchor: 'wakeUp', offset: 60 },
    { id: 'Organizar a mochila para escola', duration: 10, anchor: 'prevTask' },
    { id: 'Almoçar', duration: 20, anchor: 'lunch' },
    { id: 'Escovar os dentes (após almoço)', duration: 5, anchor: 'prevTask' },
    { id: 'Tomar banho pela Manhã', duration: 20, anchor: 'prevTask' },
    { id: 'Sair para escola', duration: 20, anchor: 'schoolStart', offset: -20 },
    { id: 'Entrada na escola', duration: 0, anchor: 'schoolStart' },
    { id: 'Saída da escola', duration: 0, anchor: 'schoolEnd' },
    { id: 'Hora do Jantar', duration: 20, anchor: 'dinner' },
    { id: 'Escovar os dentes (após jantar)', duration: 5, anchor: 'prevTask' },
    { id: 'Hora de dormir', duration: 30, anchor: 'sleep' },
    { id: 'Escovar os dentes (antes de dormir)', duration: 5, anchor: 'prevTask' },
    { id: 'Tomar banho a Noite', duration: 20, anchor: 'prevTask' },
  ],
  full_time: [
    { id: 'Hora de acordar', duration: 10, anchor: 'wakeUp' },
    { id: 'Arrumar a cama', duration: 5, anchor: 'prevTask' },
    { id: 'Tomar café da manhã', duration: 20, anchor: 'prevTask' },
    { id: 'Escovar os dentes (após acordar)', duration: 5, anchor: 'prevTask' },
    { id: 'Sair para escola', duration: 20, anchor: 'schoolStart', offset: -20 },
    { id: 'Entrada na escola', duration: 0, anchor: 'schoolStart' },
    { id: 'Saída da escola', duration: 0, anchor: 'schoolEnd' },
    { id: 'Almoçar', duration: 20, anchor: 'lunch'},
    { id: 'Hora do Jantar', duration: 20, anchor: 'dinner' },
    { id: 'Escovar os dentes (após jantar)', duration: 5, anchor: 'prevTask' },
    { id: 'Hora de dormir', duration: 30, anchor: 'sleep' },
    { id: 'Escovar os dentes (antes de dormir)', duration: 5, anchor: 'prevTask' },
    { id: 'Tomar banho a Noite', duration: 20, anchor: 'prevTask' },
  ],
  not_applicable: [
    { id: 'Hora de acordar', duration: 10, anchor: 'wakeUp' },
    { id: 'Arrumar a cama', duration: 5, anchor: 'prevTask' },
    { id: 'Tomar café da manhã', duration: 20, anchor: 'prevTask' },
    { id: 'Escovar os dentes (após acordar)', duration: 5, anchor: 'prevTask' },
    { id: 'Almoçar', duration: 20, anchor: 'lunch' },
    { id: 'Escovar os dentes (após almoço)', duration: 5, anchor: 'prevTask' },
    { id: 'Tomar banho pela Manhã', duration: 20, anchor: 'prevTask' },
    { id: 'Lanche da tarde', duration: 15, anchor: 'none', offset: 180 }, // Relative to lunch
    { id: 'Hora do Jantar', duration: 20, anchor: 'dinner' },
    { id: 'Escovar os dentes (após jantar)', duration: 5, anchor: 'prevTask' },
    { id: 'Hora de dormir', duration: 30, anchor: 'sleep' },
    { id: 'Escovar os dentes (antes de dormir)', duration: 5, anchor: 'prevTask' },
    { id: 'Tomar banho a Noite', duration: 20, anchor: 'prevTask' },
  ]
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
    if (input.schoolShift !== 'not_applicable' && input.schoolShiftStart && input.schoolShiftEnd) {
        const schoolStart = parseTime(input.schoolShiftStart);
        const schoolEnd = parseTime(input.schoolShiftEnd);
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
        const blueprint = isWeekend ? routineBlueprints.not_applicable : routineBlueprints[input.schoolShift];
        
        const anchors = {
            wakeUp: parseTime(input.wakeUpTime),
            schoolStart: parseTime(input.schoolShiftStart),
            schoolEnd: parseTime(input.schoolShiftEnd),
            lunch: parseTime(input.lunchTime),
            dinner: parseTime(input.dinnerTime),
            sleep: parseTime(input.sleepTime),
        };

        const ruleMap = new Map(blueprint.map(rule => [rule.id, rule]));
        const processedRules = new Set<string>();

        const processRule = (ruleId: string) => {
            if (processedRules.has(ruleId)) return 0;
            const rule = ruleMap.get(ruleId);
            if (!rule || !userRoutines.has(rule.id)) {
                processedRules.add(ruleId);
                return 0; // Return a default value for anchor calculation
            }
            
            let startTime: number;
            if (rule.anchor === 'prevTask') {
                // This logic is simplified; needs a proper predecessor logic
                const predecessorId = blueprint[blueprint.indexOf(rule) - 1]?.id;
                startTime = predecessorId ? processRule(predecessorId) : anchors.wakeUp;
            } else if (rule.anchor !== 'none') {
                startTime = anchors[rule.anchor] + (rule.offset || 0);
            } else {
                 if(rule.id === 'Lanche da tarde') startTime = anchors.lunch + (rule.offset || 0);
                 else if (rule.id === 'Fazer a lição de casa') startTime = anchors.lunch + (rule.offset || 0);
                 else startTime = 0; // Fallback
            }

            const resolvedStartTime = findNextAvailableSlot(startTime, rule.duration, occupiedSlotsByDay[day]);
            const endTime = resolvedStartTime + rule.duration;
            const details = findMissionDetails(rule.id);

            finalScheduleByDay[day].push({
                activity: rule.id,
                startTime: formatTime(resolvedStartTime),
                endTime: formatTime(endTime),
                days: [day],
                type: 'essential_routine',
                emoji: details.emoji,
                category: details.category
            });

            occupiedSlotsByDay[day].push({ start: resolvedStartTime, end: endTime });
            occupiedSlotsByDay[day].sort((a, b) => a.start - b.start);
            processedRules.add(ruleId);
            return endTime;
        };

        blueprint.forEach(rule => processRule(rule.id));
    }
    
    // 4. Flatten and sort the final schedule
    const finalSchedule = Object.values(finalScheduleByDay).flat();

    return {
        schedule: finalSchedule.sort((a,b) => parseTime(a.startTime!) - parseTime(b.startTime!)),
    };
}

    
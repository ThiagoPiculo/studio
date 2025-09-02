
'use server';

import type { OnboardingFormValues } from '@/components/dashboard/onboarding/OnboardingForm';
import { predefinedMissionGroups } from '@/lib/predefined-missions';
import type { ScheduleItem, Weekday, MissionCategory, SchoolShift } from '@/lib/types';
import { allWeekdays } from '@/lib/types';
import { parseTime, formatTime } from '@/lib/calendar-utils';

// Helper to find mission details from our predefined list
const findMissionDetails = (title: string) => {
  const predefined = predefinedMissionGroups.flatMap(g => g.items).find(i => i.title === title);
  return {
    emoji: predefined?.emoji || '✨',
    category: predefined?.suggestedAppCategory || ('essential_routines' as MissionCategory),
  };
};

// --- NEW ROUTINE BLUEPRINTS ---
type RoutineRule = {
  id: string;
  duration: number; // Duration in minutes
  anchor: 'wakeUp' | 'lunch' | 'dinner' | 'sleep' | 'schoolStart' | 'schoolEnd' | 'prevTask' | 'none'; // 'none' for fixed offset from another anchor
  offset?: number; // Offset in minutes, relative to the anchor
};

const routineBlueprints: Record<SchoolShift, RoutineRule[]> = {
  morning: [
    { id: 'Hora de acordar', duration: 10, anchor: 'wakeUp' },
    { id: 'Arrumar a cama', duration: 5, anchor: 'prevTask' },
    { id: 'Tomar café da manhã', duration: 20, anchor: 'prevTask' },
    { id: 'Escovar os dentes (após acordar)', duration: 5, anchor: 'prevTask' },
    { id: 'Sair para escola', duration: 20, anchor: 'schoolStart', offset: -20 },
    { id: 'Entrada na escola', duration: 0, anchor: 'schoolStart' },
    { id: 'Saída da escola', duration: 0, anchor: 'schoolEnd' },
    { id: 'Almoçar', duration: 20, anchor: 'lunch' },
    { id: 'Escovar os dentes (após almoço)', duration: 5, anchor: 'prevTask' },
    { id: 'Fazer a lição de casa', duration: 50, anchor: 'lunch', offset: 120 },
    { id: 'Organizar a mochila para escola', duration: 10, anchor: 'prevTask' },
    { id: 'Lanche da tarde', duration: 15, anchor: 'lunch', offset: 180 },
    { id: 'Hora do Jantar', duration: 20, anchor: 'dinner' },
    { id: 'Escovar os dentes (após jantar)', duration: 5, anchor: 'prevTask' },
    { id: 'Tomar banho a Noite', duration: 20, anchor: 'sleep', offset: -50 },
    { id: 'Escovar os dentes (antes de dormir)', duration: 5, anchor: 'prevTask' },
    { id: 'Hora de dormir', duration: 30, anchor: 'sleep' },
  ],
  afternoon: [
    { id: 'Hora de acordar', duration: 10, anchor: 'wakeUp' },
    { id: 'Arrumar a cama', duration: 5, anchor: 'prevTask' },
    { id: 'Tomar café da manhã', duration: 20, anchor: 'prevTask' },
    { id: 'Escovar os dentes (após acordar)', duration: 5, anchor: 'prevTask' },
    { id: 'Fazer a lição de casa', duration: 50, anchor: 'wakeUp', offset: 60 },
    { id: 'Organizar a mochila para escola', duration: 10, anchor: 'prevTask' },
    { id: 'Tomar banho pela Manhã', duration: 20, anchor: 'prevTask' },
    { id: 'Almoçar', duration: 20, anchor: 'lunch' },
    { id: 'Escovar os dentes (após almoço)', duration: 5, anchor: 'prevTask' },
    { id: 'Sair para escola', duration: 20, anchor: 'schoolStart', offset: -20 },
    { id: 'Entrada na escola', duration: 0, anchor: 'schoolStart' },
    { id: 'Saída da escola', duration: 0, anchor: 'schoolEnd' },
    { id: 'Hora do Jantar', duration: 20, anchor: 'dinner' },
    { id: 'Escovar os dentes (após jantar)', duration: 5, anchor: 'prevTask' },
    { id: 'Tomar banho a Noite', duration: 20, anchor: 'sleep', offset: -50 },
    { id: 'Escovar os dentes (antes de dormir)', duration: 5, anchor: 'prevTask' },
    { id: 'Hora de dormir', duration: 30, anchor: 'sleep' },
  ],
  full_time: [
    { id: 'Hora de acordar', duration: 10, anchor: 'wakeUp' },
    { id: 'Arrumar a cama', duration: 5, anchor: 'prevTask' },
    { id: 'Tomar café da manhã', duration: 20, anchor: 'prevTask' },
    { id: 'Escovar os dentes (após acordar)', duration: 5, anchor: 'prevTask' },
    { id: 'Sair para escola', duration: 20, anchor: 'schoolStart', offset: -20 },
    { id: 'Entrada na escola', duration: 0, anchor: 'schoolStart' },
    { id: 'Saída da escola', duration: 0, anchor: 'schoolEnd' },
    { id: 'Almoçar', duration: 20, anchor: 'lunch' },
    { id: 'Hora do Jantar', duration: 20, anchor: 'dinner' },
    { id: 'Escovar os dentes (após jantar)', duration: 5, anchor: 'prevTask' },
    { id: 'Tomar banho a Noite', duration: 20, anchor: 'sleep', offset: -50 },
    { id: 'Escovar os dentes (antes de dormir)', duration: 5, anchor: 'prevTask' },
    { id: 'Hora de dormir', duration: 30, anchor: 'sleep' },
  ],
  not_applicable: [
    { id: 'Hora de acordar', duration: 10, anchor: 'wakeUp' },
    { id: 'Arrumar a cama', duration: 5, anchor: 'prevTask' },
    { id: 'Tomar café da manhã', duration: 20, anchor: 'prevTask' },
    { id: 'Escovar os dentes (após acordar)', duration: 5, anchor: 'prevTask' },
    { id: 'Tomar banho pela Manhã', duration: 20, anchor: 'prevTask' },
    { id: 'Almoçar', duration: 20, anchor: 'lunch' },
    { id: 'Escovar os dentes (após almoço)', duration: 5, anchor: 'prevTask' },
    { id: 'Lanche da tarde', duration: 15, anchor: 'lunch', offset: 180 },
    { id: 'Hora do Jantar', duration: 20, anchor: 'dinner' },
    { id: 'Escovar os dentes (após jantar)', duration: 5, anchor: 'prevTask' },
    { id: 'Tomar banho a Noite', duration: 20, anchor: 'sleep', offset: -50 },
    { id: 'Escovar os dentes (antes de dormir)', duration: 5, anchor: 'prevTask' },
    { id: 'Hora de dormir', duration: 30, anchor: 'sleep' },
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
        const endTimeMap = new Map<string, number>();

        const processRule = (ruleId: string): number => {
            if (processedRules.has(ruleId)) return endTimeMap.get(ruleId) || 0;
            const rule = ruleMap.get(ruleId);
            if (!rule || !userRoutines.has(rule.id)) {
                processedRules.add(ruleId);
                return 0; // Return a default value for anchor calculation
            }
            
            let startTime: number;
            if (rule.anchor === 'prevTask') {
                const predecessorIndex = blueprint.findIndex(r => r.id === ruleId) - 1;
                const predecessorId = blueprint[predecessorIndex]?.id;
                startTime = predecessorId ? processRule(predecessorId) : anchors.wakeUp;
            } else if (rule.anchor !== 'none') {
                startTime = anchors[rule.anchor] + (rule.offset || 0);
            } else { // Handle 'none' anchor case for specific rules
                if (rule.id === 'Lanche da tarde') startTime = anchors.lunch + (rule.offset || 0);
                else startTime = 0; // Fallback for other 'none' rules if any
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
            endTimeMap.set(ruleId, endTime);
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

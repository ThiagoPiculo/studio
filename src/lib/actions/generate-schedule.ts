

'use server';

import type { OnboardingFormValues } from '@/components/dashboard/onboarding/OnboardingForm';
import { predefinedMissionGroups } from '@/lib/predefined-missions';
import type { ScheduleItem, Weekday, MissionCategory, SchoolShift } from '@/lib/types';
import { allWeekdays } from '@/lib/types';
import { parseTime, formatTime } from '@/lib/calendar-utils';

// Helper to find mission details from our predefined list
const findMissionDetails = (title: string) => {
  const predefined = predefinedMissionGroups.flatMap(g => g.items).find(i => i.title === title);
  if (predefined) {
      return {
        emoji: predefined.emoji,
        category: predefined.suggestedAppCategory,
      };
  }
  // Return a default for custom activities if not found
  return {
    emoji: '✨',
    category: 'hobbies' as MissionCategory,
  };
};

// --- NEW ROUTINE BLUEPRINTS ---
type RoutineRule = {
  id: string;
  duration: number; // Duration in minutes
  // 'prevTask' anchor means it starts right after the previous task in the same block ends.
  // Other anchors are fixed points in the day.
  anchor: 'wakeUp' | 'lunch' | 'dinner' | 'sleep' | 'schoolStart' | 'schoolEnd' | 'prevTask';
  offset?: number; // Offset in minutes, relative to the anchor. Can be negative.
  block: string; // The UI block name this task belongs to.
};

const routineBlueprints: Record<SchoolShift | 'weekend', RoutineRule[]> = {
  morning: [
    // Bloco: Rotina Hora de Acordar
    { id: 'Hora de acordar', duration: 10, anchor: 'wakeUp', block: 'Rotina Hora de Acordar' },
    { id: 'Arrumar a cama', duration: 5, anchor: 'prevTask', block: 'Rotina Hora de Acordar' },
    { id: 'Tomar café da manhã', duration: 15, anchor: 'prevTask', block: 'Rotina Hora de Acordar' },
    { id: 'Escovar os dentes (após acordar)', duration: 5, anchor: 'prevTask', block: 'Rotina Hora de Acordar' },
    // Bloco: Rotina Saindo para escola
    { id: 'Sair para escola', duration: 20, anchor: 'schoolStart', offset: -20, block: 'Rotina Saindo para escola' },
    // Bloco: Rotina Hora da escola
    { id: 'Entrada na escola', duration: 0, anchor: 'schoolStart', block: 'Rotina Hora da Escola' },
    { id: 'Saída da escola', duration: 0, anchor: 'schoolEnd', block: 'Rotina Hora da Escola' },
     // Bloco: Rotina Hora do Almoço
    { id: 'Tomar banho pela Manhã', duration: 15, anchor: 'lunch', offset: -15, block: 'Rotina Hora do Almoço' },
    { id: 'Almoçar', duration: 20, anchor: 'lunch', block: 'Rotina Hora do Almoço' },
    { id: 'Escovar os dentes (após almoço)', duration: 5, anchor: 'prevTask', block: 'Rotina Hora do Almoço' },
    // Bloco: Rotina Tarefas Escolares
    { id: 'Fazer a lição de casa', duration: 55, anchor: 'lunch', offset: 90, block: 'Rotina Tarefas Escolares' },
    { id: 'Organizar a mochila para escola', duration: 5, anchor: 'prevTask', block: 'Rotina Tarefas Escolares' },
    // Bloco: Rotina Lanche da tarde
    { id: 'Lanche da tarde', duration: 15, anchor: 'lunch', offset: 150, block: 'Rotina Lanche da tarde' },
    // Bloco: Rotina Hora do Jantar
    { id: 'Hora do Jantar', duration: 20, anchor: 'dinner', block: 'Rotina Hora do Jantar' },
    { id: 'Escovar os dentes (após jantar)', duration: 5, anchor: 'prevTask', block: 'Rotina Hora do Jantar' },
    // Bloco: Rotina Hora de Dormir
    { id: 'Tomar banho a Noite', duration: 15, anchor: 'sleep', offset: -20, block: 'Rotina Hora de Dormir' },
    { id: 'Escovar os dentes (antes de dormir)', duration: 5, anchor: 'sleep', offset: -5, block: 'Rotina Hora de Dormir' },
    { id: 'Hora de dormir', duration: 600, anchor: 'sleep', block: 'Rotina Hora de Dormir' },
  ],
  afternoon: [
    // Bloco: Rotina Hora de Acordar
    { id: 'Hora de acordar', duration: 10, anchor: 'wakeUp', block: 'Rotina Hora de Acordar' },
    { id: 'Arrumar a cama', duration: 5, anchor: 'prevTask', block: 'Rotina Hora de Acordar' },
    { id: 'Tomar café da manhã', duration: 15, anchor: 'prevTask', block: 'Rotina Hora de Acordar' },
    { id: 'Escovar os dentes (após acordar)', duration: 5, anchor: 'prevTask', block: 'Rotina Hora de Acordar' },
    // Bloco: Rotina Tarefas Escolares
    { id: 'Fazer a lição de casa', duration: 55, anchor: 'wakeUp', offset: 60, block: 'Rotina Tarefas Escolares' },
    { id: 'Organizar a mochila para escola', duration: 5, anchor: 'prevTask', block: 'Rotina Tarefas Escolares' },
    // Bloco: Rotina Saindo para escola
    { id: 'Tomar banho pela Manhã', duration: 15, anchor: 'schoolStart', offset: -60, block: 'Rotina Saindo para escola' },
    { id: 'Almoçar', duration: 20, anchor: 'lunch', block: 'Rotina Saindo para escola' },
    { id: 'Escovar os dentes (após almoço)', duration: 5, anchor: 'prevTask', block: 'Rotina Saindo para escola' },
    { id: 'Sair para escola', duration: 20, anchor: 'schoolStart', offset: -20, block: 'Rotina Saindo para escola' },
    // Bloco: Rotina Hora da escola
    { id: 'Entrada na escola', duration: 0, anchor: 'schoolStart', block: 'Rotina Hora da Escola' },
    { id: 'Saída da escola', duration: 0, anchor: 'schoolEnd', block: 'Rotina Hora da Escola' },
    // Bloco: Rotina Hora do Jantar
    { id: 'Hora do Jantar', duration: 20, anchor: 'dinner', block: 'Rotina Hora do Jantar' },
    { id: 'Escovar os dentes (após jantar)', duration: 5, anchor: 'prevTask', block: 'Rotina Hora do Jantar' },
    // Bloco: Rotina Hora de Dormir
    { id: 'Tomar banho a Noite', duration: 15, anchor: 'sleep', offset: -20, block: 'Rotina Hora de Dormir' },
    { id: 'Escovar os dentes (antes de dormir)', duration: 5, anchor: 'sleep', offset: -5, block: 'Rotina Hora de Dormir' },
    { id: 'Hora de dormir', duration: 600, anchor: 'sleep', block: 'Rotina Hora de Dormir' },
  ],
  full_time: [
    // Bloco: Rotina Hora de Acordar
    { id: 'Hora de acordar', duration: 10, anchor: 'wakeUp', block: 'Rotina Hora de Acordar' },
    { id: 'Arrumar a cama', duration: 5, anchor: 'prevTask', block: 'Rotina Hora de Acordar' },
    { id: 'Tomar café da manhã', duration: 15, anchor: 'prevTask', block: 'Rotina Hora de Acordar' },
    { id: 'Escovar os dentes (após acordar)', duration: 5, anchor: 'prevTask', block: 'Rotina Hora de Acordar' },
    // Bloco: Rotina Saindo para escola
    { id: 'Sair para escola', duration: 20, anchor: 'schoolStart', offset: -20, block: 'Rotina Saindo para escola' },
    // Bloco: Rotina Hora da escola
    { id: 'Entrada na escola', duration: 0, anchor: 'schoolStart', block: 'Rotina Hora da Escola' },
    { id: 'Saída da escola', duration: 0, anchor: 'schoolEnd', block: 'Rotina Hora da Escola' },
    // Bloco: Rotina Hora de Dormir
    { id: 'Tomar banho a Noite', duration: 15, anchor: 'sleep', offset: -20, block: 'Rotina Hora de Dormir' },
    { id: 'Escovar os dentes (antes de dormir)', duration: 5, anchor: 'sleep', offset: -5, block: 'Rotina Hora de Dormir' },
    { id: 'Hora de dormir', duration: 600, anchor: 'sleep', block: 'Rotina Hora de Dormir' },
  ],
  not_applicable: [
    // Bloco: Rotina Hora de Acordar
    { id: 'Hora de acordar', duration: 10, anchor: 'wakeUp', block: 'Rotina Hora de Acordar' },
    { id: 'Arrumar a cama', duration: 5, anchor: 'prevTask', block: 'Rotina Hora de Acordar' },
    { id: 'Tomar café da manhã', duration: 15, anchor: 'prevTask', block: 'Rotina Hora de Acordar' },
    { id: 'Escovar os dentes (após acordar)', duration: 5, anchor: 'prevTask', block: 'Rotina Hora de Acordar' },
    // Bloco: Rotina Hora do Almoço
    { id: 'Tomar banho pela Manhã', duration: 15, anchor: 'lunch', offset: -15, block: 'Rotina Hora do Almoço' },
    { id: 'Almoçar', duration: 20, anchor: 'lunch', block: 'Rotina Hora do Almoço' },
    { id: 'Escovar os dentes (após almoço)', duration: 5, anchor: 'prevTask', block: 'Rotina Hora do Almoço' },
    // Bloco: Rotina Lanche da tarde
    { id: 'Lanche da tarde', duration: 15, anchor: 'lunch', offset: 150, block: 'Rotina Lanche da tarde' },
    // Bloco: Rotina Hora do Jantar
    { id: 'Hora do Jantar', duration: 20, anchor: 'dinner', block: 'Rotina Hora do Jantar' },
    { id: 'Escovar os dentes (após jantar)', duration: 5, anchor: 'prevTask', block: 'Rotina Hora do Jantar' },
    // Bloco: Rotina Hora de Dormir
    { id: 'Tomar banho a Noite', duration: 15, anchor: 'sleep', offset: -20, block: 'Rotina Hora de Dormir' },
    { id: 'Escovar os dentes (antes de dormir)', duration: 5, anchor: 'sleep', offset: -5, block: 'Rotina Hora de Dormir' },
    { id: 'Hora de dormir', duration: 600, anchor: 'sleep', block: 'Rotina Hora de Dormir' },
  ],
  weekend: [
    // Bloco: Rotina Hora de Acordar
    { id: 'Hora de acordar', duration: 10, anchor: 'wakeUp', block: 'Rotina Hora de Acordar' },
    { id: 'Arrumar a cama', duration: 5, anchor: 'prevTask', block: 'Rotina Hora de Acordar' },
    { id: 'Tomar café da manhã', duration: 15, anchor: 'prevTask', block: 'Rotina Hora de Acordar' },
    { id: 'Escovar os dentes (após acordar)', duration: 5, anchor: 'prevTask', block: 'Rotina Hora de Acordar' },
    // Bloco: Rotina Hora do Almoço
    { id: 'Tomar banho pela Manhã', duration: 15, anchor: 'lunch', offset: -15, block: 'Rotina Hora do Almoço' },
    { id: 'Almoçar', duration: 20, anchor: 'lunch', block: 'Rotina Hora do Almoço' },
    { id: 'Escovar os dentes (após almoço)', duration: 5, anchor: 'prevTask', block: 'Rotina Hora do Almoço' },
    // Bloco: Rotina Lanche da tarde
    { id: 'Lanche da tarde', duration: 15, anchor: 'lunch', offset: 150, block: 'Rotina Lanche da tarde' },
    // Bloco: Rotina Hora do Jantar
    { id: 'Hora do Jantar', duration: 20, anchor: 'dinner', block: 'Rotina Hora do Jantar' },
    { id: 'Escovar os dentes (após jantar)', duration: 5, anchor: 'prevTask', block: 'Rotina Hora do Jantar' },
    // Bloco: Rotina Hora de Dormir
    { id: 'Tomar banho a Noite', duration: 15, anchor: 'sleep', offset: -20, block: 'Rotina Hora de Dormir' },
    { id: 'Escovar os dentes (antes de dormir)', duration: 5, anchor: 'sleep', offset: -5, block: 'Rotina Hora de Dormir' },
    { id: 'Hora de dormir', duration: 600, anchor: 'sleep', block: 'Rotina Hora de Dormir' },
  ]
};


const findNextAvailableSlot = (startTime: number, duration: number, occupiedSlots: { start: number; end: number }[]): number => {
    let proposedStart = startTime;

    while (true) {
        let conflict = false;
        const proposedEnd = proposedStart + duration;
        for (const slot of occupiedSlots) {
            if (proposedStart < slot.end && proposedEnd > slot.start) {
                proposedStart = slot.end;
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
                occupiedSlotsByDay[day as Weekday].push({ start: start, end: end });
                finalScheduleByDay[day as Weekday].push({
                    activity: activity.name, startTime: formatTime(start), endTime: formatTime(end),
                    days: [day as Weekday], type: 'extra_activity', emoji: activity.emoji || details.emoji, category: details.category, block: 'Atividades Extras'
                });
            });
        }
    });

    // Add screen time as fixed slots if included
    if (input.includeScreenTime) {
      if (input.screenTime1) {
          const start = parseTime(input.screenTime1);
          const end = start + 60;
          const details = findMissionDetails('Hora da Tela');
          allWeekdays.forEach(day => {
              occupiedSlotsByDay[day].push({ start, end });
              finalScheduleByDay[day].push({
                  activity: 'Hora da Tela', startTime: formatTime(start), endTime: formatTime(end),
                  days: [day], type: 'extra_activity', emoji: details.emoji, category: details.category, block: 'Atividades Extras'
              });
          });
      }
      if (input.screenTime2) {
          const start = parseTime(input.screenTime2);
          const end = start + 60;
          const details = findMissionDetails('Hora da Tela');
          allWeekdays.forEach(day => {
              occupiedSlotsByDay[day].push({ start, end });
              finalScheduleByDay[day].push({
                  activity: 'Hora da Tela', startTime: formatTime(start), endTime: formatTime(end),
                  days: [day], type: 'extra_activity', emoji: details.emoji, category: details.category, block: 'Atividades Extras'
              });
          });
      }
    }


    // Sort occupied slots
    for (const day in occupiedSlotsByDay) {
        occupiedSlotsByDay[day as Weekday].sort((a, b) => a.start - b.start);
    }
    
    const userRoutines = new Set(input.essentialRoutines);

    // 2. Process each day of the week
    for (const day of allWeekdays) {
        const isWeekend = day === 'SA' || day === 'SU';
        let blueprint;
        let anchors;

        if (input.schoolShift === 'full_time') {
            if (isWeekend) {
                blueprint = routineBlueprints.weekend;
                // Use fixed anchors for weekend full-time
                anchors = {
                    wakeUp: parseTime(input.wakeUpTime),
                    schoolStart: 0, // Not used
                    schoolEnd: 0, // Not used
                    lunch: parseTime('12:00'),
                    dinner: parseTime('18:00'),
                    sleep: parseTime(input.sleepTime),
                };
            } else {
                // Use simplified blueprint for full-time weekdays
                blueprint = routineBlueprints.full_time;
                anchors = {
                    wakeUp: parseTime(input.wakeUpTime),
                    schoolStart: parseTime(input.schoolShiftStart),
                    schoolEnd: parseTime(input.schoolShiftEnd),
                    lunch: parseTime(input.lunchTime), // From form but may not be used by blueprint
                    dinner: parseTime(input.schoolShiftEnd) - 30, // 30 minutes before school end
                    sleep: parseTime(input.sleepTime),
                };
            }
        } else {
            // Logic for other shifts
            blueprint = isWeekend ? routineBlueprints.weekend : routineBlueprints[input.schoolShift];
            anchors = {
                wakeUp: parseTime(input.wakeUpTime),
                schoolStart: parseTime(input.schoolShiftStart),
                schoolEnd: parseTime(input.schoolShiftEnd),
                lunch: parseTime(input.lunchTime),
                dinner: parseTime(input.dinnerTime),
                sleep: parseTime(input.sleepTime),
            };
        }

        let lastTaskEndTime = 0;

        for (const rule of blueprint) {
            if (!userRoutines.has(rule.id) && rule.id !== 'Entrada na escola' && rule.id !== 'Saída da escola') continue;
            
            let startTime: number;
            if (rule.anchor === 'prevTask') {
                startTime = lastTaskEndTime;
            } else {
                startTime = anchors[rule.anchor] + (rule.offset || 0);
            }

            const resolvedStartTime = findNextAvailableSlot(startTime, rule.duration, occupiedSlotsByDay[day]);
            const endTime = resolvedStartTime + rule.duration;
            lastTaskEndTime = endTime; // Update for the next 'prevTask'

            const details = findMissionDetails(rule.id);
            
            if (rule.id === 'Entrada na escola') {
                 if (input.schoolShift !== 'not_applicable' && !isWeekend) {
                    finalScheduleByDay[day].push({
                        activity: rule.id, startTime: formatTime(resolvedStartTime), endTime: formatTime(endTime),
                        days: [day], type: 'school_entry', emoji: details.emoji, category: details.category, block: rule.block,
                    });
                }
            } else if (rule.id === 'Saída da escola') {
                if (input.schoolShift !== 'not_applicable' && !isWeekend) {
                    finalScheduleByDay[day].push({
                        activity: rule.id, startTime: formatTime(resolvedStartTime), endTime: formatTime(endTime),
                        days: [day], type: 'school_exit', emoji: details.emoji, category: details.category, block: rule.block,
                    });
                }
            } else if (rule.duration > 0) {
                finalScheduleByDay[day].push({
                    activity: rule.id,
                    startTime: formatTime(resolvedStartTime),
                    endTime: formatTime(endTime),
                    days: [day],
                    type: 'essential_routine',
                    emoji: details.emoji,
                    category: details.category,
                    block: rule.block,
                });
                occupiedSlotsByDay[day].push({ start: resolvedStartTime, end: endTime });
                occupiedSlotsByDay[day].sort((a, b) => a.start - b.start);
            }
        }
    }
    
    // Flatten and sort the final schedule
    const finalSchedule = Object.values(finalScheduleByDay).flat();

    return {
        schedule: finalSchedule.sort((a,b) => parseTime(a.startTime!) - parseTime(b.startTime!)),
    };
}

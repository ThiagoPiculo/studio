
'use server';
/**
 * @fileOverview Um motor de regras determinístico para gerar rotinas semanais para crianças.
 */

import { z } from 'zod';
import { predefinedMissionGroups } from '@/lib/predefined-missions';
import type { Weekday } from '@/lib/types';
import { allWeekdays } from '@/lib/types';

const extraActivitySchema = z.object({
  name: z.string(),
  days: z.array(z.string()).min(1),
  time: z.string(),
});

const ProcessScheduleInputSchema = z.object({
  schoolShift: z.enum(['morning', 'afternoon', 'full_time', 'not_applicable']),
  schoolStartTime: z.string().optional(),
  schoolEndTime: z.string().optional(),
  extraActivities: z.array(extraActivitySchema).optional(),
  essentialRoutines: z.array(z.string()).optional(),
});
export type ProcessScheduleInput = z.infer<typeof ProcessScheduleInputSchema>;

const ScheduleItemSchema = z.object({
  activity: z.string().describe("O nome da atividade (ex: 'Hora de Acordar', 'Natação', 'Tempo Livre')."),
  emoji: z.string().emoji().describe("Um emoji que represente a atividade."),
  type: z.enum(['school_entry', 'school_exit', 'extra_activity', 'essential_routine', 'free_time']).describe("O tipo de atividade."),
  category: z.string().describe("A categoria da atividade (ex: 'school', 'health', 'hobbies')."),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).describe("A hora de início no formato HH:mm."),
  endTime: z.string().regex(/^([01]\d|2[0-5]\d)$/).describe("A hora de término no formato HH:mm."),
  days: z.array(z.nativeEnum(Weekday)).describe("Uma lista dos dias da semana em que a atividade ocorre."),
});
export type ScheduleItem = z.infer<typeof ScheduleItemSchema>;

const ProcessScheduleOutputSchema = z.object({
  schedule: z.array(ScheduleItemSchema).describe("A rotina semanal estruturada gerada."),
  freeTime: z.string().describe("Um breve resumo sobre os principais blocos de tempo livre identificados para a criança."),
});
export type ProcessScheduleOutput = z.infer<typeof ProcessScheduleOutputSchema>;


type DailySchedule = { time: number; duration: number; task: ScheduleItem }[];
type WeeklySchedule = Record<Weekday, DailySchedule>;

// --- Helper Functions ---
const timeToMinutes = (time: string): number => {
    if (!/^\d{2}:\d{2}$/.test(time)) return 0;
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
};

const minutesToTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60) % 24;
    const mins = minutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
};

const missionData: { [key: string]: Partial<ScheduleItem> } = {};
predefinedMissionGroups.flatMap(g => g.items).forEach(item => {
    missionData[item.title] = {
        emoji: item.emoji,
        category: item.suggestedAppCategory,
    };
});

const isOccupied = (schedule: DailySchedule, start: number, end: number): boolean => {
    return schedule.some(slot => Math.max(start, slot.time) < Math.min(end, slot.time + slot.duration));
};

const findFreeSlot = (schedule: DailySchedule, duration: number, preferredStart: number, preferredEnd: number): number | null => {
    for (let time = preferredStart; time <= preferredEnd - duration; time += 15) { // Check every 15 minutes
        if (!isOccupied(schedule, time, time + duration)) {
            return time;
        }
    }
    return null;
};

const addTask = (
    schedule: WeeklySchedule, 
    task: Partial<ScheduleItem> & { activity: string; startTime: string; endTime: string; days: Weekday[]; type: ScheduleItem['type']; },
    isFixed = false
) => {
    const startMinutes = timeToMinutes(task.startTime);
    const endMinutes = timeToMinutes(task.endTime);
    if (startMinutes >= endMinutes) return;
    
    const duration = endMinutes - startMinutes;

    task.days.forEach(day => {
        let actualStart = startMinutes;
        
        if (!isFixed) {
             const slot = findFreeSlot(schedule[day], duration, startMinutes, timeToMinutes('20:00'));
             if (slot === null) {
                 // Failsafe: if no slot is found, try to find ANY slot in the day
                 const anySlot = findFreeSlot(schedule[day], duration, timeToMinutes('07:00'), timeToMinutes('21:00'));
                 if(anySlot === null) {
                     console.warn(`Could not schedule "${task.activity}" on ${day}. No free slot found.`);
                     return;
                 }
                 actualStart = anySlot;
             } else {
                 actualStart = slot;
             }
        }
        
        if (isOccupied(schedule[day], actualStart, actualStart + duration)) {
             if (!isFixed) { // Only log warning if it's not a fixed, user-defined task
                console.warn(`Skipping overlapping task: "${task.activity}" on ${day} at ${minutesToTime(actualStart)}`);
             }
             return;
        }

        const fullTask: ScheduleItem = {
            activity: task.activity,
            emoji: task.emoji || missionData[task.activity]?.emoji || '✔️',
            type: task.type,
            category: task.category || missionData[task.activity]?.category || 'essential',
            startTime: minutesToTime(actualStart),
            endTime: minutesToTime(actualStart + duration),
            days: [day], // We add one day at a time
        };

        schedule[day].push({ time: actualStart, duration: duration, task: fullTask });
    });
};

export async function processSchedule(input: ProcessScheduleInput): Promise<ProcessScheduleOutput> {
    
    const schedule: WeeklySchedule = { MO: [], TU: [], WE: [], TH: [], FR: [], SA: [], SU: [] };
    const weekdays: Weekday[] = ['MO', 'TU', 'WE', 'TH', 'FR'];
    const allDays: Weekday[] = [...weekdays, 'SA', 'SU'];

    // Passo 1: Alocar Escola e Atividades Extras (fixas)
    if (input.schoolShift !== 'not_applicable' && input.schoolStartTime && input.schoolEndTime) {
        addTask(schedule, {
            activity: 'Escola',
            startTime: input.schoolStartTime,
            endTime: input.schoolEndTime,
            days: weekdays,
            type: 'school_entry',
            category: 'school',
            emoji: '🏫'
        }, true);
    }
    
    (input.extraActivities || []).forEach(act => {
        const duration = 60; // Assuming 1 hour for extra activities
        const startMinutes = timeToMinutes(act.time);
        addTask(schedule, {
            activity: act.name,
            startTime: act.time,
            endTime: minutesToTime(startMinutes + duration),
            days: act.days as Weekday[],
            type: 'extra_activity',
        }, true);
    });
    
    // Passo 2: Construir a rotina com base no turno
    const schoolStart = input.schoolStartTime ? timeToMinutes(input.schoolStartTime) : 0;
    const essentialRoutines = new Set(input.essentialRoutines || []);

    switch (input.schoolShift) {
        case 'morning': {
            if(essentialRoutines.has('Hora de acordar')) addTask(schedule, { activity: 'Hora de acordar', startTime: minutesToTime(schoolStart - 60), endTime: minutesToTime(schoolStart - 55), days: weekdays, type: 'essential_routine' });
            if(essentialRoutines.has('Arrumar a cama')) addTask(schedule, { activity: 'Arrumar a cama', startTime: minutesToTime(schoolStart - 50), endTime: minutesToTime(schoolStart - 40), days: weekdays, type: 'essential_routine' });
            if(essentialRoutines.has('Tomar café da manhã')) addTask(schedule, { activity: 'Tomar café da manhã', startTime: minutesToTime(schoolStart - 35), endTime: minutesToTime(schoolStart - 15), days: weekdays, type: 'essential_routine' });
            if(essentialRoutines.has('Escovar os dentes (após acordar)')) addTask(schedule, { activity: 'Escovar os dentes (após acordar)', startTime: minutesToTime(schoolStart - 10), endTime: minutesToTime(schoolStart - 5), days: weekdays, type: 'essential_routine' });
            
            if(essentialRoutines.has('Almoçar')) addTask(schedule, { activity: 'Almoçar', startTime: '13:00', endTime: '13:30', days: weekdays, type: 'essential_routine' });
            if(essentialRoutines.has('Escovar os dentes (após almoço)')) addTask(schedule, { activity: 'Escovar os dentes (após almoço)', startTime: '13:30', endTime: '13:40', days: weekdays, type: 'essential_routine' });
            if(essentialRoutines.has('Fazer a lição de casa')) addTask(schedule, { activity: 'Fazer a lição de casa', startTime: '14:30', endTime: '15:30', days: weekdays, type: 'essential_routine' });
            if(essentialRoutines.has('Organizar a mochila para amanhã')) addTask(schedule, { activity: 'Organizar a mochila para amanhã', startTime: '15:30', endTime: '15:45', days: weekdays, type: 'essential_routine' });
            if(essentialRoutines.has('Tomar banho')) addTask(schedule, { activity: 'Tomar banho', startTime: '18:30', endTime: '18:50', days: allDays, type: 'essential_routine' });
            if(essentialRoutines.has('Jantar')) addTask(schedule, { activity: 'Jantar', startTime: '19:00', endTime: '19:30', days: allDays, type: 'essential_routine' });
            break;
        }
        case 'afternoon': {
            if(essentialRoutines.has('Hora de acordar')) addTask(schedule, { activity: 'Hora de acordar', startTime: '08:00', endTime: '08:05', days: weekdays, type: 'essential_routine' });
            if(essentialRoutines.has('Fazer a lição de casa')) addTask(schedule, { activity: 'Fazer a lição de casa', startTime: '09:00', endTime: '10:00', days: weekdays, type: 'essential_routine' });
            if(essentialRoutines.has('Organizar a mochila para amanhã')) addTask(schedule, { activity: 'Organizar a mochila para amanhã', startTime: '10:00', endTime: '10:15', days: weekdays, type: 'essential_routine' });
            if(essentialRoutines.has('Almoçar')) addTask(schedule, { activity: 'Almoçar', startTime: minutesToTime(schoolStart - 40), endTime: minutesToTime(schoolStart - 10), days: weekdays, type: 'essential_routine' });
            if(essentialRoutines.has('Escovar os dentes (após almoço)')) addTask(schedule, { activity: 'Escovar os dentes (após almoço)', startTime: minutesToTime(schoolStart - 10), endTime: minutesToTime(schoolStart - 5), days: weekdays, type: 'essential_routine' });
            if(essentialRoutines.has('Jantar')) addTask(schedule, { activity: 'Jantar', startTime: '19:00', endTime: '19:30', days: allDays, type: 'essential_routine' });
            if(essentialRoutines.has('Tomar banho')) addTask(schedule, { activity: 'Tomar banho', startTime: '20:40', endTime: '21:00', days: allDays, type: 'essential_routine' });
            break;
        }
        case 'full_time': {
            if(essentialRoutines.has('Hora de acordar')) addTask(schedule, { activity: 'Hora de acordar', startTime: minutesToTime(schoolStart - 60), endTime: minutesToTime(schoolStart - 55), days: weekdays, type: 'essential_routine' });
            if(essentialRoutines.has('Tomar café da manhã')) addTask(schedule, { activity: 'Tomar café da manhã', startTime: minutesToTime(schoolStart - 35), endTime: minutesToTime(schoolStart - 15), days: weekdays, type: 'essential_routine' });
            if(essentialRoutines.has('Escovar os dentes (após acordar)')) addTask(schedule, { activity: 'Escovar os dentes (após acordar)', startTime: minutesToTime(schoolStart - 10), endTime: minutesToTime(schoolStart - 5), days: weekdays, type: 'essential_routine' });
            if(essentialRoutines.has('Jantar')) addTask(schedule, { activity: 'Jantar', startTime: '19:00', endTime: '19:30', days: allDays, type: 'essential_routine' });
            if(essentialRoutines.has('Tomar banho')) addTask(schedule, { activity: 'Tomar banho', startTime: '20:40', endTime: '21:00', days: allDays, type: 'essential_routine' });
            break;
        }
        case 'not_applicable': {
            if(essentialRoutines.has('Hora de acordar')) addTask(schedule, { activity: 'Hora de acordar', startTime: '08:00', endTime: '08:05', days: allDays, type: 'essential_routine' });
            if(essentialRoutines.has('Tomar café da manhã')) addTask(schedule, { activity: 'Tomar café da manhã', startTime: '08:25', endTime: '08:45', days: allDays, type: 'essential_routine' });
            if(essentialRoutines.has('Escovar os dentes (após acordar)')) addTask(schedule, { activity: 'Escovar os dentes (após acordar)', startTime: '08:45', endTime: '08:50', days: allDays, type: 'essential_routine' });
            if(essentialRoutines.has('Almoçar')) addTask(schedule, { activity: 'Almoçar', startTime: '12:20', endTime: '12:50', days: allDays, type: 'essential_routine' });
            if(essentialRoutines.has('Escovar os dentes (após almoço)')) addTask(schedule, { activity: 'Escovar os dentes (após almoço)', startTime: '12:50', endTime: '12:55', days: allDays, type: 'essential_routine' });
            if(essentialRoutines.has('Tomar banho')) addTask(schedule, { activity: 'Tomar banho', startTime: '17:30', endTime: '17:50', days: allDays, type: 'essential_routine' });
            if(essentialRoutines.has('Jantar')) addTask(schedule, { activity: 'Jantar', startTime: '18:00', endTime: '18:30', days: allDays, type: 'essential_routine' });
            break;
        }
    }

    if(essentialRoutines.has('Escovar os dentes (após jantar)')) addTask(schedule, { activity: 'Escovar os dentes (após jantar)', startTime: '20:40', endTime: '20:45', days: allDays, type: 'essential_routine' });
    if(essentialRoutines.has('Hora de dormir')) addTask(schedule, { activity: 'Hora de dormir', startTime: '21:00', endTime: '21:05', days: allDays, type: 'essential_routine' });
    
    // Regra de fim de semana
    addTask(schedule, { activity: 'Organizar a mochila para amanhã', startTime: '20:00', endTime: '20:15', days: ['SU'], type: 'essential_routine' });

    // Passo 3: Adicionar Tempo Livre
    allDays.forEach(day => {
        schedule[day].sort((a, b) => a.time - b.time);
        let lastEndTime = timeToMinutes('07:00');
        
        schedule[day].forEach(slot => {
            if (slot.time > lastEndTime) {
                const duration = slot.time - lastEndTime;
                if (duration >= 30) { // Add free time only if it's 30 mins or more
                   addTask(schedule, { activity: 'Hora livre para brincar', startTime: minutesToTime(lastEndTime), endTime: minutesToTime(slot.time), days: [day], type: 'free_time', category: 'leisure', emoji: '🪁' }, true);
                }
            }
            lastEndTime = Math.max(lastEndTime, slot.time + slot.duration);
        });

        const sleepTime = timeToMinutes('21:00');
        if (lastEndTime < sleepTime) {
             const duration = sleepTime - lastEndTime;
             if (duration >= 30) {
                 addTask(schedule, { activity: 'Hora livre para brincar', startTime: minutesToTime(lastEndTime), endTime: minutesToTime(sleepTime), days: [day], type: 'free_time', category: 'leisure', emoji: '🪁' }, true);
             }
        }
    });

    // Agrupar tarefas por dias
    const finalScheduleMap: { [key: string]: ScheduleItem } = {};
    Object.values(schedule).flat().forEach(slot => {
        const key = `${slot.task.activity}-${slot.task.startTime}-${slot.task.endTime}`;
        if (finalScheduleMap[key]) {
            finalScheduleMap[key].days.push(slot.task.days[0]);
            // Remove duplicates and sort
            finalScheduleMap[key].days = [...new Set(finalScheduleMap[key].days)].sort((a, b) => allWeekdays.indexOf(a) - allWeekdays.indexOf(b));
        } else {
            finalScheduleMap[key] = { ...slot.task };
        }
    });

    const finalSchedule = Object.values(finalScheduleMap).sort((a,b) => a.startTime.localeCompare(b.startTime));

    return {
        schedule: finalSchedule,
        freeTime: "A rotina foi gerada com períodos de tempo livre entre as atividades fixas e essenciais para garantir o descanso e a diversão do seu herói."
    };
}

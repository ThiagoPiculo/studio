
'use server';
/**
 * @fileOverview Um agente de IA para processar texto e criar uma rotina estruturada para crianças.
 *
 * - processScheduleText - Uma função que manipula a criação da rotina.
 * - ProcessScheduleTextInput - O tipo de entrada para a função processScheduleText.
 * - ProcessScheduleOutput - O tipo de retorno para a função processScheduleText.
 */

import { z } from 'zod';
import { predefinedMissionGroups } from '@/lib/predefined-missions';
import type { Weekday } from '@/lib/types';


const WeekdayEnum = z.enum(['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU']);

const ScheduleItemSchema = z.object({
  activity: z.string().describe("O nome da atividade (ex: 'Hora de Acordar', 'Natação', 'Tempo Livre')."),
  emoji: z.string().emoji().describe("Um emoji que represente a atividade."),
  type: z.enum(['school_entry', 'school_exit', 'extra_activity', 'essential_routine', 'free_time']).describe("O tipo de atividade."),
  category: z.string().describe("A categoria da atividade (ex: 'school', 'health', 'hobbies')."),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).describe("A hora de início no formato HH:mm."),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).describe("A hora de término no formato HH:mm."),
  days: z.array(WeekdayEnum).describe("Uma lista dos dias da semana em que a atividade ocorre."),
});

const ProcessScheduleTextInputSchema = z.object({
  childAge: z.number().describe("A idade da criança."),
  childName: z.string().describe("O nome da criança."),
  schoolShift: z.string().describe("O turno escolar da criança (ex: 'Manhã', 'Tarde', 'Integral')."),
  schoolStartTime: z.string().optional().describe("A hora de início da escola no formato HH:mm, se aplicável."),
  schoolEndTime: z.string().optional().describe("A hora de término da escola no formato HH:mm, se aplicável."),
  extraActivities: z.string().optional().describe("Uma descrição em texto livre das atividades extras da criança, incluindo dias e horários."),
  essentialRoutines: z.array(z.string()).optional().describe("Uma lista de rotinas essenciais a serem incluídas (ex: 'Tomar banho', 'Fazer lição de casa')."),
});
export type ProcessScheduleTextInput = z.infer<typeof ProcessScheduleTextInputSchema>;

const ProcessScheduleOutputSchema = z.object({
  schedule: z.array(ScheduleItemSchema).describe("A rotina semanal estruturada gerada."),
  freeTime: z.string().describe("Um breve resumo sobre os principais blocos de tempo livre identificados para a criança."),
});
export type ProcessScheduleOutput = z.infer<typeof ProcessScheduleOutputSchema>;

type ScheduleItem = z.infer<typeof ScheduleItemSchema>;
type DailySchedule = { [key in Weekday]: { time: number; duration: number; task: ScheduleItem }[] };


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

const addTask = (schedule: DailySchedule, task: Partial<ScheduleItem> & { activity: string, startTime: string, endTime: string, days: Weekday[], type: ScheduleItem['type'] }) => {
    const startMinutes = timeToMinutes(task.startTime);
    const endMinutes = timeToMinutes(task.endTime);
    if (startMinutes >= endMinutes) return; // Prevent invalid tasks
    
    const duration = endMinutes - startMinutes;

    const fullTask: ScheduleItem = {
        activity: task.activity,
        emoji: task.emoji || missionData[task.activity]?.emoji || '✔️',
        type: task.type,
        category: task.category || missionData[task.activity]?.category || 'essential',
        startTime: task.startTime,
        endTime: task.endTime,
        days: task.days,
    };

    task.days.forEach(day => {
        schedule[day].push({ time: startMinutes, duration: duration, task: fullTask });
    });
};

const isOccupied = (schedule: DailySchedule, day: Weekday, start: number, end: number): boolean => {
    return schedule[day].some(slot => Math.max(start, slot.time) < Math.min(end, slot.time + slot.duration));
};


// --- Core Logic ---
export async function processScheduleText(input: ProcessScheduleTextInput): Promise<ProcessScheduleOutput> {
    
    const schedule: DailySchedule = { MO: [], TU: [], WE: [], TH: [], FR: [], SA: [], SU: [] };

    const schoolStart = input.schoolStartTime ? timeToMinutes(input.schoolStartTime) : null;
    const schoolEnd = input.schoolEndTime ? timeToMinutes(input.schoolEndTime) : null;

    const weekdays: Weekday[] = ['MO', 'TU', 'WE', 'TH', 'FR'];

    // Passo 1: Alocar Escola
    if (schoolStart !== null && schoolEnd !== null && input.schoolShift !== 'not_applicable') {
        addTask(schedule, {
            activity: 'Escola',
            startTime: minutesToTime(schoolStart),
            endTime: minutesToTime(schoolEnd),
            days: weekdays,
            type: 'school_entry',
            category: 'school',
            emoji: '🏫'
        });
    }

    // A lógica para `extraActivities` é complexa para parsear texto livre.
    // O foco será nas rotinas fixas e pré-definidas.

    // Passo 2: Construir a rotina com base no turno
    let pendingTasks: { name: string; duration: number, days: Weekday[], defaultTime?: number }[] = [];

    switch (input.schoolShift) {
        case 'Manhã': {
            if (schoolStart === null) break;
            const wakeUpTime = schoolStart - 60;
            addTask(schedule, { activity: 'Hora de acordar', startTime: minutesToTime(wakeUpTime), endTime: minutesToTime(wakeUpTime + 5), days: weekdays, type: 'essential_routine' });
            addTask(schedule, { activity: 'Arrumar a cama', startTime: minutesToTime(wakeUpTime + 10), endTime: minutesToTime(wakeUpTime + 20), days: weekdays, type: 'essential_routine' });
            addTask(schedule, { activity: 'Tomar café da manhã', startTime: minutesToTime(wakeUpTime + 25), endTime: minutesToTime(wakeUpTime + 45), days: weekdays, type: 'essential_routine' });
            addTask(schedule, { activity: 'Escovar os dentes (após acordar)', startTime: minutesToTime(wakeUpTime + 50), endTime: minutesToTime(wakeUpTime + 55), days: weekdays, type: 'essential_routine' });
            addTask(schedule, { activity: 'Sair para escola', startTime: minutesToTime(schoolStart - 20), endTime: minutesToTime(schoolStart - 5), days: weekdays, type: 'school_entry' });
            
            pendingTasks.push({ name: 'Almoçar', duration: 30, days: weekdays, defaultTime: timeToMinutes('13:00')});
            pendingTasks.push({ name: 'Escovar os dentes (após almoço)', duration: 10, days: weekdays, defaultTime: timeToMinutes('13:30')});
            pendingTasks.push({ name: 'Fazer a lição de casa', duration: 60, days: weekdays, defaultTime: timeToMinutes('14:30')});
            pendingTasks.push({ name: 'Organizar a mochila para amanhã', duration: 15, days: weekdays, defaultTime: timeToMinutes('15:30')});
            pendingTasks.push({ name: 'Tomar banho', duration: 20, days: weekdays, defaultTime: timeToMinutes('18:30')});
            pendingTasks.push({ name: 'Jantar', duration: 30, days: weekdays, defaultTime: timeToMinutes('19:00')});
            pendingTasks.push({ name: 'Escovar os dentes (após jantar)', duration: 10, days: weekdays, defaultTime: timeToMinutes('20:40')});
            break;
        }
        case 'Tarde': {
             if (schoolStart === null) break;
            addTask(schedule, { activity: 'Hora de acordar', startTime: '08:00', endTime: '08:05', days: weekdays, type: 'essential_routine' });
            addTask(schedule, { activity: 'Tomar banho', startTime: minutesToTime(schoolStart - 60), endTime: minutesToTime(schoolStart - 40), days: weekdays, type: 'essential_routine' });
            addTask(schedule, { activity: 'Almoçar', startTime: minutesToTime(schoolStart - 40), endTime: minutesToTime(schoolStart - 10), days: weekdays, type: 'essential_routine' });
            
            pendingTasks.push({ name: 'Fazer a lição de casa', duration: 60, days: weekdays, defaultTime: timeToMinutes('09:00')});
            pendingTasks.push({ name: 'Organizar a mochila para amanhã', duration: 15, days: weekdays, defaultTime: timeToMinutes('10:00')});
            pendingTasks.push({ name: 'Jantar', duration: 30, days: weekdays, defaultTime: timeToMinutes('19:00')});
            pendingTasks.push({ name: 'Escovar os dentes (após jantar)', duration: 10, days: weekdays, defaultTime: timeToMinutes('19:30')});
            break;
        }
        case 'Integral': {
            if (schoolStart === null || schoolEnd === null) break;
            const wakeUpTime = schoolStart - 60;
            addTask(schedule, { activity: 'Hora de acordar', startTime: minutesToTime(wakeUpTime), endTime: minutesToTime(wakeUpTime + 5), days: weekdays, type: 'essential_routine' });
            addTask(schedule, { activity: 'Sair para escola', startTime: minutesToTime(schoolStart - 20), endTime: minutesToTime(schoolStart - 5), days: weekdays, type: 'school_entry' });
            
            pendingTasks.push({ name: 'Jantar', duration: 30, days: weekdays, defaultTime: timeToMinutes('19:00')});
            pendingTasks.push({ name: 'Escovar os dentes (após jantar)', duration: 10, days: weekdays, defaultTime: timeToMinutes('19:30')});
            pendingTasks.push({ name: 'Tomar banho', duration: 20, days: weekdays, defaultTime: timeToMinutes('20:40')});
            break;
        }
        case 'not_applicable': {
            addTask(schedule, { activity: 'Hora de acordar', startTime: '08:00', endTime: '08:05', days: weekdays, type: 'essential_routine' });
            addTask(schedule, { activity: 'Almoçar', startTime: '12:20', endTime: '12:50', days: weekdays, type: 'essential_routine' });
            
            pendingTasks.push({ name: 'Tomar banho', duration: 20, days: weekdays, defaultTime: timeToMinutes('17:30')});
            pendingTasks.push({ name: 'Jantar', duration: 30, days: weekdays, defaultTime: timeToMinutes('18:00')});
            pendingTasks.push({ name: 'Escovar os dentes (após jantar)', duration: 10, days: weekdays, defaultTime: timeToMinutes('20:40')});
            break;
        }
    }
    
    // Regras Comuns e de Fim de Semana
    const allDays: Weekday[] = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];
    addTask(schedule, { activity: 'Hora de dormir', startTime: '21:00', endTime: '21:05', days: allDays, type: 'essential_routine' });
    addTask(schedule, { activity: 'Organizar a mochila para amanhã', startTime: '20:00', endTime: '20:15', days: ['SU'], type: 'essential_routine' });


    // Processar tarefas pendentes
    pendingTasks.forEach(task => {
        task.days.forEach(day => {
            if (task.defaultTime && !isOccupied(schedule, day, task.defaultTime, task.defaultTime + task.duration)) {
                addTask(schedule, { activity: task.name, startTime: minutesToTime(task.defaultTime), endTime: minutesToTime(task.defaultTime + task.duration), days: [day], type: 'essential_routine' });
            } else {
                // Lógica de reagendamento: encontrar próximo slot livre (simplificado)
                let foundSlot = false;
                for (let time = timeToMinutes('12:00'); time < timeToMinutes('20:00'); time += 30) {
                    if (!isOccupied(schedule, day, time, time + task.duration)) {
                        addTask(schedule, { activity: task.name, startTime: minutesToTime(time), endTime: minutesToTime(time + task.duration), days: [day], type: 'essential_routine' });
                        foundSlot = true;
                        break;
                    }
                }
            }
        });
    });

    // Passo 3: Adicionar Tempo Livre
    allDays.forEach(day => {
        let lastEndTime = timeToMinutes('07:00');
        schedule[day].sort((a, b) => a.time - b.time);
        
        schedule[day].forEach(slot => {
            if (slot.time > lastEndTime) {
                addTask(schedule, { activity: 'Hora livre para brincar', startTime: minutesToTime(lastEndTime), endTime: minutesToTime(slot.time), days: [day], type: 'free_time', category: 'leisure', emoji: '🪁' });
            }
            lastEndTime = Math.max(lastEndTime, slot.time + slot.duration);
        });

        const sleepTime = timeToMinutes('21:00');
        if (lastEndTime < sleepTime) {
             addTask(schedule, { activity: 'Hora livre para brincar', startTime: minutesToTime(lastEndTime), endTime: minutesToTime(sleepTime), days: [day], type: 'free_time', category: 'leisure', emoji: '🪁' });
        }
    });

    // Agrupar tarefas por dias
    const finalScheduleMap: { [key: string]: ScheduleItem } = {};
    Object.values(schedule).flat().forEach(slot => {
        const key = `${slot.task.activity}-${slot.task.startTime}-${slot.task.endTime}`;
        if (finalScheduleMap[key]) {
            finalScheduleMap[key].days.push(slot.task.days[0]);
            finalScheduleMap[key].days = [...new Set(finalScheduleMap[key].days)].sort();
        } else {
            finalScheduleMap[key] = { ...slot.task };
        }
    });

    const finalSchedule = Object.values(finalScheduleMap).sort((a,b) => a.startTime.localeCompare(b.startTime));

    return {
        schedule: finalSchedule,
        freeTime: "A rotina foi gerada com períodos de tempo livre entre as atividades fixas."
    };
}

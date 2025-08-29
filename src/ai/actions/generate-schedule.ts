

'use server';

import { predefinedMissionGroups } from '@/lib/predefined-missions';
import type { ScheduleItem, Weekday } from '@/lib/types';
import { weekdayLabels } from '@/lib/types';
import { addMinutes, format, subMinutes } from 'date-fns';


// Helper to convert HH:mm string to a Date object for easier manipulation
const timeToDate = (time: string): Date => {
    const [hours, minutes] = time.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
};

// Helper para verificar se um horário está ocupado
const isTimeSlotOccupied = (
    day: Weekday,
    startTime: string,
    endTime: string,
    occupiedSlots: Record<Weekday, { start: number; end: number }[]>
): boolean => {
    if (!startTime || !endTime) {
        return false;
    }
    const newStart = parseTime(startTime);
    const newEnd = parseTime(endTime);
    const daySlots = occupiedSlots[day];

    for (const slot of daySlots) {
        if (newStart < slot.end && newEnd > slot.start) {
            return true;
        }
    }
    return false;
};

// Helper para converter "HH:mm" para minutos desde o início do dia
const parseTime = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
};


// Helper para adicionar um horário à lista de ocupados
const occupyTimeSlot = (
    days: Weekday[],
    startTime: string,
    endTime: string,
    occupiedSlots: Record<Weekday, { start: number; end: number }[]>
) => {
    if (!startTime || !endTime) return;
    const newStart = parseTime(startTime);
    const newEnd = parseTime(endTime);
    days.forEach(day => {
        occupiedSlots[day].push({ start: newStart, end: newEnd });
    });
};

const findMissionDetails = (title: string) => {
    return predefinedMissionGroups.flatMap(g => g.items).find(i => i.title === title);
};


export async function generateSchedule(input: any): Promise<{ schedule: ScheduleItem[] }> {
    
    const finalSchedule: ScheduleItem[] = [];
    const occupiedSlots: Record<Weekday, { start: number; end: number }[]> = {
        MO: [], TU: [], WE: [], TH: [], FR: [], SA: [], SU: []
    };
    const weekdays: Weekday[] = ['MO', 'TU', 'WE', 'TH', 'FR'];

    // Lógica para Turno da Tarde
    if (input.schoolShift === 'afternoon' && input.schoolShiftStart && input.schoolShiftEnd) {
        const schoolStartTime = timeToDate(input.schoolShiftStart);
        const schoolEndTime = timeToDate(input.schoolShiftEnd);

        // 1. ANCHORS: Calculate anchor times based on school schedule
        const wakeUpTime = format(subMinutes(schoolStartTime, 5 * 60), 'HH:mm');
        const lunchTime = format(subMinutes(schoolStartTime, 45), 'HH:mm');
        const dinnerTime = format(addMinutes(schoolEndTime, 30), 'HH:mm');
        const sleepTime = format(addMinutes(schoolEndTime, 4 * 60), 'HH:mm');

        // 2. FIXED SLOTS: School and Extra Activities
        finalSchedule.push({
            activity: 'Escola', emoji: '🏫', type: 'school_entry', category: 'school',
            startTime: input.schoolShiftStart, endTime: input.schoolShiftEnd, days: weekdays,
        });
        occupyTimeSlot(weekdays, input.schoolShiftStart, input.schoolShiftEnd, occupiedSlots);

        (input.extraActivities || []).forEach((activity: any) => {
             const activityDays = activity.days as Weekday[];
             const endTime = format(addMinutes(timeToDate(activity.time), 60), 'HH:mm');
             const details = findMissionDetails(activity.name);
             if (details) {
                 finalSchedule.push({
                    activity: details.title, emoji: details.emoji, type: 'extra_activity', category: details.suggestedAppCategory,
                    startTime: activity.time, endTime, days: activityDays,
                 });
                 occupyTimeSlot(activityDays, activity.time, endTime, occupiedSlots);
             }
        });

        // 3. ROUTINE SLOTS: Build the schedule based on your rules
        const scheduleRules = [
            { activity: 'Hora de acordar', startTime: wakeUpTime, duration: 10 },
            { activity: 'Arrumar a cama', startTime: format(addMinutes(timeToDate(wakeUpTime), 10), 'HH:mm'), duration: 5 },
            { activity: 'Tomar café da manhã', startTime: format(addMinutes(timeToDate(wakeUpTime), 15), 'HH:mm'), duration: 15 },
            { activity: 'Escovar os dentes (após acordar)', startTime: format(addMinutes(timeToDate(wakeUpTime), 30), 'HH:mm'), duration: 5 },
            { activity: 'Fazer a lição de casa', startTime: format(addMinutes(timeToDate(wakeUpTime), 60), 'HH:mm'), duration: 55 },
            { activity: 'Organizar a mochila para amanhã', startTime: format(addMinutes(timeToDate(wakeUpTime), 115), 'HH:mm'), duration: 5 },
            { activity: 'Almoçar', startTime: lunchTime, duration: 20 },
            { activity: 'Escovar os dentes (após almoço)', startTime: format(addMinutes(timeToDate(lunchTime), 20), 'HH:mm'), duration: 5 },
            { activity: 'Sair para escola', startTime: format(subMinutes(schoolStartTime, 20), 'HH:mm'), duration: 20 },
            { activity: 'Tomar banho', startTime: format(subMinutes(timeToDate(lunchTime), 45), 'HH:mm'), duration: 15, condition: () => !isTimeSlotOccupied(weekdays[0], format(subMinutes(timeToDate(lunchTime), 45), 'HH:mm'), format(subMinutes(timeToDate(lunchTime), 30), 'HH:mm'), occupiedSlots) },
            { activity: 'Jantar', startTime: dinnerTime, duration: 15 },
            { activity: 'Escovar os dentes (após jantar)', startTime: format(addMinutes(timeToDate(dinnerTime), 15), 'HH:mm'), duration: 5 },
            { activity: 'Hora de dormir', startTime: sleepTime, duration: 20 },
        ];

        scheduleRules.forEach(rule => {
             // Skip if another rule has already defined this as a fixed anchor
             if(finalSchedule.some(item => item.activity === rule.activity)) return;

             if (rule.condition && !rule.condition()) {
                // Handle conflicts here if needed, for now we just skip
                return;
             }

             const details = findMissionDetails(rule.activity);
             if (details) {
                 const endTime = format(addMinutes(timeToDate(rule.startTime), rule.duration), 'HH:mm');
                 finalSchedule.push({
                     activity: details.title, emoji: details.emoji, type: 'essential_routine', category: details.suggestedAppCategory,
                     startTime: rule.startTime, endTime, days: weekdays,
                 });
                 occupyTimeSlot(weekdays, rule.startTime, endTime, occupiedSlots);
             }
        });
        
         // 4. FREE TIME: Fill the gaps
        const freeTimeSlots = [
            { startTime: '10:00', endTime: '11:00'},
            { startTime: '18:00', endTime: '19:00'},
            { startTime: '19:30', endTime: '20:00'},
            { startTime: '20:00', endTime: '21:00'},
            { startTime: '21:00', endTime: '21:40'},
        ];

        freeTimeSlots.forEach(slot => {
            if (!isTimeSlotOccupied(weekdays[0], slot.startTime, slot.endTime, occupiedSlots)) {
                 const details = findMissionDetails('Hora livre para brincar');
                 if(details) {
                    finalSchedule.push({
                        activity: 'Hora livre para brincar', emoji: '🧩', type: 'essential_routine', category: 'hobbies',
                        startTime: slot.startTime, endTime: slot.endTime, days: weekdays,
                    });
                 }
            }
        });
    } else {
        // Lançar um erro para o frontend tratar e exibir uma mensagem amigável
        throw new Error(`O modo de geração de rotina para o turno "${input.schoolShift}" ainda está em desenvolvimento. Por favor, tente o turno da tarde.`);
    }

    return {
        schedule: finalSchedule
    };
}

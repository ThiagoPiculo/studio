
'use server';

import { generateScheduleFlow, type GenerateScheduleInput, type GenerateScheduleOutput } from '@/ai/flows/generate-schedule-flow';
import { predefinedMissionGroups } from '@/lib/predefined-missions';
import type { ScheduleItem, Weekday } from '@/lib/types';
import { parseTime, weekdayLabels } from '@/lib/calendar-utils';


// Helper para verificar se um horário está ocupado
const isTimeSlotOccupied = (
    day: Weekday,
    startTime: string,
    endTime: string,
    occupiedSlots: Record<Weekday, { start: number; end: number }[]>
): boolean => {
    if (!startTime || !endTime) {
        // Se não houver hora de início ou fim, consideramos que não está ocupado para evitar erros.
        return false; 
    }
    const newStart = parseTime(startTime);
    const newEnd = parseTime(endTime);
    const daySlots = occupiedSlots[day];

    for (const slot of daySlots) {
        // Check for any overlap
        if (newStart < slot.end && newEnd > slot.start) {
            return true;
        }
    }
    return false;
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


export async function generateSchedule(input: GenerateScheduleInput): Promise<GenerateScheduleOutput> {
    
    const finalSchedule: ScheduleItem[] = [];
    const allMissions = predefinedMissionGroups.flatMap(group => group.items);
    const occupiedSlots: Record<Weekday, { start: number; end: number }[]> = {
        MO: [], TU: [], WE: [], TH: [], FR: [], SA: [], SU: []
    };

    // NÍVEL 1: Escola (inadiável)
    if (input.schoolShift !== 'not_applicable' && input.schoolStartTime && input.schoolEndTime) {
        const schoolDays: Weekday[] = ['MO', 'TU', 'WE', 'TH', 'FR'];
        const schoolItem: ScheduleItem = {
            activity: 'Escola',
            emoji: '🏫',
            type: 'school_entry', 
            category: 'school',
            startTime: input.schoolStartTime,
            endTime: input.schoolEndTime,
            days: schoolDays,
        };
        finalSchedule.push(schoolItem);
        occupyTimeSlot(schoolDays, schoolItem.startTime, schoolItem.endTime, occupiedSlots);
    }

    // NÍVEL 2: Atividades Extras (com horário fixo)
    input.extraActivities?.forEach(activity => {
        const activityDays = activity.days as Weekday[];
        const predefined = allMissions.find(m => m.title.toLowerCase() === activity.name.toLowerCase());
        
        // Atividade dura 60 minutos por padrão
        const [hour, minute] = activity.time.split(':').map(Number);
        const endHour = (hour + 1).toString().padStart(2, '0');
        const endTime = `${endHour}:${minute.toString().padStart(2, '0')}`;
        
        if (!isTimeSlotOccupied(activityDays[0], activity.time, endTime, occupiedSlots)) {
             finalSchedule.push({
                activity: predefined?.title || activity.name,
                emoji: predefined?.emoji || '🤸',
                type: 'extra_activity',
                category: predefined?.suggestedAppCategory || 'hobbies',
                startTime: activity.time,
                endTime: endTime,
                days: activityDays,
            });
            occupyTimeSlot(activityDays, activity.time, endTime, occupiedSlots);
        }
    });

    // NÍVEL 3: Sugestões da IA para Rotinas Essenciais
    const extraActivitiesText = (input.extraActivities || [])
        .map(activity => {
            const daysInPortuguese = activity.days.map(day => weekdayLabels[day as Weekday].short).join(', ');
            return `${activity.name} (${daysInPortuguese}) às ${activity.time}`;
        })
        .join('; ');
        
    const aiInput: GenerateScheduleInput = {
        childName: input.childName,
        childAge: input.childAge,
        schoolShift: input.schoolShift,
        schoolStartTime: input.schoolStartTime,
        schoolEndTime: input.schoolEndTime,
        wakeUpTime: input.wakeUpTime,
        lunchTime: input.lunchTime,
        dinnerTime: input.dinnerTime,
        sleepTime: input.sleepTime,
        extraActivities: extraActivitiesText,
        essentialRoutines: input.essentialRoutines,
    };

    const aiOutput = await generateScheduleFlow(aiInput);

    const processedActivities = new Set<string>();

    aiOutput.schedule.forEach(itemFromAI => {
        // Validação básica para a resposta da IA
        if (!itemFromAI.startTime || !itemFromAI.endTime || processedActivities.has(itemFromAI.activity.toLowerCase())) {
            return;
        }

        const predefined = allMissions.find(m => m.title.toLowerCase() === itemFromAI.activity.toLowerCase());
        if (!predefined) return;

        const days = itemFromAI.days || ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];
        const validDays: Weekday[] = [];
        
        days.forEach(day => {
            if (!isTimeSlotOccupied(day, itemFromAI.startTime, itemFromAI.endTime, occupiedSlots)) {
                validDays.push(day);
            }
        });

        if (validDays.length > 0) {
            const newItem: ScheduleItem = {
                activity: predefined.title,
                emoji: predefined.emoji,
                type: 'essential_routine',
                category: predefined.suggestedAppCategory,
                startTime: itemFromAI.startTime,
                endTime: itemFromAI.endTime,
                days: validDays,
            };
            finalSchedule.push(newItem);
            occupyTimeSlot(validDays, newItem.startTime, newItem.endTime, occupiedSlots);
            processedActivities.add(itemFromAI.activity.toLowerCase());
        }
    });

    return {
        schedule: finalSchedule
    };
}

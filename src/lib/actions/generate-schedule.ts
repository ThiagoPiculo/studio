
'use server';

import type { OnboardingFormValues } from '@/components/dashboard/onboarding/OnboardingForm';
import { predefinedMissionGroups } from '@/lib/predefined-missions';
import type { ScheduleItem, Weekday } from '@/lib/types';
import { addMinutes, format, subMinutes } from 'date-fns';

// Helper to convert HH:mm string to a Date object for easier manipulation
const timeToDate = (time: string): Date => {
  const [hours, minutes] = time.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
};

// Helper para converter "HH:mm" para minutos desde o início do dia
const parseTime = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes)) {
    return 0;
  }
  return hours * 60 + minutes;
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

export async function generateSchedule(input: OnboardingFormValues): Promise<{ schedule: ScheduleItem[] }> {
  const finalSchedule: ScheduleItem[] = [];
  const occupiedSlots: Record<Weekday, { start: number; end: number }[]> = {
    MO: [], TU: [], WE: [], TH: [], FR: [], SA: [], SU: [],
  };
  const weekdays: Weekday[] = ['MO', 'TU', 'WE', 'TH', 'FR'];

  // Lógica para Turno da Tarde
  if (input.schoolShift === 'afternoon' && input.schoolShiftStart && input.schoolShiftEnd) {
    const schoolStartTime = timeToDate(input.schoolShiftStart);
    const schoolEndTime = timeToDate(input.schoolShiftEnd);

    // 1. ANCHORS
    const wakeUpTime = format(subMinutes(schoolStartTime, 5 * 60), 'HH:mm'); // 08:00
    const lunchTime = format(subMinutes(schoolStartTime, 45), 'HH:mm'); // 12:15
    const dinnerTime = format(addMinutes(schoolEndTime, 30), 'HH:mm'); // 18:00
    const sleepTime = format(addMinutes(schoolEndTime, 4 * 60), 'HH:mm'); // 21:30

    // 2. FIXED SLOTS (Escola e Atividades Extras)
    finalSchedule.push({
      activity: 'Escola', emoji: '🏫', type: 'school_entry', category: 'school',
      startTime: input.schoolShiftStart, endTime: input.schoolShiftEnd, days: weekdays,
    });
    occupyTimeSlot(weekdays, input.schoolShiftStart, input.schoolShiftEnd, occupiedSlots);

    (input.extraActivities || []).forEach(activity => {
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

    // 3. ROUTINE SLOTS
    const scheduleRules = [
      { activityTitle: 'Hora de acordar', startTime: wakeUpTime, duration: 10 },
      { activityTitle: 'Arrumar a cama', startTime: format(addMinutes(timeToDate(wakeUpTime), 10), 'HH:mm'), duration: 5 },
      { activityTitle: 'Tomar café da manhã', startTime: format(addMinutes(timeToDate(wakeUpTime), 15), 'HH:mm'), duration: 15 },
      { activityTitle: 'Escovar os dentes (após acordar)', startTime: format(addMinutes(timeToDate(wakeUpTime), 30), 'HH:mm'), duration: 5 },
      { activityTitle: 'Fazer a lição de casa', startTime: '09:00', duration: 55 },
      { activityTitle: 'Organizar a mochila para amanhã', startTime: '09:55', duration: 5 },
      { activityTitle: 'Almoçar', startTime: lunchTime, duration: 20 },
      { activityTitle: 'Escovar os dentes (após almoço)', startTime: format(addMinutes(timeToDate(lunchTime), 20), 'HH:mm'), duration: 5 },
      { activityTitle: 'Sair para escola', startTime: format(subMinutes(schoolStartTime, 20), 'HH:mm'), duration: 20 },
      { activityTitle: 'Jantar', startTime: dinnerTime, duration: 15 },
      { activityTitle: 'Escovar os dentes (após jantar)', startTime: format(addMinutes(timeToDate(dinnerTime), 15), 'HH:mm'), duration: 5 },
      { activityTitle: 'Hora de dormir', startTime: sleepTime, duration: 20 },
      // O banho é especial, vamos tentar encaixá-lo
      { activityTitle: 'Tomar banho', startTime: '12:00', duration: 15, isFlexible: true },
    ];
    
    scheduleRules.forEach(rule => {
      const details = findMissionDetails(rule.activityTitle);
      if (details) {
        let effectiveStartTime = rule.startTime;
        let endTime = format(addMinutes(timeToDate(effectiveStartTime), rule.duration), 'HH:mm');

        // Lógica de flexibilidade para o banho ou outras tarefas
        if (rule.isFlexible && isTimeSlotOccupied(weekdays[0], effectiveStartTime, endTime, occupiedSlots)) {
            // Se o horário padrão está ocupado, tenta outro (ex: à noite)
            const alternativeStartTime = '21:40'; 
            const alternativeEndTime = format(addMinutes(timeToDate(alternativeStartTime), rule.duration), 'HH:mm');
            if(!isTimeSlotOccupied(weekdays[0], alternativeStartTime, alternativeEndTime, occupiedSlots)) {
                effectiveStartTime = alternativeStartTime;
                endTime = alternativeEndTime;
            } else {
                // Se ainda estiver ocupado, podemos pular ou logar um aviso
                return; 
            }
        }
        
        finalSchedule.push({
          activity: details.title, emoji: details.emoji, type: 'essential_routine', category: details.suggestedAppCategory,
          startTime: effectiveStartTime, endTime: endTime, days: weekdays,
        });
        occupyTimeSlot(weekdays, effectiveStartTime, endTime, occupiedSlots);
      }
    });

    // 4. FREE TIME
    const freeTimeSlots = [
      { startTime: '10:00', endTime: '10:20' }, // Before a possible extra activity
      { startTime: '11:20', endTime: '12:00' }, // After a possible extra activity
      { startTime: '18:15', endTime: '19:00' }, // After dinner
      { startTime: '19:30', endTime: '21:30' }, // Evening free time
    ];

    freeTimeSlots.forEach(slot => {
      if (!isTimeSlotOccupied(weekdays[0], slot.startTime, slot.endTime, occupiedSlots)) {
        const details = findMissionDetails('Hora livre para brincar');
        if (details) {
          finalSchedule.push({
            activity: 'Hora livre para brincar', emoji: '🧩', type: 'essential_routine', category: 'hobbies',
            startTime: slot.startTime, endTime: slot.endTime, days: weekdays,
          });
        }
      }
    });


  } else {
    throw new Error(`O modo de geração de rotina para o turno "${input.schoolShift}" ainda está em desenvolvimento. Por favor, tente o turno da tarde.`);
  }

  return {
    schedule: finalSchedule,
  };
}


import type {
  ScheduleItem,
  Weekday,
  MissionCategory,
  OnboardingFormValues,
} from './types';
import { predefinedMissionGroups } from './predefined-missions';
import { parseTime, getDayToWeekday } from './calendar-utils';
import { startOfDay, getDay } from 'date-fns';

export type ScheduleGeneratorInput = OnboardingFormValues;

export interface GenerateScheduleOutput {
  schedule: ScheduleItem[];
  freeTimeSummary: string;
}

const allWeekdays: Weekday[] = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];
const weekdays: Weekday[] = ['MO', 'TU', 'WE', 'TH', 'FR'];
const weekends: Weekday[] = ['SA', 'SU'];

const missionDetailsMap = new Map(
  predefinedMissionGroups
    .flatMap(g => g.items)
    .map(item => [item.title, item])
);

export function scheduleGenerator(
  input: ScheduleGeneratorInput
): GenerateScheduleOutput {
  const schedule: ScheduleItem[] = [];
  let conflicts: string[] = [];

  const timeGrid: Record<Weekday, { start: number; end: number }[]> = {
    MO: [], TU: [], WE: [], TH: [], FR: [], SA: [], SU: [],
  };

  const addBusyTime = (days: Weekday[], startTime: string, endTime: string, activity: string) => {
    const startMinutes = parseTime(startTime);
    const endMinutes = parseTime(endTime);
    for (const day of days) {
      // Check for conflicts before adding
      const hasConflict = timeGrid[day].some(
        slot => startMinutes < slot.end && endMinutes > slot.start
      );
      if (hasConflict) {
        conflicts.push(`${activity} às ${startTime} na ${day}`);
        continue; // Skip adding this conflicting event
      }
      timeGrid[day].push({ start: startMinutes, end: endMinutes });
    }
  };

  // NÍVEL 1: Escola
  if (input.schoolShift !== 'not_applicable' && input.schoolShiftStart && input.schoolShiftEnd) {
    const schoolMission = missionDetailsMap.get('Escola') || { emoji: '🏫', suggestedAppCategory: 'school' };
    const schoolItem: ScheduleItem = {
      activity: 'Escola',
      emoji: schoolMission.emoji,
      type: 'school_entry',
      category: schoolMission.suggestedAppCategory,
      startTime: input.schoolShiftStart,
      endTime: input.schoolShiftEnd,
      days: weekdays,
    };
    schedule.push(schoolItem);
    addBusyTime(weekdays, input.schoolShiftStart, input.schoolShiftEnd, 'Escola');
  }

  // NÍVEL 2: Atividades Extras
  if (input.extraActivities) {
    for (const activity of input.extraActivities) {
      const duration = 60; // Assume 1 hour for all extra activities
      const startMinutes = parseTime(activity.time);
      const endMinutes = startMinutes + duration;
      const endTime = `${String(Math.floor(endMinutes / 60)).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}`;
      const missionDetail = missionDetailsMap.get(activity.name) || { emoji: '✨', suggestedAppCategory: 'hobbies' };

      const activityItem: ScheduleItem = {
        activity: activity.name,
        emoji: missionDetail.emoji,
        type: 'extra_activity',
        category: missionDetail.suggestedAppCategory,
        startTime: activity.time,
        endTime,
        days: activity.days as Weekday[],
      };
      schedule.push(activityItem);
      addBusyTime(activity.days as Weekday[], activity.time, endTime, activity.name);
    }
  }

  // NÍVEL 3: Rotinas Essenciais
  const routinesToSchedule = new Set(input.essentialRoutines);

  const scheduleRoutine = (name: string, days: Weekday[], time: string, duration: number) => {
    if (!routinesToSchedule.has(name)) return;
    const missionDetail = missionDetailsMap.get(name) || { emoji: '⭐', suggestedAppCategory: 'essential_routines' };
    const startMinutes = parseTime(time);
    const endMinutes = startMinutes + duration;
    const endTime = `${String(Math.floor(endMinutes / 60)).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}`;

    const routineItem: ScheduleItem = {
        activity: name,
        emoji: missionDetail.emoji,
        type: 'essential_routine',
        category: missionDetail.suggestedAppCategory,
        startTime: time,
        endTime: endTime,
        days: days,
    };
    schedule.push(routineItem);
    addBusyTime(days, time, endTime, name);
  };
  
  const getRelativeTime = (baseTime: string, offsetMinutes: number) => {
    const baseMinutes = parseTime(baseTime);
    const newMinutes = baseMinutes + offsetMinutes;
    return `${String(Math.floor(newMinutes / 60)).padStart(2, '0')}:${String(newMinutes % 60).padStart(2, '0')}`;
  }
  
  if (input.wakeUpTime) scheduleRoutine('Hora de acordar', allWeekdays, input.wakeUpTime, 10);
  if (input.sleepTime) scheduleRoutine('Hora de dormir', allWeekdays, input.sleepTime, 10);

  // Rotinas de dias de semana
  if (input.schoolShift === 'morning' && input.schoolShiftStart && input.wakeUpTime && input.schoolShiftEnd && input.lunchTime) {
      scheduleRoutine('Arrumar a cama', weekdays, getRelativeTime(input.wakeUpTime, 10), 15);
      scheduleRoutine('Tomar café da manhã', weekdays, getRelativeTime(input.wakeUpTime, 25), 10);
      scheduleRoutine('Escovar os dentes (após acordar)', weekdays, getRelativeTime(input.wakeUpTime, 35), 5);
      scheduleRoutine('Sair para escola', weekdays, getRelativeTime(input.schoolShiftStart, -20), 20);
      if (!input.mealsAtSchool?.lunch && input.lunchTime) {
          scheduleRoutine('Almoçar', weekdays, input.lunchTime, 30);
          scheduleRoutine('Escovar os dentes (após almoço)', weekdays, getRelativeTime(input.lunchTime, 30), 30);
      }
      scheduleRoutine('Fazer a lição de casa', weekdays, '14:30', 60);
      scheduleRoutine('Organizar a mochila para amanhã', weekdays, '15:30', 30);
  } else if (input.schoolShift === 'afternoon' && input.wakeUpTime && input.lunchTime && input.schoolShiftEnd && input.dinnerTime) {
      scheduleRoutine('Arrumar a cama', weekdays, getRelativeTime(input.wakeUpTime, 10), 15);
      scheduleRoutine('Tomar café da manhã', weekdays, getRelativeTime(input.wakeUpTime, 25), 10);
      scheduleRoutine('Escovar os dentes (após acordar)', weekdays, getRelativeTime(input.wakeUpTime, 35), 5);
      scheduleRoutine('Fazer a lição de casa', weekdays, '09:00', 50);
      scheduleRoutine('Organizar a mochila para amanhã', weekdays, '09:50', 10);
      scheduleRoutine('Tomar banho', weekdays, getRelativeTime(input.schoolShiftStart!, -60), 30);
      if (!input.mealsAtSchool?.lunch && input.lunchTime) {
        scheduleRoutine('Almoçar', weekdays, input.lunchTime, 30);
        scheduleRoutine('Escovar os dentes (após almoço)', weekdays, getRelativeTime(input.lunchTime, 15), 15);
      }
  } else if (input.schoolShift === 'full_time' && input.wakeUpTime) {
       scheduleRoutine('Arrumar a cama', weekdays, getRelativeTime(input.wakeUpTime, 10), 15);
       scheduleRoutine('Tomar café da manhã', weekdays, getRelativeTime(input.wakeUpTime, 25), 10);
  }
  
  if (input.schoolShift !== 'not_applicable' && input.dinnerTime) {
      if(!input.mealsAtSchool?.dinner) {
        scheduleRoutine('Jantar', weekdays, input.dinnerTime, 30);
        scheduleRoutine('Escovar os dentes (após jantar)', weekdays, getRelativeTime(input.dinnerTime, 15), 15);
      }
      scheduleRoutine('Tomar banho', weekdays, getRelativeTime(input.sleepTime!, -30), 30);
  } else if (input.schoolShift === 'not_applicable' && input.wakeUpTime && input.lunchTime && input.dinnerTime) {
      scheduleRoutine('Arrumar a cama', weekdays, getRelativeTime(input.wakeUpTime, 10), 15);
      scheduleRoutine('Tomar café da manhã', weekdays, getRelativeTime(input.wakeUpTime, 25), 10);
      scheduleRoutine('Escovar os dentes (após acordar)', weekdays, getRelativeTime(input.wakeUpTime, 35), 5);
      scheduleRoutine('Almoçar', weekdays, input.lunchTime, 30);
      scheduleRoutine('Escovar os dentes (após almoço)', weekdays, getRelativeTime(input.lunchTime, 15), 15);
      scheduleRoutine('Jantar', weekdays, input.dinnerTime, 30);
      scheduleRoutine('Escovar os dentes (após jantar)', weekdays, getRelativeTime(input.dinnerTime, 15), 15);
      scheduleRoutine('Tomar banho', weekdays, getRelativeTime(input.sleepTime!, -30), 30);
  }
  
  // Rotinas de fim de semana
  scheduleRoutine('Fazer a lição de casa', ['SA'], '09:40', 80);
  scheduleRoutine('Organizar a mochila para amanhã', ['SU'], '19:30', 30);


  // NÍVEL 4: Preenchimento de tempo livre
  const freeTimeMission = missionDetailsMap.get('Hora livre para brincar') || { emoji: '🧩', suggestedAppCategory: 'free_time' };
  allWeekdays.forEach(day => {
    const sortedBusySlots = timeGrid[day].sort((a, b) => a.start - b.start);
    let lastEndTime = 0;
    sortedBusySlots.forEach(slot => {
        if (slot.start > lastEndTime) {
            const startTime = `${String(Math.floor(lastEndTime / 60)).padStart(2, '0')}:${String(lastEndTime % 60).padStart(2, '0')}`;
            const endTime = `${String(Math.floor(slot.start / 60)).padStart(2, '0')}:${String(slot.start % 60).padStart(2, '0')}`;
            schedule.push({
                activity: 'Hora livre para brincar',
                emoji: freeTimeMission.emoji,
                type: 'free_time',
                category: freeTimeMission.suggestedAppCategory,
                startTime,
                endTime,
                days: [day],
            });
        }
        lastEndTime = Math.max(lastEndTime, slot.end);
    });

    const endOfDayMinutes = 24 * 60;
    if (lastEndTime < endOfDayMinutes) {
         const startTime = `${String(Math.floor(lastEndTime / 60)).padStart(2, '0')}:${String(lastEndTime % 60).padStart(2, '0')}`;
         const endTime = '23:59';
         schedule.push({
            activity: 'Hora livre para brincar',
            emoji: freeTimeMission.emoji,
            type: 'free_time',
            category: freeTimeMission.suggestedAppCategory,
            startTime,
            endTime,
            days: [day],
        });
    }
  });


  let freeTimeSummary = `A rotina de ${input.childName} foi criada com sucesso, com os horários de tempo livre preenchidos.`;
  if (conflicts.length > 0) {
    freeTimeSummary += ` Atenção: ${conflicts.join(', ')} não foram agendadas por conflito de horário.`;
  }

  return { schedule, freeTimeSummary };
}

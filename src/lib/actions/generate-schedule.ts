
'use server';

import type { OnboardingFormValues } from '@/components/dashboard/onboarding/OnboardingForm';
import { predefinedMissionGroups } from '@/lib/predefined-missions';
import type { ScheduleItem, Weekday, MissionCategory } from '@/lib/types';
import { addMinutes, format, subMinutes } from 'date-fns';

// Helper para converter "HH:mm" para minutos desde o início do dia
const parseTime = (time: string): number => {
  if (!time || !time.includes(':')) return 0;
  const [hours, minutes] = time.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes)) return 0;
  return hours * 60 + minutes;
};

// Helper para converter minutos para "HH:mm"
const formatTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60) % 24; // Use modulo 24 to handle rollovers
    const mins = (minutes % 60);
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

const findMissionDetails = (title: string) => {
  return predefinedMissionGroups.flatMap(g => g.items).find(i => i.title === title);
};

export async function generateSchedule(input: OnboardingFormValues): Promise<{ schedule: ScheduleItem[] }> {
  const finalSchedule: ScheduleItem[] = [];
  const occupiedSlots: { day: Weekday, start: number, end: number, activity: string }[] = [];
  const weekdays: Weekday[] = ['MO', 'TU', 'WE', 'TH', 'FR'];
  
  // Adiciona um item à agenda final e marca os slots como ocupados
  const addAndOccupy = (item: Omit<ScheduleItem, 'type' | 'category' | 'emoji'>, type: ScheduleItem['type'], category: MissionCategory, emoji: string) => {
      finalSchedule.push({ ...item, type, category, emoji });
      if (item.startTime && item.endTime && item.days) {
          item.days.forEach(day => {
              occupiedSlots.push({ day, start: parseTime(item.startTime!), end: parseTime(item.endTime!), activity: item.activity });
          });
      }
  };

  // 1. BLOQUEAR HORÁRIOS FIXOS (ESCOLA E ATIVIDADES EXTRAS)
  if (input.schoolShift !== 'not_applicable' && input.schoolShiftStart && input.schoolShiftEnd) {
    addAndOccupy({ activity: 'Escola', startTime: input.schoolShiftStart, endTime: input.schoolShiftEnd, days: weekdays }, 'school_entry', 'school', '🏫');
  }

  (input.extraActivities || []).forEach(activity => {
      const details = findMissionDetails(activity.name);
      if (details) {
        addAndOccupy({
          activity: activity.name,
          startTime: activity.startTime,
          endTime: activity.endTime,
          days: activity.days as Weekday[],
        }, 'extra_activity', details.suggestedAppCategory, details.emoji);
      }
    });

  // 2. ENCAIXAR ROTINAS ESSENCIAIS
  const routineRules = [
    { title: 'Hora de acordar', time: input.wakeUpTime, duration: 10, days: weekdays, anchor: 'wakeUpTime' },
    { title: 'Arrumar a cama', time: input.wakeUpTime, offset: 10, duration: 5, days: weekdays, anchor: 'wakeUpTime' },
    { title: 'Tomar café da manhã', time: input.wakeUpTime, offset: 15, duration: 20, days: weekdays, anchor: 'wakeUpTime' },
    { title: 'Escovar os dentes', time: input.wakeUpTime, offset: 35, duration: 5, days: weekdays, anchor: 'wakeUpTime', instanceId: 'after_wakeup' },
    
    { title: 'Almoçar', time: input.lunchTime, duration: 25, days: weekdays, anchor: 'lunchTime' },
    { title: 'Escovar os dentes', time: input.lunchTime, offset: 25, duration: 5, days: weekdays, anchor: 'lunchTime', instanceId: 'after_lunch' },
    
    { title: 'Jantar', time: input.dinnerTime, duration: 25, days: weekdays, anchor: 'dinnerTime' },
    { title: 'Escovar os dentes', time: input.dinnerTime, offset: 25, duration: 5, days: weekdays, anchor: 'dinnerTime', instanceId: 'after_dinner' },
    
    { title: 'Tomar banho', time: input.sleepTime, offset: -45, duration: 15, days: weekdays, anchor: 'sleepTime' },
    { title: 'Organizar a mochila para amanhã', time: input.sleepTime, offset: -25, duration: 5, days: weekdays, anchor: 'sleepTime' },
    { title: 'Hora de dormir', time: input.sleepTime, offset: -20, duration: 20, days: weekdays, anchor: 'sleepTime' },
    
    { title: 'Fazer a lição de casa', time: input.schoolShift === 'afternoon' ? '09:00' : '18:30', duration: 55, days: weekdays, anchor: 'fixed' }
  ];

  routineRules.forEach(rule => {
      if (!input.essentialRoutines?.includes(rule.title) || !rule.time) return;

      const details = findMissionDetails(rule.title);
      if (!details) return;

      const baseStartTime = parseTime(rule.time) + (rule.offset || 0);
      
      const daysToSchedule = (rule.days || []).filter(day => {
          const startTime = baseStartTime;
          const endTime = startTime + rule.duration;

          const isOccupied = occupiedSlots.some(slot =>
              slot.day === day && Math.max(startTime, slot.start) < Math.min(endTime, slot.end)
          );
          return !isOccupied;
      });

      if (daysToSchedule.length > 0) {
          addAndOccupy({
              activity: rule.title,
              startTime: formatTime(baseStartTime),
              endTime: formatTime(baseStartTime + rule.duration),
              days: daysToSchedule,
          }, 'essential_routine', details.suggestedAppCategory, details.emoji);
      }
  });

  return {
    schedule: finalSchedule,
  };
}

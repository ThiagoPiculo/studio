
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
    // --- Rotinas baseadas no horário de ACORDAR ---
    { title: 'Hora de acordar', anchor: 'wakeUpTime', offset: 0, duration: 10 },
    { title: 'Arrumar a cama', anchor: 'wakeUpTime', offset: 10, duration: 5 },
    { title: 'Tomar café da manhã', anchor: 'wakeUpTime', offset: 15, duration: 20 },
    { title: 'Escovar os dentes', anchor: 'wakeUpTime', offset: 35, duration: 5, instanceId: 'after_wakeup' },
    
    // --- Rotinas baseadas no horário do ALMOÇO ---
    { title: 'Almoçar', anchor: 'lunchTime', offset: 0, duration: 25 },
    { title: 'Escovar os dentes', anchor: 'lunchTime', offset: 25, duration: 5, instanceId: 'after_lunch' },
    
    // --- Rotinas baseadas no horário do JANTAR ---
    { title: 'Jantar', anchor: 'dinnerTime', offset: 0, duration: 25 },
    { title: 'Escovar os dentes', anchor: 'dinnerTime', offset: 25, duration: 5, instanceId: 'after_dinner' },
    
    // --- Rotinas baseadas no horário de DORMIR ---
    { title: 'Tomar banho', anchor: 'sleepTime', offset: -45, duration: 15 },
    { title: 'Organizar a mochila para amanhã', anchor: 'sleepTime', offset: -25, duration: 5 },
    { title: 'Hora de dormir', anchor: 'sleepTime', offset: -20, duration: 20 },
    
    // --- Rotina com horário mais fixo, mas que pode ser ajustado ---
    { title: 'Fazer a lição de casa', anchor: 'fixed', fixedTime: input.schoolShift === 'afternoon' ? '09:00' : '18:30', duration: 55 }
  ];


  routineRules.forEach(rule => {
      if (!input.essentialRoutines?.includes(rule.title)) return;
      
      const details = findMissionDetails(rule.title);
      if (!details) return;

      let baseTimeInMinutes: number;

      if (rule.anchor === 'fixed' && rule.fixedTime) {
          baseTimeInMinutes = parseTime(rule.fixedTime);
      } else {
          const anchorTimeValue = input[rule.anchor as keyof OnboardingFormValues];
          if (typeof anchorTimeValue !== 'string' || !anchorTimeValue) return;
          baseTimeInMinutes = parseTime(anchorTimeValue);
      }

      const startTime = baseTimeInMinutes + (rule.offset || 0);
      const endTime = startTime + rule.duration;
      
      const daysToSchedule = weekdays.filter(day => {
          const isOccupied = occupiedSlots.some(slot =>
              slot.day === day && Math.max(startTime, slot.start) < Math.min(endTime, slot.end)
          );
          return !isOccupied;
      });

      if (daysToSchedule.length > 0) {
          addAndOccupy({
              activity: rule.title,
              startTime: formatTime(startTime),
              endTime: formatTime(endTime),
              days: daysToSchedule,
          }, 'essential_routine', details.suggestedAppCategory, details.emoji);
      }
  });

  return {
    schedule: finalSchedule,
  };
}


'use server';

import type { OnboardingFormValues } from '@/components/dashboard/onboarding/OnboardingForm';
import { predefinedMissionGroups } from '@/lib/predefined-missions';
import type { ScheduleItem, Weekday, MissionCategory } from '@/lib/types';

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

  // 2. ENCAIXAR ROTINAS ESSENCIAIS COM RESOLUÇÃO DE CONFLITOS
  const anchorTimes = {
    wakeUpTime: parseTime(input.wakeUpTime!),
    lunchTime: parseTime(input.lunchTime!),
    dinnerTime: parseTime(input.dinnerTime!),
    sleepTime: parseTime(input.sleepTime!),
  };

  const routineRules = [
    { title: 'Hora de acordar', anchor: 'wakeUpTime', offset: 0, duration: 10, days: weekdays },
    { title: 'Arrumar a cama', anchor: 'wakeUpTime', offset: 10, duration: 5, days: weekdays },
    { title: 'Tomar café da manhã', anchor: 'wakeUpTime', offset: 15, duration: 20, days: weekdays },
    { title: 'Escovar os dentes', anchor: 'wakeUpTime', offset: 35, duration: 5, days: weekdays, instanceId: 'after_wakeup' },
    
    { title: 'Almoçar', anchor: 'lunchTime', offset: 0, duration: 25, days: weekdays },
    { title: 'Escovar os dentes', anchor: 'lunchTime', offset: 25, duration: 5, days: weekdays, instanceId: 'after_lunch' },
    
    { title: 'Jantar', anchor: 'dinnerTime', offset: 0, duration: 25, days: weekdays },
    { title: 'Escovar os dentes', anchor: 'dinnerTime', offset: 25, duration: 5, days: weekdays, instanceId: 'after_dinner' },
    
    { title: 'Fazer a lição de casa', anchor: 'fixed', fixedTime: parseTime(input.schoolShift === 'afternoon' ? '09:00' : '18:30'), duration: 55, days: weekdays },
    { title: 'Tomar banho', anchor: 'sleepTime', offset: -45, duration: 15, days: weekdays },
    { title: 'Organizar a mochila para amanhã', anchor: 'sleepTime', offset: -25, duration: 5, days: weekdays },
    { title: 'Hora de dormir', anchor: 'sleepTime', offset: 0, duration: 20, days: weekdays },
  ];

  routineRules.forEach(rule => {
      if (!input.essentialRoutines?.includes(rule.title)) return;
      
      const details = findMissionDetails(rule.title);
      if (!details) return;

      let baseTimeInMinutes = rule.anchor === 'fixed' ? rule.fixedTime! : anchorTimes[rule.anchor as keyof typeof anchorTimes];
      
      let initialStartTime = baseTimeInMinutes + (rule.offset || 0);

      // --- Lógica de Resolução de Conflito ---
      const conflictingSlots = occupiedSlots.filter(slot =>
          rule.days.some(day => slot.day === day) && // Check if the rule applies to any of the slot's days
          Math.max(initialStartTime, slot.start) < Math.min(initialStartTime + rule.duration, slot.end)
      );

      if (conflictingSlots.length > 0) {
          // Encontra o horário de término mais tardio entre todos os conflitos
          const latestEndTime = Math.max(...conflictingSlots.map(slot => slot.end));
          // Reagenda para 20 minutos após o fim do último conflito
          initialStartTime = latestEndTime + 20; 
      }
      
      const finalStartTime = initialStartTime;
      const finalEndTime = finalStartTime + rule.duration;

      addAndOccupy({
          activity: rule.title,
          startTime: formatTime(finalStartTime),
          endTime: formatTime(finalEndTime),
          days: rule.days,
      }, 'essential_routine', details.suggestedAppCategory, details.emoji);
  });

  return {
    schedule: finalSchedule,
  };
}

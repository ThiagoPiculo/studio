
'use server';

import type { OnboardingFormValues } from '@/components/dashboard/onboarding/OnboardingForm';
import { predefinedMissionGroups } from '@/lib/predefined-missions';
import type { ScheduleItem, Weekday, MissionCategory } from '@/lib/types';
import { addMinutes, format } from 'date-fns';

// Helper para converter "HH:mm" para minutos desde o início do dia
const parseTime = (time: string | undefined): number => {
  if (!time || !time.includes(':')) return 0;
  const [hours, minutes] = time.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes)) return 0;
  return hours * 60 + minutes;
};

// Helper para converter minutos para "HH:mm"
const formatTime = (minutes: number): string => {
    if (isNaN(minutes)) return "00:00"; // Safeguard against NaN
    const totalMinutes = Math.round(minutes);
    const hours = Math.floor(totalMinutes / 60) % 24;
    const mins = totalMinutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

const findMissionDetails = (title: string) => {
  const predefined = predefinedMissionGroups.flatMap(g => g.items).find(i => i.title === title);
  if (predefined) {
      return {
          emoji: predefined.emoji,
          category: predefined.suggestedAppCategory,
      };
  }
  return {
    emoji: '✨', // Fallback emoji
    category: 'hobbies' as MissionCategory, // Fallback category
  };
};

const addAndOccupy = (
    activityName: string, 
    startTime: number, 
    duration: number, 
    occupiedSlots: any[], 
    schedule: ScheduleItem[], 
    days: Weekday[], 
    type: 'essential_routine' | 'extra_activity' | 'school_entry' | 'school_exit'
) => {
    const endTime = startTime + duration;
    const details = findMissionDetails(activityName);
    
    schedule.push({
        activity: activityName,
        startTime: formatTime(startTime),
        endTime: formatTime(endTime),
        days: days,
        type: type,
        emoji: details.emoji,
        category: details.category
    });

    days.forEach(day => {
        occupiedSlots.push({ day, start: startTime, end: endTime, activity: activityName });
    });
};


export async function generateSchedule(input: OnboardingFormValues): Promise<{ schedule: ScheduleItem[] }> {
    const finalSchedule: ScheduleItem[] = [];
    const occupiedSlots: { day: Weekday, start: number, end: number, activity: string }[] = [];

    // 1. Bloquear horários de atividades extras primeiro
    (input.extraActivities || []).forEach(activity => {
        if (activity.name && activity.days && activity.startTime && activity.endTime) {
            addAndOccupy(activity.name, parseTime(activity.startTime), parseTime(activity.endTime) - parseTime(activity.startTime), occupiedSlots, finalSchedule, activity.days as Weekday[], 'extra_activity');
        }
    });

    // 2. Mapear âncoras de horário
    const anchors = {
        wakeUp: parseTime(input.wakeUpTime),
        schoolStart: parseTime(input.schoolShiftStart),
        schoolEnd: parseTime(input.schoolShiftEnd),
        lunch: parseTime(input.lunchTime),
        dinner: parseTime(input.dinnerTime),
        sleep: parseTime(input.sleepTime),
    };
    
    // 3. Estrutura da rotina com base nas regras de negócio
    const routineRules = [
      { id: 'Hora de acordar', duration: 10, rule: (anchors: any) => anchors.wakeUp, days: ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'] },
      { id: 'Arrumar a cama', duration: 5, rule: (anchors: any, prevEnd: number) => anchors.wakeUp + 10, days: ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'] },
      { id: 'Tomar café da manhã', duration: 5, rule: (anchors: any, prevEnd: number) => anchors.wakeUp + 15, days: ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'] },
      { id: 'Escovar os dentes (após acordar)', duration: 5, rule: (anchors: any, prevEnd: number) => anchors.wakeUp + 20, days: ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'] },
      { id: 'Fazer a lição de casa', duration: 60, rule: (anchors: any, prevEnd: number) => anchors.wakeUp + 60, days: ['MO', 'TU', 'WE', 'TH', 'FR'] },
      { id: 'Organizar a mochila para amanhã', duration: 5, rule: (anchors: any, prevEnd: number) => parseTime(input.wakeUpTime) + 60 + 55, days: ['SU', 'MO', 'TU', 'WE', 'TH'] },
      { id: 'Hora livre para brincar', duration: 60, rule: (anchors: any, prevEnd: number) => parseTime(input.wakeUpTime) + 60 + 55 + 5, isFlexible: true, days: ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'] },
      { id: 'Tomar banho', duration: 15, rule: (anchors: any) => anchors.schoolStart - 60, days: ['MO', 'TU', 'WE', 'TH', 'FR'] },
      { id: 'Almoçar', duration: 20, rule: (anchors: any) => anchors.lunch, days: ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'] },
      { id: 'Escovar os dentes (após almoço)', duration: 5, rule: (anchors: any, prevEnd: number) => anchors.lunch + 20, days: ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'] },
      { id: 'Sair para escola', duration: 5, rule: (anchors: any) => anchors.schoolStart - 25, days: ['MO', 'TU', 'WE', 'TH', 'FR'] },
      { id: 'Início da Escola', duration: anchors.schoolEnd - anchors.schoolStart, rule: (anchors: any) => anchors.schoolStart, days: ['MO', 'TU', 'WE', 'TH', 'FR'], type: 'school_entry' },
      { id: 'Saída da Escola', duration: 0, rule: (anchors: any) => anchors.schoolEnd, days: ['MO', 'TU', 'WE', 'TH', 'FR'], type: 'school_exit' },
      { id: 'Jantar', duration: 15, rule: (anchors: any) => anchors.dinner, days: ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'] },
      { id: 'Escovar os dentes (após jantar)', duration: 5, rule: (anchors: any) => anchors.dinner + 15, days: ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'] },
      { id: 'Hora livre para brincar', duration: 60, rule: (anchors: any) => anchors.dinner + 20, isFlexible: true, days: ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'] },
      { id: 'Hora livre para brincar', duration: 60, rule: (anchors: any) => anchors.dinner + 20 + 60, isFlexible: true, days: ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'] },
      { id: 'Hora livre para brincar', duration: 60, rule: (anchors: any) => anchors.dinner + 20 + 120, isFlexible: true, days: ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'] },
      { id: 'Tomar banho', duration: 20, rule: (anchors: any) => anchors.sleep - 20, days: ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'] },
      { id: 'Hora de dormir', duration: 0, rule: (anchors: any) => anchors.sleep, days: ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'] },
    ];
    
    let lastEndTime = 0;

    for (const rule of routineRules) {
      if (!input.essentialRoutines?.includes(rule.id) && rule.type !== 'school_entry' && rule.type !== 'school_exit') continue;
      
      let startTime = rule.rule(anchors, lastEndTime);
      
      let conflict = true;
      while(conflict) {
          conflict = false;
          const endTime = startTime + rule.duration;
          for (const day of rule.days) {
              for (const slot of occupiedSlots) {
                  if (slot.day === day && Math.max(startTime, slot.start) < Math.min(endTime, slot.end)) {
                      conflict = true;
                      if (rule.isFlexible) {
                          startTime = slot.end + 1; // Re-schedule flexible task
                      } else {
                          // For non-flexible, it will be added anyway, creating an overlap to be handled by UI
                      }
                      break;
                  }
              }
              if (conflict) break;
          }
      }
      
      const type = rule.type || 'essential_routine';
      addAndOccupy(rule.id, startTime, rule.duration, occupiedSlots, finalSchedule, rule.days, type);
      lastEndTime = startTime + rule.duration;
    }
    
    const uniqueSchedule = Array.from(new Map(finalSchedule.map(item => [item.activity + item.startTime, item])).values());
    
    return {
        schedule: uniqueSchedule.sort((a,b) => parseTime(a.startTime!) - parseTime(b.startTime!)),
    };
}



'use server';

import type { OnboardingFormValues } from '@/components/dashboard/onboarding/OnboardingForm';
import { predefinedMissionGroups } from '@/lib/predefined-missions';
import type { ScheduleItem, Weekday, MissionCategory } from '@/lib/types';

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
    
    const routineRules = [
        { id: 'Hora de acordar', duration: 10, rule: (anchors: any, prevEnd: number) => anchors.wakeUp, days: ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'] as Weekday[] },
        { id: 'Arrumar a cama', duration: 10, rule: (anchors: any, prevEnd: number) => anchors.wakeUp + 10, days: ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'] as Weekday[] },
        { id: 'Tomar café da manhã', duration: 5, rule: (anchors: any, prevEnd: number) => anchors.wakeUp + 15, days: ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'] as Weekday[] },
        { id: 'Escovar os dentes (após acordar)', duration: 5, rule: (anchors: any, prevEnd: number) => anchors.wakeUp + 20, days: ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'] as Weekday[] },
        { id: 'Fazer a lição de casa', duration: 55, rule: (anchors: any, prevEnd: number) => anchors.wakeUp + 60, days: ['MO', 'TU', 'WE', 'TH', 'FR'] as Weekday[] },
        { id: 'Organizar a mochila para amanhã', duration: 5, rule: (anchors: any, prevEnd: number) => anchors.wakeUp + 60 + 55, days: ['SU', 'MO', 'TU', 'WE', 'TH'] as Weekday[] },
        { id: 'Hora livre para brincar', duration: 60, rule: (anchors: any, prevEnd: number) => anchors.wakeUp + 120, isFlexible: true, days: ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'] as Weekday[] },
        { id: 'Tomar banho', duration: 15, rule: (anchors: any, prevEnd: number) => anchors.schoolStart - 60, days: ['MO', 'TU', 'WE', 'TH', 'FR'] as Weekday[] },
        { id: 'Almoçar', duration: 20, rule: (anchors: any, prevEnd: number) => anchors.lunch, days: ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'] as Weekday[] },
        { id: 'Escovar os dentes (após almoço)', duration: 5, rule: (anchors: any, prevEnd: number) => anchors.lunch + 20, days: ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'] as Weekday[] },
        { id: 'Sair para escola', duration: 5, rule: (anchors: any) => anchors.schoolStart - 20, days: ['MO', 'TU', 'WE', 'TH', 'FR'] as Weekday[] },
        { id: 'Início da Escola', duration: anchors.schoolEnd - anchors.schoolStart, rule: (anchors: any, prevEnd: number) => anchors.schoolStart, days: ['MO', 'TU', 'WE', 'TH', 'FR'] as Weekday[], type: 'school_entry' },
        { id: 'Saída da Escola', duration: 0, rule: (anchors: any, prevEnd: number) => anchors.schoolEnd, days: ['MO', 'TU', 'WE', 'TH', 'FR'] as Weekday[], type: 'school_exit' },
        { id: 'Jantar', duration: 20, rule: (anchors: any, prevEnd: number) => anchors.dinner, isFlexible: true, days: ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'] as Weekday[] },
        { id: 'Escovar os dentes (após jantar)', duration: 5, rule: (anchors: any, prevEnd: number) => anchors.dinner + 20, days: ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'] as Weekday[] },
        { id: 'Hora livre para brincar', duration: 60, rule: (anchors: any, prevEnd: number) => prevEnd, isFlexible: true, days: ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'] as Weekday[] },
        { id: 'Hora livre para brincar', duration: 60, rule: (anchors: any, prevEnd: number) => prevEnd, isFlexible: true, days: ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'] as Weekday[] },
        { id: 'Hora livre para brincar', duration: 60, rule: (anchors: any, prevEnd: number) => prevEnd, isFlexible: true, days: ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'] as Weekday[] },
        { id: 'Tomar banho', duration: 20, rule: (anchors: any, prevEnd: number) => anchors.sleep - 20, isFlexible: true, days: ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'] as Weekday[] },
        { id: 'Hora de dormir', duration: 0, rule: (anchors: any, prevEnd: number) => anchors.sleep, days: ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'] as Weekday[] },
    ];
    
    let lastEndTime = 0;

    for (const rule of routineRules) {
      if (rule.type === 'school_entry' && input.schoolShift === 'not_applicable') continue;
      if (rule.type === 'school_exit' && input.schoolShift === 'not_applicable') continue;
      if (!input.essentialRoutines?.includes(rule.id) && rule.type !== 'school_entry' && rule.type !== 'school_exit') continue;
      
      let startTime = rule.rule(anchors, lastEndTime);
      
      let conflict = true;
      let iterations = 0;
      const MAX_ITERATIONS = 100; // safety break

      while(conflict && iterations < MAX_ITERATIONS) {
          conflict = false;
          iterations++;
          const endTime = startTime + rule.duration;

          for (const day of rule.days) {
              for (const slot of occupiedSlots) {
                  if (slot.day === day && Math.max(startTime, slot.start) < Math.min(endTime, slot.end)) {
                      conflict = true;
                      if (rule.isFlexible) {
                          startTime = slot.end + 20; 
                      }
                      break;
                  }
              }
              if (conflict) break; 
          }
           if (!rule.isFlexible && conflict) break;
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

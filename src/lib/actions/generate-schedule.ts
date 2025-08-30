
'use server';

import type { OnboardingFormValues } from '@/components/dashboard/onboarding/OnboardingForm';
import { predefinedMissionGroups } from '@/lib/predefined-missions';
import type { ScheduleItem, Weekday, MissionCategory } from '@/lib/types';
import { subMinutes, addMinutes } from 'date-fns';

// Helper para converter "HH:mm" para minutos desde o início do dia
const parseTime = (time: string): number => {
  if (!time || !time.includes(':')) return 0;
  const [hours, minutes] = time.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes)) return 0;
  return hours * 60 + minutes;
};

// Helper para converter minutos para "HH:mm"
const formatTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60) % 24;
    const mins = (minutes % 60);
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

const findMissionDetails = (title: string) => {
  // First, check predefined missions
  const predefined = predefinedMissionGroups.flatMap(g => g.items).find(i => i.title === title);
  if (predefined) return predefined;

  // If not found, it's a custom activity, so return a default structure
  return {
    title: title,
    emoji: '✨', // Default emoji for custom activities
    suggestedAppCategory: 'hobbies' as MissionCategory, // Default category
  };
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
  // Esta etapa é crucial. Todas as atividades com horários definidos pelo usuário são tratadas primeiro.
  if (input.schoolShift !== 'not_applicable' && input.schoolShiftStart && input.schoolShiftEnd) {
    addAndOccupy({ activity: 'Escola', startTime: input.schoolShiftStart, endTime: input.schoolShiftEnd, days: weekdays }, 'school_entry', 'school', '🏫');
  }

  // Processa TODAS as atividades extras (pré-definidas e personalizadas) da mesma forma.
  (input.extraActivities || []).forEach(activity => {
      const details = findMissionDetails(activity.name);
      if (details) { // `findMissionDetails` sempre retornará um objeto para atividades personalizadas
        addAndOccupy({
          activity: activity.name,
          startTime: activity.startTime,
          endTime: activity.endTime,
          days: activity.days as Weekday[],
        }, 'extra_activity', details.suggestedAppCategory, details.emoji || '✨');
      }
    });

  // 2. Definir Âncoras e Regras de Negócio
    const schoolStartTime = parseTime(input.schoolShiftStart!);
    const anchors = {
        'Hora de acordar': schoolStartTime - (5 * 60), // 5 horas antes
        'Almoçar': schoolStartTime - 45, // 45 min antes
        'Jantar': parseTime(input.dinnerTime!), // Do formulário
        'Hora de dormir': parseTime(input.sleepTime!), // Do formulário
    };

    const routineRules = [
        { title: 'Hora de acordar', duration: 10, dependsOn: 'Hora de acordar', offset: 0 },
        { title: 'Arrumar a cama', duration: 5, dependsOn: 'Hora de acordar', offset: 10 },
        { title: 'Tomar café da manhã', duration: 15, dependsOn: 'Hora de acordar', offset: 15 },
        { title: 'Escovar os dentes', instanceId: 'after_wakeup', duration: 5, dependsOn: 'Tomar café da manhã', offset: 15 }, // 15min após o *início* do café
        { title: 'Fazer a lição de casa', duration: 55, dependsOn: 'Hora de acordar', offset: 60 },
        { title: 'Organizar a mochila para amanhã', duration: 5, dependsOn: 'Fazer a lição de casa', offset: 55 },
        { title: 'Hora livre para brincar', duration: 60, dependsOn: 'Organizar a mochila para amanhã', offset: 5 }, // Encaixado
        { title: 'Tomar banho', instanceId: 'before_school', duration: 15, dependsOn: 'Almoçar', offset: -75 }, // 1h15 antes do almoço
        { title: 'Almoçar', duration: 20, dependsOn: 'Almoçar', offset: 0 },
        { title: 'Escovar os dentes', instanceId: 'after_lunch', duration: 5, dependsOn: 'Almoçar', offset: 20 },
        { title: 'Sair para escola', duration: 20, dependsOn: 'Almoçar', offset: 25 }, // 25min após almoço
        { title: 'Jantar', duration: 25, dependsOn: 'Jantar', offset: 0 },
        { title: 'Escovar os dentes', instanceId: 'after_dinner', duration: 15, dependsOn: 'Jantar', offset: 15 },
        { title: 'Tomar banho', instanceId: 'before_sleep', duration: 20, dependsOn: 'Hora de dormir', offset: -20 },
        { title: 'Hora de dormir', duration: 20, dependsOn: 'Hora de dormir', offset: 0 },
    ];
    
  // 3. Processar e agendar tarefas essenciais
    const calculatedTimes: Record<string, { start: number, end: number }> = {};

    routineRules.forEach(rule => {
        const details = findMissionDetails(rule.title);
        if (!details) return;

        let startTime: number;
        if (rule.dependsOn in anchors) {
            startTime = anchors[rule.dependsOn as keyof typeof anchors] + rule.offset;
        } else if (rule.dependsOn in calculatedTimes) {
            startTime = calculatedTimes[rule.dependsOn].start + rule.offset;
        } else {
            return; 
        }

        let endTime = startTime + rule.duration;
        
        // Resolução de conflito
        const checkConflict = (start: number, end: number): {conflicting: boolean, newStart: number} => {
            for (const slot of occupiedSlots) {
                 if (Math.max(start, slot.start) < Math.min(end, slot.end)) {
                    return { conflicting: true, newStart: slot.end + 20 };
                 }
            }
            return { conflicting: false, newStart: start };
        };

        let result = checkConflict(startTime, endTime);
        while(result.conflicting) {
            startTime = result.newStart;
            endTime = startTime + rule.duration;
            result = checkConflict(startTime, endTime);
        }

        calculatedTimes[rule.title] = { start: startTime, end: endTime };

        addAndOccupy({
            activity: rule.title,
            startTime: formatTime(startTime),
            endTime: formatTime(endTime),
            days: weekdays,
        }, 'essential_routine', details.suggestedAppCategory, details.emoji);
    });

  return {
    schedule: finalSchedule,
  };
}

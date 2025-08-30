
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
        }, 'extra_activity', details.suggestedAppCategory, details.emoji || '✨');
      }
    });

  // 2. Definir Âncoras e Regras de Negócio
    const anchors = {
        'Hora de acordar': parseTime(input.wakeUpTime!),
        'Almoçar': parseTime(input.lunchTime!),
        'Jantar': parseTime(input.dinnerTime!),
        'Hora de dormir': parseTime(input.sleepTime!),
    };

    const routineRules = [
        { title: 'Hora de acordar', duration: 10, dependsOn: 'Hora de acordar', offset: 0 },
        { title: 'Arrumar a cama', duration: 5, dependsOn: 'Hora de acordar', offset: 10 },
        { title: 'Tomar café da manhã', duration: 20, dependsOn: 'Arrumar a cama', offset: 5 },
        { title: 'Escovar os dentes', duration: 5, dependsOn: 'Tomar café da manhã', offset: 20 },
        { title: 'Sair para escola', duration: 10, dependsOn: 'Escovar os dentes', offset: 5 },
        { title: 'Almoçar', duration: 20, dependsOn: 'Almoçar', offset: 0 },
        { title: 'Escovar os dentes', duration: 5, dependsOn: 'Almoçar', offset: 20 },
        { title: 'Fazer a lição de casa', duration: 50, dependsOn: 'Almoçar', offset: 45 },
        { title: 'Hora livre para brincar', duration: 60, dependsOn: 'Fazer a lição de casa', offset: 50 },
        { title: 'Tomar banho', duration: 15, dependsOn: 'Jantar', offset: -30 },
        { title: 'Jantar', duration: 20, dependsOn: 'Jantar', offset: 0 },
        { title: 'Escovar os dentes', duration: 5, dependsOn: 'Jantar', offset: 20 },
        { title: 'Hora de dormir', duration: 20, dependsOn: 'Hora de dormir', offset: 0 },
    ];
    
  // 3. Processar e agendar tarefas essenciais
    const calculatedTimes: Record<string, { start: number, end: number }> = {};

    routineRules.forEach(rule => {
        // Apenas processa as tarefas que foram selecionadas pelo usuário
        if (!input.essentialRoutines?.includes(rule.title)) {
            return;
        }

        const details = findMissionDetails(rule.title);
        if (!details) return;

        let startTime: number;
        if (rule.dependsOn in anchors) {
            startTime = anchors[rule.dependsOn as keyof typeof anchors] + rule.offset;
        } else if (rule.dependsOn in calculatedTimes) {
            // Se depender de outra tarefa, o offset é a partir do *fim* da tarefa anterior
            startTime = calculatedTimes[rule.dependsOn].end + rule.offset;
        } else {
            return; 
        }

        let endTime = startTime + rule.duration;
        
        // Resolução de conflito
        const checkConflict = (start: number, end: number, day: Weekday): {conflicting: boolean, newStart: number} => {
            for (const slot of occupiedSlots) {
                 if (slot.day === day && Math.max(start, slot.start) < Math.min(end, slot.end)) {
                    return { conflicting: true, newStart: slot.end + 20 };
                 }
            }
            return { conflicting: false, newStart: start };
        };

        // Para tarefas que acontecem todos os dias da semana
        weekdays.forEach(day => {
            let dailyStartTime = startTime;
            let dailyEndTime = endTime;

            let result = checkConflict(dailyStartTime, dailyEndTime, day);
            while(result.conflicting) {
                dailyStartTime = result.newStart;
                dailyEndTime = dailyStartTime + rule.duration;
                result = checkConflict(dailyStartTime, dailyEndTime, day);
            }
            
             addAndOccupy({
                activity: rule.title,
                startTime: formatTime(dailyStartTime),
                endTime: formatTime(dailyEndTime),
                days: [day],
            }, 'essential_routine', details.suggestedAppCategory, details.emoji);
        });

        // Salva o tempo *calculado* (após possível resolução de conflito no primeiro dia)
        // para a próxima tarefa que depender desta.
        calculatedTimes[rule.title] = { start: startTime, end: endTime };
    });

  return {
    schedule: finalSchedule,
  };
}


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
    // Apenas adiciona à agenda se tiver duração
    if (duration > 0 || type === 'school_entry' || type === 'school_exit') {
        const endTime = startTime + duration;
        const details = findMissionDetails(activityName);
        
        const emoji = 
            activityName === 'Início da Escola' ? '📒' : 
            activityName === 'Saída da Escola' ? '🏡' : 
            details.emoji;

        schedule.push({
            activity: activityName,
            startTime: formatTime(startTime),
            endTime: formatTime(endTime),
            days: days,
            type: type,
            emoji: emoji,
            category: details.category
        });

        days.forEach(day => {
            occupiedSlots.push({ day, start: startTime, end: endTime, activity: activityName });
        });
    }
};

const routineRules = [
    // --- Bloco da Manhã (Sequencial) ---
    { id: 'Hora de acordar', duration: 10, rule: (anchors: any, prevEnd: number) => anchors.wakeUp, days: ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'] as Weekday[] },
    { id: 'Arrumar a cama', duration: 5, rule: (anchors: any, prevEnd: number) => prevEnd, days: ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'] as Weekday[] },
    { id: 'Tomar café da manhã', duration: 20, rule: (anchors: any, prevEnd: number) => prevEnd, days: ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'] as Weekday[] },
    { id: 'Escovar os dentes (após acordar)', duration: 5, rule: (anchors: any, prevEnd: number) => prevEnd, days: ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'] as Weekday[] },

    // --- Bloco de Estudo (Manhã) ---
    { id: 'Fazer a lição de casa', duration: 55, rule: (anchors: any, prevEnd: number) => prevEnd, days: ['MO', 'TU', 'WE', 'TH', 'FR'] as Weekday[] },
    { id: 'Organizar a mochila para amanhã', duration: 5, rule: (anchors: any, prevEnd: number) => prevEnd, days: ['SU', 'MO', 'TU', 'WE', 'TH'] as Weekday[] },
    
    // --- Bloco Pré-Escola (Sequencial reverso a partir da âncora do almoço) ---
    { id: 'Almoçar', duration: 20, rule: (anchors: any, prevEnd: number) => anchors.lunch, days: ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'] as Weekday[] },
    { id: 'Escovar os dentes (após almoço)', duration: 5, rule: (anchors: any, prevEnd: number) => anchors.lunch + 20, days: ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'] as Weekday[] },
    
    // --- Âncoras da Escola (não são tarefas, mas definem o bloco) ---
    { id: 'Início da Escola', duration: 0, rule: (anchors: any, prevEnd: number) => anchors.schoolStart, days: ['MO', 'TU', 'WE', 'TH', 'FR'] as Weekday[], type: 'school_entry' },
    { id: 'Saída da Escola', duration: 0, rule: (anchors: any, prevEnd: number) => anchors.schoolEnd, days: ['MO', 'TU', 'WE', 'TH', 'FR'] as Weekday[], type: 'school_exit' },

    // --- Bloco da Noite ---
    { id: 'Jantar', duration: 20, rule: (anchors: any, prevEnd: number) => anchors.dinner, days: ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'] as Weekday[] },
    { id: 'Escovar os dentes (após jantar)', duration: 5, rule: (anchors: any, prevEnd: number) => anchors.dinner + 20, days: ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'] as Weekday[] },
    { id: 'Tomar banho', duration: 20, rule: (anchors: any, prevEnd: number) => anchors.sleep - 20, days: ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'] as Weekday[] },
    { id: 'Hora de dormir', duration: 0, rule: (anchors: any, prevEnd: number) => anchors.sleep, days: ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'] as Weekday[] },
];

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
    
    const userRoutines = new Set(input.essentialRoutines);
    
    // Objeto para rastrear o final da última tarefa de cada dia
    const lastEndTimeByDay: Record<string, number> = {};

    for (const rule of routineRules) {
        if (!userRoutines.has(rule.id)) continue;

        // Pular regras relacionadas à escola se não aplicável
        const isSchoolRule = ['Início da Escola', 'Saída da Escola'].includes(rule.id);
        if (isSchoolRule && input.schoolShift === 'not_applicable') continue;
        
        rule.days.forEach(day => {
            // Se a regra não usa `prevEnd`, ela reinicia a contagem a partir de sua âncora.
            // Se usa `prevEnd`, continua de onde a última tarefa do dia parou.
            const prevEndForDay = lastEndTimeByDay[day] || anchors.wakeUp;
            let startTime = rule.rule(anchors, prevEndForDay);
            
            // Simples verificação de conflito para não agendar sobre atividades fixas.
            const endTime = startTime + rule.duration;
            let hasConflict = false;
            for(const slot of occupiedSlots) {
                if(slot.day === day && Math.max(startTime, slot.start) < Math.min(endTime, slot.end)) {
                    hasConflict = true;
                    // Se houver conflito, tentamos encaixar a tarefa depois
                    startTime = slot.end;
                }
            }

            // Ação principal: Adicionar a tarefa à agenda
            const type = (rule as any).type || 'essential_routine';
            addAndOccupy(rule.id, startTime, rule.duration, occupiedSlots, finalSchedule, [day], type);
            
            // Atualiza o horário de término para a próxima tarefa sequencial neste dia
            if(rule.duration > 0) {
               lastEndTimeByDay[day] = startTime + rule.duration;
            }
        });
    }
    
    // Remover duplicatas que podem surgir da lógica simplificada
    const uniqueSchedule = Array.from(new Map(finalSchedule.map(item => [item.activity + item.startTime + item.days.join(), item])).values());
    
    return {
        schedule: uniqueSchedule.sort((a,b) => parseTime(a.startTime!) - parseTime(b.startTime!)),
    };
}

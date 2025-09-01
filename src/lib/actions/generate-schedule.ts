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
            activityName === 'Início da Escola' ? '🏫' : 
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
    // --- Bloco da Manhã (Sequencial a partir do acordar) ---
    { id: 'Hora de acordar', duration: 10, rule: (anchors: any, prevEnd: number) => anchors.wakeUp, days: ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'] as Weekday[] },
    { id: 'Arrumar a cama', duration: 5, rule: (anchors: any, prevEnd: number) => prevEnd, days: ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'] as Weekday[] },
    { id: 'Tomar café da manhã', duration: 20, rule: (anchors: any, prevEnd: number) => prevEnd, days: ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'] as Weekday[] },
    { id: 'Escovar os dentes (após acordar)', duration: 5, rule: (anchors: any, prevEnd: number) => prevEnd, days: ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'] as Weekday[] },
    
    // --- Bloco de Estudo (manhã para quem estuda a tarde) ---
    { id: 'Fazer a lição de casa', duration: 55, rule: (anchors: any, prevEnd: number) => prevEnd, days: ['MO', 'TU', 'WE', 'TH', 'FR'] as Weekday[] },
    { id: 'Organizar a mochila para amanhã', duration: 5, rule: (anchors: any, prevEnd: number) => prevEnd, days: ['SU', 'MO', 'TU', 'WE', 'TH'] as Weekday[] },

    // --- Bloco Pré-Escola (Baseado em âncoras) ---
    { id: 'Almoçar', duration: 20, rule: (anchors: any) => anchors.lunch, days: ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'] as Weekday[] },
    { id: 'Escovar os dentes (após almoço)', duration: 5, rule: (anchors: any) => anchors.lunch + 20, days: ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'] as Weekday[] },
    { id: 'Sair para escola', duration: 5, rule: (anchors: any) => anchors.schoolStart - 20, days: ['MO', 'TU', 'WE', 'TH', 'FR'] as Weekday[] },

    // --- Âncoras da Escola (Definem o bloco escolar) ---
    { id: 'Início da Escola', duration: 0, rule: (anchors: any) => anchors.schoolStart, days: ['MO', 'TU', 'WE', 'TH', 'FR'] as Weekday[], type: 'school_entry' },
    { id: 'Saída da Escola', duration: 0, rule: (anchors: any) => anchors.schoolEnd, days: ['MO', 'TU', 'WE', 'TH', 'FR'] as Weekday[], type: 'school_exit' },

    // --- Bloco da Noite (Baseado em âncoras) ---
    { id: 'Jantar', duration: 20, rule: (anchors: any) => anchors.dinner, days: ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'] as Weekday[] },
    { id: 'Escovar os dentes (após jantar)', duration: 5, rule: (anchors: any) => anchors.dinner + 20, days: ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'] as Weekday[] },
    { id: 'Tomar banho', duration: 20, rule: (anchors: any) => anchors.sleep - 20, days: ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'] as Weekday[] },
    { id: 'Hora de dormir', duration: 0, rule: (anchors: any) => anchors.sleep, days: ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'] as Weekday[] },
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
        schoolEnd: parseTime(input.schoolShiftEnd), // Corrigido para schoolEnd
        lunch: parseTime(input.lunchTime),
        dinner: parseTime(input.dinnerTime),
        sleep: parseTime(input.sleepTime),
    };
    
    // 3. Processar as regras de rotina
    const userRoutines = new Set(input.essentialRoutines);

    let lastEndTimeByDay: Record<Weekday, number> = { MO: anchors.wakeUp, TU: anchors.wakeUp, WE: anchors.wakeUp, TH: anchors.wakeUp, FR: anchors.wakeUp, SA: anchors.wakeUp, SU: anchors.wakeUp };

    for (const rule of routineRules) {
        if (!userRoutines.has(rule.id)) continue;

        // Lógica para pular tarefas escolares se não aplicável
        const isSchoolRelated = ['Início da Escola', 'Saída da Escola', 'Sair para escola', 'Tomar banho'].some(s => rule.id.includes(s) && rule.rule.toString().includes('schoolStart'));
        if (isSchoolRelated && input.schoolShift === 'not_applicable') continue;

        const ruleDays = rule.days;
        let commonStartTime = -1;

        // Se a regra é baseada em uma âncora, o horário de início é fixo.
        if (rule.rule.toString().includes('anchors.')) {
            commonStartTime = rule.rule(anchors, 0); 
        }

        ruleDays.forEach(day => {
            let startTime = (commonStartTime !== -1) ? commonStartTime : lastEndTimeByDay[day];
            let endTime = startTime + rule.duration;
            
            // Simplificação: Por enquanto, vamos assumir que não há conflitos com as regras essenciais.
            // A lógica de verificação de conflitos pode ser reintroduzida se necessário, mas de forma mais robusta.
            
            const type = (rule as any).type || 'essential_routine';
            addAndOccupy(rule.id, startTime, rule.duration, occupiedSlots, finalSchedule, [day], type);
            
            // Se a tarefa é sequencial, atualiza o 'último horário' para o dia correspondente.
            if (commonStartTime === -1) { 
                lastEndTimeByDay[day] = endTime;
            }
        });
    }
    
    // Remover duplicatas antes de retornar
    const uniqueSchedule = Array.from(new Map(finalSchedule.map(item => [item.activity + item.startTime + item.days.join(), item])).values());
    
    return {
        schedule: uniqueSchedule.sort((a,b) => parseTime(a.startTime!) - parseTime(b.startTime!)),
    };
}

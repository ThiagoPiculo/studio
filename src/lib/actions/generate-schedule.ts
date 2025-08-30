
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

export async function generateSchedule(input: OnboardingFormValues): Promise<{ schedule: ScheduleItem[] }> {
    const finalSchedule: ScheduleItem[] = [];
    const occupiedSlots: { day: Weekday, start: number, end: number, activity: string }[] = [];

    // 1. Bloquear horários de atividades extras primeiro
    (input.extraActivities || []).forEach(activity => {
        if (activity.name && activity.days && activity.startTime && activity.endTime) {
            const startMins = parseTime(activity.startTime);
            const endMins = parseTime(activity.endTime);
            if (endMins > startMins) {
                 activity.days.forEach(day => {
                    occupiedSlots.push({ day: day as Weekday, start: startMins, end: endMins, activity: activity.name });
                 });
                 // Adicionar ao schedule final imediatamente, pois são fixos
                 const details = findMissionDetails(activity.name);
                 finalSchedule.push({
                     activity: activity.name,
                     startTime: activity.startTime,
                     endTime: activity.endTime,
                     days: activity.days as Weekday[],
                     type: 'extra_activity',
                     emoji: details.emoji,
                     category: details.category
                 });
            }
        }
    });

    // 2. Mapear âncoras de horário
    const anchors = {
        wakeUp: parseTime(input.wakeUpTime),
        schoolStart: parseTime(input.schoolShiftStart),
        lunch: parseTime(input.lunchTime),
        dinner: parseTime(input.dinnerTime),
        sleep: parseTime(input.sleepTime),
    };

    // 3. Estrutura da rotina com base nas regras de negócio fornecidas
    const routineRules = [
        { id: 'acordar', mission: 'Hora de acordar', duration: 10, rule: (anchors: any, prev: any) => anchors.wakeUp },
        { id: 'arrumarCama', mission: 'Arrumar a cama', duration: 5, rule: (anchors: any, prev: any) => prev.acordar.start + 10 },
        { id: 'cafe', mission: 'Tomar café da manhã', duration: 5, rule: (anchors: any, prev: any) => prev.arrumarCama.start + 5 },
        { id: 'escovarDentesManha', mission: 'Escovar os dentes (após acordar)', duration: 5, rule: (anchors: any, prev: any) => prev.cafe.start + 5 },
        { id: 'licaoCasa', mission: 'Fazer a lição de casa', duration: 60, rule: (anchors: any, prev: any) => prev.escovarDentesManha.start + 40 },
        { id: 'organizarMochila', mission: 'Organizar a mochila para amanhã', duration: 5, rule: (anchors: any, prev: any) => prev.licaoCasa.start + 60 },
        { id: 'brincar1', mission: 'Hora livre para brincar', duration: 60, rule: (anchors: any, prev: any) => prev.organizarMochila.start + 10 },
        { id: 'banhoPreEscola', mission: 'Tomar banho', duration: 15, rule: (anchors: any, prev: any) => anchors.schoolStart - 60 },
        { id: 'almocar', mission: 'Almoçar', duration: 20, rule: (anchors: any, prev: any) => anchors.lunch },
        { id: 'escovarDentesAlmoco', mission: 'Escovar os dentes (após almoço)', duration: 5, rule: (anchors: any, prev: any) => prev.almocar.start + 20 },
        { id: 'sairEscola', mission: 'Sair para escola', duration: 5, rule: (anchors: any, prev: any) => anchors.schoolStart - 20 },
        { id: 'escola', mission: 'Escola', duration: (anchors.schoolEnd - anchors.schoolStart), rule: (anchors: any, prev: any) => anchors.schoolStart, isSchool: true },
        { id: 'jantar', mission: 'Jantar', duration: 15, rule: (anchors: any, prev: any) => anchors.dinner },
        { id: 'escovarDentesJantar', mission: 'Escovar os dentes (após jantar)', duration: 5, rule: (anchors: any, prev: any) => prev.jantar.start + 15 },
        { id: 'brincar2', mission: 'Hora livre para brincar', duration: 60, rule: (anchors: any, prev: any) => prev.escovarDentesJantar.start + 5 },
        { id: 'brincar3', mission: 'Hora livre para brincar', duration: 60, rule: (anchors: any, prev: any) => prev.brincar2.start + 60 },
        { id: 'brincar4', mission: 'Hora livre para brincar', duration: 60, rule: (anchors: any, prev: any) => prev.brincar3.start + 60 },
        { id: 'banhoNoite', mission: 'Tomar banho', duration: 20, rule: (anchors: any, prev: any) => anchors.sleep - 20 },
        { id: 'dormir', mission: 'Hora de dormir', duration: 0, rule: (anchors: any, prev: any) => anchors.sleep }
    ];

    const scheduledTimes: Record<string, { start: number, end: number }> = {};
    const allDays: Weekday[] = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];
    const weekdays: Weekday[] = ['MO', 'TU', 'WE', 'TH', 'FR'];

    for (const rule of routineRules) {
        if (!input.essentialRoutines?.includes(rule.mission) && !rule.isSchool) continue;
        
        let calculatedStartTime = rule.rule(anchors, scheduledTimes);
        
        // Verificação de conflito e reagendamento
        let conflict = false;
        do {
            conflict = false;
            let endTime = calculatedStartTime + rule.duration;
            for (const slot of occupiedSlots) {
                // A verificação de conflito só se aplica se a tarefa cair no mesmo dia que a atividade extra.
                // Como as tarefas essenciais são para todos os dias, a verificação é relevante.
                if (Math.max(calculatedStartTime, slot.start) < Math.min(endTime, slot.end)) {
                    conflict = true;
                    const isFlexible = rule.mission.includes('livre para brincar');
                    // Se for flexível ou essencial, tenta reagendar para depois do conflito.
                    if (isFlexible || ['Jantar', 'Tomar banho'].includes(rule.mission)) {
                        calculatedStartTime = slot.end + 1; // Adiciona 1 min de buffer
                    } else {
                        // Se não for flexível (ex: "Arrumar a cama"), mantém o horário original e apenas loga o conflito.
                        // O ideal seria ter uma estratégia mais robusta, mas por enquanto isso evita um loop infinito.
                        console.warn(`Conflito fixo detectado para "${rule.mission}" com "${slot.activity}".`);
                        conflict = false; // Força a saída do loop para evitar problemas.
                    }
                    break; 
                }
            }
        } while (conflict);
        
        scheduledTimes[rule.id] = { start: calculatedStartTime, end: calculatedStartTime + rule.duration };

        // Adiciona a tarefa ao schedule final
        const details = findMissionDetails(rule.mission);
        const itemDays = rule.isSchool ? weekdays : allDays;

        if (rule.mission === 'Escola') {
            finalSchedule.push({ activity: "Início da Escola", startTime: formatTime(rule.rule(anchors, {})), endTime: formatTime(rule.rule(anchors, {})), days: weekdays, type: 'school_entry', emoji: '📒', category: 'school' });
            finalSchedule.push({ activity: "Saída da Escola", startTime: formatTime(anchors.schoolEnd), endTime: formatTime(anchors.schoolEnd), days: weekdays, type: 'school_exit', emoji: '📒', category: 'school' });
        } else {
             finalSchedule.push({
                activity: rule.mission,
                startTime: formatTime(calculatedStartTime),
                endTime: formatTime(calculatedStartTime + rule.duration),
                days: itemDays,
                type: 'essential_routine',
                emoji: details.emoji,
                category: details.category
            });
        }
    }
    
    // Remove duplicatas e ordena
    const uniqueSchedule = Array.from(new Map(finalSchedule.map(item => [item.activity + item.startTime, item])).values());
    
    return {
        schedule: uniqueSchedule.sort((a,b) => parseTime(a.startTime!) - parseTime(b.startTime!)),
    };
}

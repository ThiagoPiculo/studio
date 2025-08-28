'use server';

import { generateScheduleFlow, type GenerateScheduleInput, type GenerateScheduleOutput } from '@/ai/flows/generate-schedule-flow';
import { predefinedMissionGroups } from '@/lib/predefined-missions';
import type { ScheduleItem } from '@/lib/types';


// Função para encontrar a missão pré-definida mais próxima
const findClosestPredefinedMission = (activityTitle: string): { title: string, emoji: string, suggestedAppCategory: string } | null => {
    const allMissions = predefinedMissionGroups.flatMap(group => group.items);
    const normalizedTitle = activityTitle.trim().toLowerCase();

    // Busca exata primeiro
    const exactMatch = allMissions.find(mission => mission.title.toLowerCase() === normalizedTitle);
    if (exactMatch) return exactMatch;

    // Busca por inclusão (se a atividade da IA contém o nome da missão)
    const containsMatch = allMissions.find(mission => normalizedTitle.includes(mission.title.toLowerCase()));
    if (containsMatch) return containsMatch;

    return null;
};


export async function generateSchedule(input: GenerateScheduleInput): Promise<GenerateScheduleOutput> {
    
    const aiOutput = await generateScheduleFlow(input);

    // Pós-processamento para mapear e corrigir os dados da IA
    const processedSchedule: ScheduleItem[] = aiOutput.schedule.map(itemFromAI => {
        const predefined = findClosestPredefinedMission(itemFromAI.activity);

        if (predefined) {
            // Se encontrou uma missão correspondente, usa os dados do nosso catálogo
            return {
                ...itemFromAI,
                activity: predefined.title, // Usa o nome exato do nosso catálogo
                emoji: predefined.emoji,
                category: predefined.suggestedAppCategory as any,
            };
        } else {
            // Se não encontrou, mantém o que a IA sugeriu, mas com um emoji padrão
            return {
                ...itemFromAI,
                emoji: '✨', // Emoji padrão para atividades não catalogadas
            };
        }
    });

    return {
        schedule: processedSchedule
    };
}

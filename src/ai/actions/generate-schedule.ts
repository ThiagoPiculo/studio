'use server';

import { generateScheduleFlow, type GenerateScheduleInput, type GenerateScheduleOutput } from '@/ai/flows/generate-schedule-flow';
import { predefinedMissionGroups } from '@/lib/predefined-missions';

export async function generateSchedule(input: Omit<GenerateScheduleInput, 'missionReference'>): Promise<GenerateScheduleOutput> {
    
    // Constrói a lista de referência de missões dinamicamente
    const missionReference = predefinedMissionGroups
        .flatMap(group => group.items)
        .map(item => `- ${item.title}: emoji ${item.emoji}, categoria ${item.suggestedAppCategory}`)
        .join('\n');

    const fullInput: GenerateScheduleInput = {
        ...input,
        missionReference,
    };

    return await generateScheduleFlow(fullInput);
}

    
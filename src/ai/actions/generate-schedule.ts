'use server';

import { generateScheduleFlow, type GenerateScheduleInput, type GenerateScheduleOutput } from '@/ai/flows/generate-schedule-flow';

export async function generateSchedule(input: GenerateScheduleInput): Promise<GenerateScheduleOutput> {
    return await generateScheduleFlow(input);
}

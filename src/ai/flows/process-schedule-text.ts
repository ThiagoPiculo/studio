
'use server';
/**
 * @fileOverview Processes natural language text to create a structured weekly schedule.
 *
 * - processScheduleText - A function that takes child's info and a text description of activities and returns a structured schedule.
 * - ProcessScheduleTextInput - The input type for the processScheduleText function.
 * - ProcessScheduleOutput - The return type for the processScheduleText function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { Weekday } from '@/lib/types';

export const ProcessScheduleTextInputSchema = z.object({
    childName: z.string().describe("The child's name."),
    childAge: z.number().describe("The child's age."),
    schoolShift: z.string().describe("The child's school shift (e.g., 'Manhã', 'Tarde', 'Integral', 'Não estuda ainda')."),
    schoolStartTime: z.string().optional().describe("The school start time in HH:mm format."),
    schoolEndTime: z.string().optional().describe("The school end time in HH:mm format."),
    extraActivities: z.string().optional().describe("A natural language description of extra activities, treatments, and recurring medications with their days and times."),
    essentialRoutines: z.array(z.string()).optional().describe("A list of essential daily routines to be scheduled around fixed appointments."),
});
export type ProcessScheduleTextInput = z.infer<typeof ProcessScheduleTextInputSchema>;

const ScheduleItemSchema = z.object({
    activity: z.string().describe("The name of the activity."),
    type: z.enum(['school_entry', 'school_exit', 'extra_activity', 'essential_routine']).describe("The type of activity."),
    startTime: z.string().describe("The start time in HH:mm format."),
    endTime: z.string().describe("The end time in HH:mm format."),
    days: z.array(z.enum(['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'])).describe("An array of weekdays (MO, TU, etc.) for the activity."),
});

export const ProcessScheduleOutputSchema = z.object({
  schedule: z.array(ScheduleItemSchema).describe("A chronologically sorted list of all scheduled activities for the week."),
  freeTime: z.string().describe("A brief, friendly summary of the child's main free time blocks during the week."),
});
export type ProcessScheduleOutput = z.infer<typeof ProcessScheduleOutputSchema>;

export async function processScheduleText(input: ProcessScheduleTextInput): Promise<ProcessScheduleOutput> {
  return processScheduleFlow(input);
}

const prompt = ai.definePrompt({
  name: 'processSchedulePrompt',
  input: { schema: ProcessScheduleTextInputSchema },
  output: { schema: ProcessScheduleOutputSchema },
  prompt: `
    You are an expert assistant specializing in creating optimized and logical weekly schedules for children. Your goal is to take all the provided information and build a coherent, conflict-free JSON schedule.

    CONTEXT:
    - Child's Name: {{childName}}
    - Child's Age: {{childAge}} years old.
    - School Shift: {{schoolShift}}.
    {{#if schoolStartTime}}- School Start Time: {{schoolStartTime}}{{/if}}
    {{#if schoolEndTime}}- School End Time: {{schoolEndTime}}{{/if}}
    - Fixed Extra Activities, Treatments, and Medications: "{{extraActivities}}"
    - Essential Daily Routines to Schedule: {{#each essentialRoutines}}'{{this}}'{{#unless @last}}, {{/unless}}{{/each}}.

    TASK:
    Generate a complete weekly schedule in JSON format based on the following rules.

    RULES:
    1.  **Fixed Appointments First**: Start by placing all fixed appointments on the schedule: school hours and all items listed in 'extraActivities'. These are non-negotiable.
    2.  **School Schedule**: If the shift is 'Manhã', 'Tarde', or 'Integral', create 'Entrada na Escola' and 'Saída da Escola' schedule items for Monday to Friday using the provided times.
    3.  **Natural Language Processing**: Interpret the 'extraActivities' text. Extract each activity, its time, and the days of the week it occurs. Assume standard durations if not specified (e.g., 1 hour for classes, 15 minutes for medication).
    4.  **Essential Routines**: Schedule the 'essentialRoutines' in the available time slots, following these specific rules:
        - 'Sair para escola': Must be scheduled 20 minutes before 'Entrada na Escola'.
        - 'Escovar os dentes': Must occur approximately 30 minutes after each main meal ('Tomar café da manhã', 'Almoçar', 'Jantar'). Schedule three instances per day if all meals are included.
        - 'Jantar': Must be scheduled at least 20 minutes after the last activity of the evening. Find a logical time around 19:00 or 20:00 if no evening activities exist.
        - 'Fazer lição de casa': Should be scheduled in a free slot, preferably in the afternoon or early evening, and not too close to bedtime.
        - 'Tomar banho': Should be scheduled in the morning before school or in the evening before dinner or bed.
        - Other routines: Place them in logical free slots (e.g., 'Acordar' in the early morning, 'Tomar café da manhã' after waking up, 'Organizar a mochila' in the evening).
    5.  **Output Format**: Return the final schedule as a JSON object matching the 'ProcessScheduleOutput' schema. The 'schedule' array must be sorted chronologically by start time for each day. The 'freeTime' string should be a friendly, narrative summary of when the child has significant blocks of free time.

    EXAMPLE for an activity in the output schedule array:
    { "activity": "Aula de Natação", "type": "extra_activity", "startTime": "16:00", "endTime": "17:00", "days": ["MO", "WE"] }

    Now, generate the schedule for {{childName}}.
  `,
});

const processScheduleFlow = ai.defineFlow(
  {
    name: 'processScheduleFlow',
    inputSchema: ProcessScheduleTextInputSchema,
    outputSchema: ProcessScheduleOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);

'use server';
/**
 * @fileOverview Processes a list of activities to create a structured weekly schedule.
 *
 * - processScheduleText - A function that takes child's info and a list of activities and returns a structured schedule.
 * - ProcessScheduleTextInput - The input type for the processScheduleText function.
 * - ProcessScheduleOutput - The return type for the processScheduleText function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { predefinedMissionGroups } from '@/lib/predefined-missions';

// This is a new schema to represent fixed activities with their schedules
const FixedActivitySchema = z.object({
  name: z.string(),
  days: z.array(z.string()),
  time: z.string(),
});

const ProcessScheduleTextInputSchema = z.object({
    childName: z.string().describe("The child's name."),
    childAge: z.number().describe("The child's age."),
    schoolShift: z.string().describe("The child's school shift (e.g., 'Manhã', 'Tarde', 'Integral', 'Não estuda ainda')."),
    schoolStartTime: z.string().optional().describe("The school start time in HH:mm format."),
    schoolEndTime: z.string().optional().describe("The school end time in HH:mm format."),
    extraActivities: z.array(FixedActivitySchema).optional().describe("A list of fixed extra-curricular activities with their schedules."),
    essentialRoutines: z.array(z.string()).optional().describe("A list of essential daily routines to be scheduled around fixed appointments."),
});
export type ProcessScheduleTextInput = z.infer<typeof ProcessScheduleTextInputSchema>;

const ScheduleItemSchema = z.object({
    activity: z.string().describe("The name of the activity."),
    emoji: z.string().describe("A single emoji that represents the activity."),
    type: z.enum(['school_entry', 'school_exit', 'extra_activity', 'essential_routine']).describe("The type of activity."),
    startTime: z.string().describe("The start time in HH:mm format."),
    endTime: z.string().describe("The end time in HH:mm format."),
    days: z.array(z.enum(['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'])).describe("An array of weekdays (MO, TU, etc.) for the activity."),
});

const ProcessScheduleOutputSchema = z.object({
  schedule: z.array(ScheduleItemSchema).describe("A chronologically sorted list of all scheduled activities for the week."),
  freeTime: z.string().describe("A brief, friendly summary in Brazilian Portuguese of the child's main free time blocks during the week."),
});
export type ProcessScheduleOutput = z.infer<typeof ProcessScheduleOutputSchema>;

// Generate a string list of predefined missions to guide the AI
const predefinedMissionsList = predefinedMissionGroups.flatMap(group => 
  group.items.map(item => `- ${item.title} (Emoji: ${item.emoji})`)
).join('\n');

const prompt = ai.definePrompt({
  name: 'processSchedulePrompt',
  input: { schema: ProcessScheduleTextInputSchema },
  output: { schema: ProcessScheduleOutputSchema },
  prompt: `
    Aja como um especialista em rotina infantil. Crie uma rotina diária cronológica e ideal para uma criança de {{childAge}} anos.

    COMPROMISSOS FIXOS:
    - Turno Escolar: {{schoolShift}}
    {{#if schoolStartTime}}- Horário Escolar: Das {{schoolStartTime}} às {{schoolEndTime}} de Segunda a Sexta.{{/if}}
    {{#if extraActivities}}
    - Atividades Extras:
    {{#each extraActivities}}
      - {{this.name}} às {{this.time}} nas {{this.days}}.
    {{/each}}
    {{/if}}

    ATIVIDADES ESSENCIAIS PARA AGENDAR:
    Com base nos horários livres, posicione as seguintes atividades essenciais:
    {{#each essentialRoutines}}
    - {{{this}}}
    {{/each}}

    REGRAS IMPORTANTES DE AGENDAMENTO:
    1.  **Escovar os dentes**: Deve ocorrer 30 minutos após o início de cada refeição principal (Café da Manhã, Almoço, Jantar).
    2.  **Sair para escola**: Deve ser agendado 20 minutos antes do horário de 'Entrada na Escola'.
    3.  **Jantar**: Deve ocorrer 20 minutos após o término da última atividade da tarde/noite (seja uma atividade extra ou a lição de casa). Se não houver atividades, pode ser por volta das 19:00.
    4.  **DURAÇÃO**: Assuma durações padrão: 30 min para refeições e banho, 45-60 min para lição de casa, 15 min para o resto.
    5.  **EMOJIS**: Para cada atividade, use o emoji correspondente da lista de referência abaixo. É crucial que você use o emoji exato da lista.
    6.  **SAÍDA**: Retorne a rotina em um formato JSON estruturado e ordenado cronologicamente, seguindo o 'ProcessScheduleOutputSchema'.

    LISTA DE MISSÕES PRÉ-DEFINIDAS PARA REFERÊNCIA (NOME E EMOJI):
    ${predefinedMissionsList}

    Agora, gere a agenda para {{childName}}.
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


export async function processScheduleText(input: ProcessScheduleTextInput): Promise<ProcessScheduleOutput> {
  return processScheduleFlow(input);
}
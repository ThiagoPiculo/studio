
'use server';
/**
 * @fileOverview Processes a list of activities to create a structured weekly schedule.
 *
 * - processScheduleText - A function that takes child's info and a list of activities and returns a structured schedule.
 * - ProcessScheduleTextInput - The input type for the processScheduleText function.
 * - ProcessScheduleOutput - The return type for the processScheduleText function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { predefinedMissionGroups } from '@/lib/predefined-missions';

const ProcessScheduleTextInputSchema = z.object({
    childName: z.string().describe("The child's name."),
    childAge: z.number().describe("The child's age."),
    schoolShift: z.string().describe("The child's school shift (e.g., 'Manhã', 'Tarde', 'Integral', 'Não estuda ainda')."),
    schoolStartTime: z.string().optional().describe("The school start time in HH:mm format."),
    schoolEndTime: z.string().optional().describe("The school end time in HH:mm format."),
    // This is now just for essential routines, extra activities are handled manually.
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
    Você é um especialista em logística e organização de rotinas para crianças. Sua tarefa é criar uma agenda semanal estruturada em JSON a partir de uma lista de rotinas essenciais, considerando o turno escolar da criança. Você NÃO precisa se preocupar com atividades extras, apenas com as rotinas da lista 'essentialRoutines'.

    CONTEXTO DA CRIANÇA:
    - Nome: {{childName}}
    - Idade: {{childAge}} anos.
    - Turno Escolar: {{schoolShift}}.
    {{#if schoolStartTime}}- Horário Escolar: Das {{schoolStartTime}} às {{schoolEndTime}}{{/if}}

    ROTINAS ESSENCIAIS PARA AGENDAR:
    {{#each essentialRoutines}}
    - {{{this}}}
    {{/each}}

    REGRAS DE AGENDAMENTO:
    1.  **AGENDA ESCOLAR**: Se a criança estuda, crie os itens 'Entrada na Escola' e 'Saída da Escola' de Segunda a Sexta, usando os horários fornecidos e os tipos 'school_entry' e 'school_exit'.
    2.  **ROTINAS ESSENCIAIS**: Para cada rotina na lista 'essentialRoutines', você deve encontrar o melhor horário e dias da semana para encaixá-la, levando em conta o horário escolar.
        - 'Escovar os dentes': Deve ocorrer três vezes ao dia (manhã, após almoço, noite), todos os dias.
        - 'Fazer lição de casa': Idealmente no contraturno escolar, de Segunda a Sexta.
        - 'Tomar banho': Geralmente à noite, antes de dormir.
        - 'Organizar a mochila': À noite, preparando para o dia seguinte, de Domingo a Quinta.
        - 'Arrumar a cama': Logo pela manhã, todos os dias.
        - Outras rotinas: Encaixe em horários lógicos ('Acordar' de manhã, 'Tomar café' após acordar, 'Jantar' à noite, 'Dormir' no final do dia).
    3.  **DURAÇÃO**: Assuma que a maioria das rotinas dura 30 minutos, a não ser que seja algo rápido como 'Tomar remédio' (5 min) ou mais longo como 'Jantar' (45 min).
    4.  **EMOJIS**: Para cada rotina, use o emoji correspondente da lista de referência abaixo. É MUITO IMPORTANTE que você use o emoji exato da lista.
    5.  **FORMATO DE SAÍDA**: O JSON final deve corresponder ao schema 'ProcessScheduleOutput'. O array 'schedule' deve ser ordenado cronologicamente por dia e hora. A string 'freeTime' deve ser um resumo amigável e em **português do Brasil**.

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

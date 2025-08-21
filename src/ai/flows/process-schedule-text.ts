
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
import { Weekday } from '@/lib/types';
import { predefinedMissionGroups } from '@/lib/predefined-missions';

const ProcessScheduleTextInputSchema = z.object({
    childName: z.string().describe("The child's name."),
    childAge: z.number().describe("The child's age."),
    schoolShift: z.string().describe("The child's school shift (e.g., 'Manhã', 'Tarde', 'Integral', 'Não estuda ainda')."),
    schoolStartTime: z.string().optional().describe("The school start time in HH:mm format."),
    schoolEndTime: z.string().optional().describe("The school end time in HH:mm format."),
    selectedActivities: z.array(z.string()).optional().describe("A list of extra activities, treatments, and fixed appointments, each as a string containing its name, emoji, and user-defined schedule (e.g., 'Aula de Natação (🏊) - Agendado para Seg, Qua às 10:30')."),
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
    Você é um especialista em logística e organização de rotinas para crianças. Sua tarefa é criar uma agenda semanal estruturada em JSON a partir de uma lista de atividades e rotinas essenciais, considerando o turno escolar e a idade da criança.

    CONTEXTO DA CRIANÇA:
    - Nome: {{childName}}
    - Idade: {{childAge}} anos.
    - Turno Escolar: {{schoolShift}}.
    {{#if schoolStartTime}}- Início da Escola: {{schoolStartTime}}{{/if}}
    {{#if schoolEndTime}}- Fim da Escola: {{schoolEndTime}}{{/if}}

    ATIVIDADES PARA AGENDAR:
    - Atividades Extras com Horário Definido:
    {{#each selectedActivities}}
    - {{{this}}}
    {{/each}}
    - Rotinas Essenciais para Encaixar:
    {{#each essentialRoutines}}
    - {{{this}}}
    {{/each}}

    REGRAS DE AGENDAMENTO:
    1.  **PRIORIDADE AOS HORÁRIOS DEFINIDOS**: As 'Atividades Extras' já têm seus dias e horários definidos pelo usuário (descrito na string). Transcreva-as para o JSON exatamente como foram agendadas. **NÃO ALTERE O AGENDAMENTO DESSAS ATIVIDADES**. Assuma que duram 1 hora se não houver indicação contrária. Use o tipo 'extra_activity' para elas.
    2.  **AGENDA ESCOLAR**: Se o turno for 'Manhã', 'Tarde' ou 'Integral', crie os itens 'Entrada na Escola' e 'Saída da Escola' de Segunda a Sexta, usando os horários fornecidos e os tipos 'school_entry' e 'school_exit'.
    3.  **ROTINAS ESSENCIAIS**: Agende as 'essentialRoutines' nos horários livres que sobrarem. Dê a elas o tipo 'essential_routine'. Use estas regras de bom senso:
        - 'Sair para escola': ~20 minutos antes da 'Entrada na Escola'.
        - 'Escovar os dentes': ~30 minutos após as refeições principais (café, almoço, jantar). Agende três vezes ao dia.
        - 'Jantar': Por volta das 19:00 ou 20:00, se não houver outras atividades.
        - 'Fazer lição de casa': Em um horário livre, de preferência à tarde ou início da noite.
        - 'Tomar banho': Pela manhã antes da escola ou à noite antes de dormir.
        - Outras rotinas: Encaixe em horários lógicos ('Acordar' de manhã, 'Tomar café' após acordar, etc.).
    4.  **EMOJIS PARA ROTINAS**: Para as 'essentialRoutines', você pode usar emojis genéricos ou consultar a lista abaixo se o nome da rotina for similar a uma missão pré-definida.
    5.  **FORMATO DE SAÍDA**: O JSON final deve corresponder ao schema 'ProcessScheduleOutput'. O array 'schedule' deve ser ordenado cronologicamente. A string 'freeTime' deve ser um resumo amigável e em **português do Brasil**.

    LISTA DE MISSÕES PRÉ-DEFINIDAS PARA REFERÊNCIA DE EMOJIS:
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

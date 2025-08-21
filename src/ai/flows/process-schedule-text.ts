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
    Aja como um especialista em rotina infantil. Crie uma rotina cronológica e ideal para a semana inteira (Segunda a Domingo) para uma criança de {{childAge}} anos.

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

    REGRAS DE AGENDAMENTO (SEGUNDA A SEXTA):
    {{#if Manhã}}
    Para os dias de semana (Seg-Sex), siga esta ordem se o turno for 'Manhã':
    1.  Hora de Acordar: 1 hora antes do horário de 'Entrada na Escola'.
    2.  Tomar café da manhã: 20 minutos após 'Hora de Acordar'.
    3.  Escovar os dentes (manhã): 30 minutos após o início do café da manhã.
    4.  Tomar banho antes da escola: Após escovar os dentes e antes de sair.
    5.  Sair para escola: 20 minutos antes do horário de 'Entrada na Escola'.
    6.  Almoçar: Por volta das 13:00.
    7.  Escovar os dentes (após almoço): 30 minutos após o início do almoço.
    8.  Fazer a lição de casa: Após o almoço e escovar os dentes.
    9.  Jantar: 20 minutos após a última atividade da noite (seja aula extra ou lição de casa). Se não houver, por volta das 19:00.
    10. Escovar os dentes (após jantar): 30 minutos após o início do jantar.
    11. Organizar a mochila para amanhã: Antes de dormir.
    12. Hora de dormir: Por volta das 21:00.
    {{/if}}
    {{#if Tarde}}
    Para os dias de semana (Seg-Sex), siga esta ordem se o turno for 'Tarde':
    1.  Hora de Acordar: Por volta das 08:30.
    2.  Tomar café da manhã: 20 minutos após 'Hora de Acordar'.
    3.  Escovar os dentes (manhã): 30 minutos após o início do café da manhã.
    4.  Fazer a lição de casa: No período da manhã.
    5.  Almoçar: Antes de sair para a escola.
    6.  Escovar os dentes (após almoço): 30 minutos após o início do almoço.
    7.  Tomar banho antes da escola: Após escovar os dentes e antes de sair.
    8.  Sair para escola: 20 minutos antes do horário de 'Entrada na Escola'.
    9.  Jantar: 20 minutos após a última atividade da noite. Se não houver, por volta das 19:35.
    10. Escovar os dentes (após jantar): 30 minutos após o início do jantar.
    11. Organizar a mochila para amanhã: Antes de dormir.
    12. Hora de dormir: Por volta das 22:00.
    {{/if}}

    REGRAS DE AGENDAMENTO (FIM DE SEMANA - SÁBADO E DOMINGO):
    - **Rotina Matinal Flexível:** Mantenha a sequência de 'Acordar', 'Café' e 'Escovar Dentes', mas com horários mais relaxados (Ex: Acordar às 09:00).
    - **Atividades Extras:** Lembre-se de encaixar qualquer atividade extra que ocorra no fim de semana.
    - **Tempo Livre:** Priorize blocos de tempo livre para brincadeiras e atividades em família.
    - **Rotina Noturna:** Mantenha a sequência de 'Jantar', 'Escovar Dentes' e 'Dormir', ajustando os horários conforme as atividades do dia, mas mantendo uma hora de dormir consistente (Ex: 22:00).
    - **Mochila:** Lembre-se de incluir "Organizar a mochila para amanhã" na noite de Domingo.

    REGRAS GERAIS:
    - **DURAÇÃO**: Assuma durações padrão: 30 min para refeições e banho, 45-60 min para lição de casa, 15 min para o resto.
    - **EMOJIS**: Para cada atividade, use o emoji correspondente da lista de referência abaixo. É crucial que você use o emoji exato da lista.
    - **SAÍDA**: Retorne a rotina em um formato JSON estruturado e ordenado cronologicamente, seguindo o 'ProcessScheduleOutputSchema'.

    LISTA DE MISSÕES PRÉ-DEFINIDAS PARA REFERÊNCIA (NOME E EMOJI):
    ${predefinedMissionsList}

    Agora, gere a agenda completa da semana para {{childName}}.
  `,
});

const processScheduleFlow = ai.defineFlow(
  {
    name: 'processScheduleFlow',
    inputSchema: ProcessScheduleTextInputSchema,
    outputSchema: ProcessScheduleOutputSchema,
  },
  async (input) => {
    const augmentedInput = {
      ...input,
      Manhã: input.schoolShift === 'Manhã',
      Tarde: input.schoolShift === 'Tarde',
    };
    const { output } = await prompt(augmentedInput);
    return output!;
  }
);


export async function processScheduleText(input: ProcessScheduleTextInput): Promise<ProcessScheduleOutput> {
  return processScheduleFlow(input);
}

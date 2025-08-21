
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

const ProcessScheduleTextInputSchema = z.object({
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

const prompt = ai.definePrompt({
  name: 'processSchedulePrompt',
  input: { schema: ProcessScheduleTextInputSchema },
  output: { schema: ProcessScheduleOutputSchema },
  prompt: `
    Você é um assistente especialista em criar rotinas semanais otimizadas e lógicas para crianças. Seu objetivo é pegar todas as informações fornecidas e construir uma agenda coesa e sem conflitos em formato JSON.

    CONTEXTO:
    - Nome da Criança: {{childName}}
    - Idade da Criança: {{childAge}} anos.
    - Turno Escolar: {{schoolShift}}.
    {{#if schoolStartTime}}- Horário de Início da Escola: {{schoolStartTime}}{{/if}}
    {{#if schoolEndTime}}- Horário de Fim da Escola: {{schoolEndTime}}{{/if}}
    - Atividades Extras, Tratamentos e Remédios Fixos: "{{extraActivities}}"
    - Rotinas Essenciais para Agendar: {{#each essentialRoutines}}'{{this}}'{{#unless @last}}, {{/unless}}{{/each}}.

    TAREFA:
    Gere uma agenda semanal completa em formato JSON, seguindo as regras abaixo.

    REGRAS:
    1.  **Compromissos Fixos Primeiro**: Comece alocando todos os compromissos fixos: horários escolares e todos os itens de 'extraActivities'. Eles não são negociáveis.
    2.  **Agenda Escolar**: Se o turno for 'Manhã', 'Tarde' ou 'Integral', crie os itens 'Entrada na Escola' e 'Saída da Escola' de Segunda a Sexta, usando os horários fornecidos.
    3.  **Processamento de Linguagem Natural**: Interprete o texto em 'extraActivities'. Extraia cada atividade, seu horário e os dias da semana. Assuma durações padrão se não especificadas (ex: 1 hora para aulas, 15 minutos para remédios).
    4.  **Emoji**: Para cada atividade, adicione um emoji único e relevante.
    5.  **Rotinas Essenciais**: Agende as 'essentialRoutines' nos horários livres, seguindo estas regras:
        - 'Sair para escola': Deve ser 20 minutos antes da 'Entrada na Escola'.
        - 'Escovar os dentes': Deve ocorrer aproximadamente 30 minutos após as refeições principais ('Tomar café da manhã', 'Almoçar', 'Jantar'). Agende três vezes ao dia.
        - 'Jantar': Deve ser agendado pelo menos 20 minutos após a última atividade da noite. Encontre um horário lógico por volta das 19:00 ou 20:00 se não houver atividades noturnas.
        - 'Fazer lição de casa': Agende em um horário livre, de preferência à tarde ou início da noite, não muito perto da hora de dormir.
        - 'Tomar banho': Agende pela manhã antes da escola ou à noite antes do jantar ou de dormir.
        - Outras rotinas: Encaixe em horários lógicos ('Acordar' de manhã cedo, 'Tomar café da manhã' após acordar, etc.).
    6.  **Formato de Saída**: O JSON final deve corresponder ao schema 'ProcessScheduleOutput'. O array 'schedule' deve ser ordenado cronologicamente por 'startTime' para cada dia. A string 'freeTime' deve ser um resumo amigável e em **português do Brasil**, descrevendo os principais blocos de tempo livre da criança.

    EXEMPLO para um item no array de saída 'schedule':
    { "activity": "Aula de Natação", "emoji": "🏊", "type": "extra_activity", "startTime": "16:00", "endTime": "17:00", "days": ["MO", "WE"] }

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


'use server';
/**
 * @fileOverview Um agente de IA para processar texto e criar uma rotina estruturada para crianças.
 *
 * - processScheduleText - Uma função que manipula a criação da rotina.
 * - ProcessScheduleTextInput - O tipo de entrada para a função processScheduleText.
 * - ProcessScheduleOutput - O tipo de retorno para a função processScheduleText.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const WeekdayEnum = z.enum(['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU']);

const ScheduleItemSchema = z.object({
  activity: z.string().describe("O nome da atividade (ex: 'Hora de Acordar', 'Natação', 'Tempo Livre')."),
  emoji: z.string().emoji().describe("Um emoji que represente a atividade."),
  type: z.enum(['school_entry', 'school_exit', 'extra_activity', 'essential_routine', 'free_time']).describe("O tipo de atividade."),
  category: z.string().describe("A categoria da atividade (ex: 'school', 'health', 'hobbies')."),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).describe("A hora de início no formato HH:mm."),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).describe("A hora de término no formato HH:mm."),
  days: z.array(WeekdayEnum).describe("Uma lista dos dias da semana em que a atividade ocorre."),
});

const ProcessScheduleTextInputSchema = z.object({
  childAge: z.number().describe("A idade da criança."),
  childName: z.string().describe("O nome da criança."),
  schoolShift: z.string().describe("O turno escolar da criança (ex: 'Manhã', 'Tarde', 'Integral')."),
  schoolStartTime: z.string().optional().describe("A hora de início da escola no formato HH:mm, se aplicável."),
  schoolEndTime: z.string().optional().describe("A hora de término da escola no formato HH:mm, se aplicável."),
  extraActivities: z.string().optional().describe("Uma descrição em texto livre das atividades extras da criança, incluindo dias e horários."),
  essentialRoutines: z.array(z.string()).optional().describe("Uma lista de rotinas essenciais a serem incluídas (ex: 'Tomar banho', 'Fazer lição de casa')."),
});
export type ProcessScheduleTextInput = z.infer<typeof ProcessScheduleTextInputSchema>;

const ProcessScheduleOutputSchema = z.object({
  schedule: z.array(ScheduleItemSchema).describe("A rotina semanal estruturada gerada."),
  freeTime: z.string().describe("Um breve resumo sobre os principais blocos de tempo livre identificados para a criança."),
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
    Você é um especialista em desenvolvimento infantil e um organizador de rotinas mestre.
    Sua tarefa é criar uma rotina semanal equilibrada e saudável para uma criança, com base nas informações fornecidas.
    A rotina deve ser estruturada com clareza, apresentando dias da semana, horários, atividades e tempo livre, sempre levando em conta o bem-estar físico, mental e social da criança.
    Priorize o bem-estar, garantindo que haja tempo para descanso, alimentação e lazer.

    Informações da Criança:
    - Nome: {{{childName}}}
    - Idade: {{{childAge}}}
    - Turno Escolar: {{{schoolShift}}}
    - Horário Escolar: {{{schoolStartTime}}} - {{{schoolEndTime}}}
    - Atividades Extras: {{{extraActivities}}}
    - Rotinas Essenciais a Incluir: {{#each essentialRoutines}}- {{{this}}}{{/each}}

    REGRAS DE OURO (LÓGICA DE AGENDAMENTO):
    Prioridade Máxima: Primeiro, aloque na agenda os Compromissos Fixos (Escola e Atividades Extras). Eles não podem ser movidos.

    Rotinas Essenciais: Em seguida, distribua as Rotinas Essenciais nos horários livres dos dias de semana (Segunda a Sexta), seguindo estas regras de tempo e sequência:
    - "Sair para escola": Sempre 20 minutos antes do horário de entrada na escola.
    - "Escovar os dentes": Sempre 20-30 minutos após "Tomar café da manhã", "Almoçar" e "Jantar".
    - "Jantar": Cerca de 20-30 minutos após a última atividade extra da noite. Se não houver atividade, use um horário padrão (ex: 19:30).
    - "Organizar a mochila": Deve ser uma das últimas tarefas da noite, antes de dormir.
    - Use o bom senso para alocar as demais rotinas, como "Fazer a lição de casa" em um período de maior concentração (ex: início da manhã para quem estuda à tarde).

    Fim de Semana (Sábado e Domingo):
    - Manhã: Mantenha a sequência "Acordar", "Café da Manhã", "Escovar os Dentes", mas com horários mais flexíveis (ex: começar às 09:00).
    - Noite: Mantenha a sequência "Jantar", "Escovar os Dentes", "Dormir" de forma consistente.
    - Mochila: Apenas no Domingo à noite, inclua a missão "Organizar a mochila para amanhã".
    - Priorize Tempo Livre: A maior parte do fim de semana deve ser preenchida com blocos de "Tempo Livre".

    Tempo Livre: Após alocar todos os compromissos e rotinas, identifique os blocos de tempo restantes e marque-os como "Tempo Livre".

    Resumo Amigável: Crie uma frase curta e divertida resumindo os principais períodos livres da criança.

    Emojis e Categorias: Para cada atividade, use o emoji e a categoria exatos da lista de ideias de missões de referência. Isso é crucial para a consistência do aplicativo.
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
    if (!output) {
      throw new Error("A IA não conseguiu gerar uma rotina. Tente refinar as informações.");
    }
    // Garante que o resultado esteja ordenado por hora de início
    output.schedule.sort((a, b) => a.startTime.localeCompare(b.startTime));
    return output;
  }
);

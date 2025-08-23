
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
    Seja lógico e coerente ao alocar as rotinas essenciais em torno dos horários fixos da escola e das atividades extras.
    Priorize o bem-estar, garantindo que haja tempo para descanso, alimentação e lazer.

    Informações da Criança:
    - Nome: {{{childName}}}
    - Idade: {{{childAge}}}
    - Turno Escolar: {{{schoolShift}}}
    - Horário Escolar: {{{schoolStartTime}}} - {{{schoolEndTime}}}
    - Atividades Extras: {{{extraActivities}}}
    - Rotinas Essenciais a Incluir: {{#each essentialRoutines}}- {{{this}}}{{/each}}

    Instruções:
    1.  **Horários Fixos:** Primeiro, aloque os horários da escola e as atividades extras nos dias e horários corretos.
    2.  **Rotinas Essenciais:** Em seguida, distribua as rotinas essenciais nos horários mais lógicos do dia. Use o exemplo de raciocínio abaixo como guia principal.
    3.  **Duração:** Atribua durações razoáveis para cada tarefa (ex: Café da manhã - 20min, Banho - 20min, Lição de casa - 45-60min).
    4.  **Tempo Livre:** Identifique blocos de tempo onde a criança não tem atividades programadas e marque-os como 'free_time' com o emoji '🧩'. Se uma atividade extra já ocupa o horário do "Tempo Livre", a atividade extra tem prioridade.
    5.  **Resumo do Tempo Livre:** No campo 'freeTime', escreva uma frase curta e amigável resumindo os principais períodos livres da criança.
    6.  **Emoji e Categoria:** Para cada atividade, use um emoji e uma categoria consistentes com os exemplos de missões existentes (ex: 'Fazer lição de casa' deve ser da categoria 'school' com o emoji '✍️').

    Exemplo de Raciocínio (para uma criança que estuda à tarde, das 13:00 às 17:30):
    - Manhã:
      - 08:30: Hora de Acordar
      - 08:50: Tomar café da manhã
      - 09:10: Escovar os dentes
      - 09:30: Fazer a lição de casa
      - 09:50: Beber água
      - 10:00 - 11:50: Blocos de "Hora livre para brincar" (se não houver outra atividade)
      - 11:50: Tomar banho
      - 12:10: Almoçar
      - 12:30: Escovar os dentes
      - 12:40: Sair para escola
    - Tarde:
      - 13:00 - 17:30: Escola
    - Noite:
      - Jantar é agendado ~20-30 minutos após a última atividade extra da noite.
      - 21:30: Organizar a mochila
      - 21:40: Escovar os dentes
      - 22:00: Hora de dormir
    Adapte esta lógica para outros turnos e informações fornecidas.

    Gere a rotina completa e estruturada no formato de saída JSON.
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

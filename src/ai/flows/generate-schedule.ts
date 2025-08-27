
'use server';

/**
 * @fileOverview Fluxo de IA para gerar rotinas infantis detalhadas e estruturadas.
 *
 * - generateSchedule - Função principal que recebe os dados da criança e retorna uma agenda semanal.
 * - GenerateScheduleInput - O tipo de entrada para a função generateSchedule.
 * - GenerateScheduleOutput - O tipo de retorno da função generateSchedule.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { allWeekdays } from '@/lib/types';


// 1. INFORMAÇÕES DA CRIANÇA (Esquema de Entrada)
const ExtraActivitySchema = z.object({
  name: z.string(),
  days: z.array(z.string()).min(1),
  time: z.string(),
});

const GenerateScheduleInputSchema = z.object({
  childName: z.string().describe("Nome da criança."),
  childAge: z.number().describe("Idade da criança."),
  schoolShift: z.enum(['morning', 'afternoon', 'full_time', 'not_applicable']).describe("Turno escolar da criança."),
  schoolStartTime: z.string().optional().describe("Horário de início da escola (HH:mm)."),
  schoolEndTime: z.string().optional().describe("Horário de término da escola (HH:mm)."),
  wakeUpTime: z.string().optional().describe("Horário de acordar (HH:mm)."),
  lunchTime: z.string().optional().describe("Horário do almoço (HH:mm), usado como âncora se a criança não estuda."),
  dinnerTime: z.string().optional().describe("Horário do jantar (HH:mm)."),
  sleepTime: z.string().optional().describe("Horário de dormir (HH:mm)."),
  mealsAtSchool: z.object({
    lunch: z.boolean().default(false),
    dinner: z.boolean().default(false),
  }).optional().describe("Indica se as refeições são feitas na escola."),
  extraActivities: z.array(ExtraActivitySchema).optional().describe("Lista de atividades extras com dias e horários fixos."),
  essentialRoutines: z.array(z.string()).optional().describe("Lista de rotinas essenciais a serem incluídas na agenda."),
});
export type GenerateScheduleInput = z.infer<typeof GenerateScheduleInputSchema>;


// 2. FORMATO DE SAÍDA (Esquema de Saída)
const ScheduleItemSchema = z.object({
  activity: z.string().describe("O nome da atividade (ex: 'Hora de Acordar', 'Natação', 'Tempo Livre')."),
  emoji: z.string().emoji().describe("Um emoji que represente a atividade."),
  type: z.enum(['school_entry', 'school_exit', 'extra_activity', 'essential_routine', 'free_time']).describe("O tipo de atividade."),
  category: z.string().describe("A categoria da atividade (ex: 'school', 'health', 'hobbies')."),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "O formato do horário deve ser HH:mm").describe("A hora de início no formato HH:mm."),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "O formato do horário deve ser HH:mm").describe("A hora de término no formato HH:mm."),
  days: z.array(z.enum(allWeekdays)).describe("Uma lista dos dias da semana em que a atividade ocorre."),
}).refine(data => {
    if (!data.startTime || !data.endTime) return true; // Let regex validation handle format errors
    return data.endTime > data.startTime;
}, {
  message: "O horário de término deve ser posterior ao horário de início.",
  path: ["endTime"],
});

const GenerateScheduleOutputSchema = z.object({
  schedule: z.array(ScheduleItemSchema).describe("A rotina semanal estruturada e completa, de Segunda a Domingo."),
  freeTimeSummary: z.string().describe("Um breve resumo sobre os principais blocos de tempo livre identificados para a criança e qualquer nota sobre conflitos de agendamento."),
});
export type GenerateScheduleOutput = z.infer<typeof GenerateScheduleOutputSchema>;


// 3. PROMPT MESTRE (O Coração da IA)
const generateSchedulePrompt = ai.definePrompt({
    name: 'generateChildSchedule',
    input: { schema: GenerateScheduleInputSchema },
    output: { schema: GenerateScheduleOutputSchema },
    prompt: `
      # BRIEFING MESTRE: GERADOR DE ROTINA INFANTIL UNIVERSAL (v12.1)

      **1. PERSONA E DIRETRIZ IMPERATIVA**
      Você é a Aura, uma IA especialista em psicologia infantil. Sua missão é criar uma rotina semanal completa (Segunda a Domingo) para {{{childName}}}, de {{{childAge}}} anos, seguindo as REGRAS DE OURO e os blocos de horário de forma HIERÁRQUICA E LITERAL. Para cada atividade, você DEVE fornecer TODOS os campos requisitados: \`activity\`, \`emoji\`, \`type\`, \`category\`, \`startTime\`, \`endTime\`, e \`days\`.

      ---

      **2. INFORMAÇÕES DA CRIANÇA**

      *   **Nome:** {{{childName}}}
      *   **Idade:** {{{childAge}}}
      *   **Turno Escolar:** {{{schoolShift}}}
      *   **Horário Escolar:** {{{schoolStartTime}}} - {{{schoolEndTime}}}
      *   **Horários de Âncora Definidos pelo Responsável:**
          *   Acordar: {{{wakeUpTime}}}
          *   Almoço: {{#if mealsAtSchool.lunch}}Na escola{{else}}{{{lunchTime}}}{{/if}}
          *   Jantar: {{#if mealsAtSchool.dinner}}Na escola{{else}}{{{dinnerTime}}}{{/if}}
          *   Dormir: {{{sleepTime}}}
      *   **Atividades Extras:** {{#if extraActivities}}{{#each extraActivities}}- {{{this.name}}} acontece toda {{{this.days}}} às {{{this.time}}}.{{/each}}{{else}}Nenhuma.{{/if}}
      *   **Rotinas Essenciais a Incluir:** {{#if essentialRoutines}}{{#each essentialRoutines}}- {{{this}}}{{/each}}{{else}}Nenhuma.{{/if}}

      ---

      **3. REGRAS DE OURO (LÓGICA DE AGENDAMENTO HIERÁRQUICO)**

      1.  **NÍVEL 1 - O INEGOCIÁVEL (Escola):** Primeiro, aloque o horário escolar (use a atividade 'Escola' e o emoji '🏫') na agenda de Segunda a Sexta, usando os horários de início e fim fornecidos. Este bloco é a âncora da rotina e não pode ser alterado.
      2.  **NÍVEL 2 - OS COMPROMISSOS (Atividades Extras):** Em seguida, aloque as Atividades Extras nos dias e horários fornecidos. Se o horário de uma Atividade Extra cair dentro do horário escolar, **IGNORE A ATIVIDADE EXTRA** e adicione uma nota sobre o conflito no campo \`freeTimeSummary\`.
      3.  **NÍVEL 3 - AS ROTINAS ESSENCIAIS:** Para cada dia da semana (Segunda a Domingo), distribua a lista de **'Rotinas Essenciais a Incluir'** nos horários vagos. Use os horários âncora (Acordar, Almoçar, Jantar, Dormir) como referência para saber se uma tarefa é da manhã, tarde ou noite. Ex: "Escovar os dentes" deve acontecer após as refeições. "Arrumar a cama" deve ser logo após "Hora de acordar".
      
      **REGRAS GERAIS ADICIONAIS:**
      - **Emojis, títulos e Categorias:** Para cada missão (atividade a ser agendada), use o emoji, título e categoria EXATOS da lista de missões pré-definidas de referência do aplicativo. O campo 'emoji' DEVE conter apenas um único caractere de emoji, sem texto ou espaços. NÃO INVENTE ou ALTERE estes valores sob nenhuma circunstância.
      - **NÃO agende missões antes do horário de acordar ({{{wakeUpTime}}}) ou após o horário de dormir ({{{sleepTime}}}).**

      **PREENCHIMENTO FINAL:** Após alocar todos os itens acima, preencha todos os horários vazios com a atividade "🧩 Hora livre para brincar".

      ---
      
      **4. DIRETIVA FINAL DE FORMATO**
      Sua resposta DEVE ser um objeto JSON válido que corresponda ao esquema de saída definido. Não inclua nenhum texto, explicação ou formatação fora da estrutura JSON.

      Agora, gere a agenda completa.
    `,
});

// 4. FUNÇÃO DE FLUXO (Onde a Mágica Acontece)
const generateScheduleFlow = ai.defineFlow(
    {
        name: 'generateScheduleFlow',
        inputSchema: GenerateScheduleInputSchema,
        outputSchema: GenerateScheduleOutputSchema,
    },
    async (input) => {
        const { output } = await generateSchedulePrompt(input);
        
        if (!output) {
            throw new Error("A IA não conseguiu gerar uma agenda com os dados fornecidos.");
        }
        
        return output;
    }
);

// 5. FUNÇÃO EXPORTADA (Para o App Usar)
export async function generateSchedule(input: GenerateScheduleInput): Promise<GenerateScheduleOutput> {
    return generateScheduleFlow(input);
}

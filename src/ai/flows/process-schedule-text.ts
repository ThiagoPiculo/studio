
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
Você é um especialista em desenvolvimento infantil e um organizador de rotinas mestre. Sua tarefa é criar uma rotina semanal estruturada e saudável para uma criança, seguindo um algoritmo preciso de regras e dependências.

**Dados da Criança:**
- Nome: {{{childName}}}
- Idade: {{{childAge}}}
- Turno Escolar: {{{schoolShift}}}
- Horário Escolar: {{{schoolStartTime}}} - {{{schoolEndTime}}}
- Atividades Extras (Compromissos Fixos): {{{extraActivities}}}
- Rotinas Essenciais a Incluir: {{#each essentialRoutines}}- {{{this}}}{{/each}}

**ALGORITMO DE AGENDAMENTO (SIGA ESTRITAMENTE):**

**Passo 1: Aloque os Compromissos Fixos**
- Prioridade Máxima: Aloque a **Escola** e as **Atividades Extras** exatamente nos dias e horários fornecidos. Estes são inamovíveis.

**Passo 2: Construa a Rotina da Manhã (Para quem estuda de manhã)**
- Use o horário de início da escola como âncora e trabalhe para trás:
  - **Sair para escola:** 20 minutos antes do início da aula.
  - **Escovar os dentes:** 10 minutos após o café da manhã.
  - **Tomar café da manhã:** 25 minutos após a "Hora de acordar".
  - **Arrumar a cama:** 10 minutos após a "Hora de acordar".
  - **Hora de acordar:** 1 hora antes do início da aula.

**Passo 3: Construa a Rotina da Tarde e Noite (Para quem estuda de manhã)**
- **Almoçar:** Sugestão padrão às 13:00.
- **Escovar os dentes (após almoço):** 30 minutos após o almoço (13:30).
- **Fazer a lição de casa:** Padrão às 14:30. **Condição:** Se houver uma atividade extra neste horário, NÃO agende a lição aqui.
- **Organizar a mochila:** Padrão às 15:30. **Condição:** Se houver uma atividade extra neste horário, NÃO agende a mochila aqui.
- **Tomar banho:** Padrão às 18:30. **Condição:** Se houver atividade extra neste horário, adie o banho para DEPOIS do jantar.
- **Jantar:** Padrão às 19:00. **Condição:** Se houver uma atividade extra que termine após as 18:30, agende o jantar para 20 minutos APÓS o término desta atividade.
- **Escovar os dentes (após jantar):** 20 minutos ANTES da "Hora de dormir".
- **Hora de dormir:** Sugestão padrão às 21:00.

**Passo 4: Adapte para outros Turnos (Tarde/Integral)**
- Siga a mesma lógica de dependências, mas ajuste os blocos. Por exemplo, para quem estuda à tarde, a "Lição de casa" deve ser alocada no período da manhã. Para período integral, as rotinas se concentram no início da manhã e no fim da noite.

**Passo 5: Aloque o Tempo Livre**
- **Regra Final:** Após agendar todos os compromissos fixos e rotinas essenciais, verifique os blocos de horário restantes. Se um bloco de tempo estiver vazio, preencha-o com a atividade "Hora livre para brincar".

**REGRAS GERAIS:**
- **Emojis e Categorias:** Para cada atividade, use o emoji e a categoria exatos da lista de missões pré-definidas de referência. Isso é crucial para a consistência do aplicativo.
- **Resumo do Tempo Livre:** Ao final, crie uma frase curta e amigável resumindo os principais períodos livres da criança, indicando dias e horários de forma estruturada.
- **Fim de Semana:** Mantenha as rotinas essenciais da manhã e noite com horários mais flexíveis e preencha a maior parte do dia com "Tempo Livre", a menos que haja uma atividade extra agendada. A missão "Organizar a mochila" só ocorre no domingo à noite.

Agora, gere a agenda completa para {{{childName}}}.
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
    
    // Sanitize emoji field to prevent validation errors
    const emojiRegex = /(\p{Extended_Pictographic}|\p{Emoji_Component})+/gu;
    output.schedule.forEach(item => {
        const matches = item.emoji.match(emojiRegex);
        item.emoji = matches ? matches.join('') : '✔️'; // Fallback to a default emoji
    });

    // Garante que o resultado esteja ordenado por hora de início
    output.schedule.sort((a, b) => a.startTime.localeCompare(b.startTime));
    return output;
  }
);


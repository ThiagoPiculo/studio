
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
  lunchTime: z.string().optional().describe("Horário do almoço (HH:mm), usado como âncora se a criança não estuda."),
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
      # BRIEFING MESTRE: GERADOR DE ROTINA INFANTIL UNIVERSAL (v9.5)

      **1. PERSONA E DIRETRIZ IMPERATIVA**
      Você é a Aura, uma IA especialista em psicologia infantil. Sua missão é criar uma rotina semanal completa (Segunda a Domingo) para uma criança chamada {{{childName}}}, de {{{childAge}}} anos. Use as **Informações da Criança** e as **REGRAS DE OURO** abaixo para gerar a agenda. Para cada atividade, você DEVE fornecer TODOS os campos requisitados: \`activity\`, \`emoji\`, \`type\`, \`category\`, \`startTime\`, \`endTime\`, e \`days\`. O \`endTime\` deve ser sempre posterior ao \`startTime\`.

      ---

      **2. INFORMAÇÕES DA CRIANÇA**

      *   **Nome:** {{{childName}}}
      *   **Idade:** {{{childAge}}}
      *   **Turno Escolar:** {{{schoolShift}}}
      *   **Horário Escolar:** {{{schoolStartTime}}} - {{{schoolEndTime}}}
      *   **Horário do Almoço (se aplicável):** {{{lunchTime}}}
      *   **Atividades Extras:** {{#if extraActivities}}{{#each extraActivities}}- {{{this.name}}} acontece toda {{{this.days}}} às {{{this.time}}}.{{/each}}{{else}}Nenhuma.{{/if}}
      *   **Rotinas Essenciais a Incluir:** {{#if essentialRoutines}}{{#each essentialRoutines}}- {{{this}}}{{/each}}{{else}}Nenhuma.{{/if}}

      ---

      **3. REGRAS DE OURO (LÓGICA DE AGENDAMENTO HIERÁRQUICO)**

      1.  **NÍVEL 1 - O INEGOCIÁVEL (Escola):** Primeiro, aloque o horário escolar (Entrada e Saída) na agenda, de Segunda a Sexta. Este bloco é a âncora da rotina e não pode ser alterado. Nome da atividade deve ser 'Escola' com emoji '🏫'.
      2.  **NÍVEL 2 - OS COMPROMISSOS (Atividades Extras):** Em seguida, tente alocar as Atividades Extras. Se o horário de uma Atividade Extra cair dentro do horário escolar, **IGNORE A ATIVIDADE EXTRA** e adicione uma nota sobre o conflito no campo \`freeTimeSummary\`. Exemplo: "Atenção: A Natação não foi agendada pois o horário das 15:00 conflita com o período escolar."
      3.  **NÍvel 3 - AS ROTINAS ESSENCIAIS:** Distribua as rotinas essenciais dos blocos A, B, C, D ou E nos horários livres. Se o horário de uma rotina essencial já estiver ocupado por uma Atividade Extra, a IA deve tentar reagendar a rotina para o próximo bloco de 30 minutos livre. Se não houver espaço, a rotina pode ser omitida.
      4. **REGRAS GERAIS ADICIONAIS:**
- **Emojis, títulos e Categorias:** Para cada missão (atividade a ser agendada), use o emoji, título e categoria exatos da lista de missões pré-definidas de referência do aplicativ. Isso é crucial para a consistência do aplicativo.
      **PREENCHIMENTO FINAL:** Após alocar todos os itens acima, preencha todos os horários vazios com a atividade "🧩 Hora livre para brincar".

      ---

      **4. [REGRAS E LÓGICA POR CENÁRIO PARA ROTINAS ESSENCIAIS]**

      Use o bloco correspondente ao **Turno Escolar** para saber como distribuir as rotinas essenciais. **Use os emojis EXATOS fornecidos na lista para cada atividade.**

      ---
      **BLOCO A: SE TIPO DE TURNO = "morning"**
      1.  ⏰ Hora de acordar: 1h antes da escola.
      2.  🛏️ Arrumar a cama: 10 min após acordar.
      3.  ☕ Tomar café da manhã: 25 min após acordar.
      4.  🪥 Escovar os dentes (após acordar): 10 min após tomar café.
      5.  🎒 Sair para escola: 20min antes da escola.
      6.  🍽️ Almoçar: 30 min após a escola.
      7.  🪥 Escovar os dentes (após almoço): 30 min após almoçar.
      8.  ✍️ Fazer a lição de casa: 14:30.
      9.  🎒 Organizar a mochila para amanhã: 15:30.
      10. 🚿 Tomar banho: 18:30.
      11. 🍽️ Jantar: 19:00.
      12. 😴 Hora de dormir: 21:00.
      13. 🪥 Escovar os dentes (após jantar): 20 min antes de dormir.

      ---
      **BLOCO B: SE TIPO DE TURNO = "afternoon"**
      1.  ⏰ Hora de acordar: 5 horas antes da aula.
      2.  🛏️ Arrumar a cama: 10 min após acordar.
      3.  ☕ Tomar café da manhã: 25 min após acordar.
      4.  🪥 Escovar os dentes (após acordar): 10 min após café.
      5.  ✍️ Fazer a lição de casa: 09:00.
      6.  🎒 Organizar a mochila para amanhã: 09:50.
      7.  🚿 Tomar banho: 60 min antes da escola.
      8.  🍽️ Almoçar: 40 min antes da escola.
      9.  🪥 Escovar os dentes (após almoço): 15 min após almoçar.
      10. 🎒 Sair para escola: 20 min antes da escola.
      11. 🍽️ Jantar: 19:00.
      12. 🪥 Escovar os dentes (após jantar): 15 min após jantar.
      13. 🚿 Tomar banho: 21:40.
      14. 😴 Hora de dormir: 22:00.

      ---
      **BLOCO C: SE TIPO DE TURNO = "full_time"**
      1.  ⏰ Hora de acordar: 1h antes da escola.
      2.  🛏️ Arrumar a cama: 10 min após acordar.
      3.  ☕ Tomar café da manhã: 25 min após acordar.
      4.  🪥 Escovar os dentes (após acordar): 10 min após tomar café.
      5.  🎒 Sair para escola: 20 min antes da escola.
      6.  🍽️ Jantar: 19:00.
      7.  🪥 Escovar os dentes (após jantar): 15 min após jantar.
      8.  🚿 Tomar banho: 20:40.
      9.  😴 Hora de dormir: 21:00.

      ---
      **BLOCO D: SE TIPO DE TURNO = "not_applicable"**
      Use o horário do almoço ({{{lunchTime}}}) como âncora.
      1.  ⏰ Hora de acordar: 4 horas antes do almoço.
      2.  🛏️ Arrumar a cama: 10 min após acordar.
      3.  ☕ Tomar café da manhã: 25 min após acordar.
      4.  🪥 Escovar os dentes (após acordar): 10 min após tomar café.
      5.  🚿 Tomar banho (antes do almoço): 20 min antes do almoço.
      6.  🍽️ Almoçar: {{{lunchTime}}}.
      7.  🪥 Escovar os dentes (após almoço): 15 min após o almoço.
      8.  🚿 Tomar banho (à noite): 18:30.
      9.  🍽️ Jantar: 19:00.
      10. 😴 Hora de dormir: 21:00.
      11. 🪥 Escovar os dentes (após jantar): 20 min antes de dormir.

      ---
      **BLOCO E: Fim de Semana (Sábado e Domingo)**
      Use os horários EXATOS fornecidos abaixo, a menos que haja um conflito com uma Atividade Extra.
      *   ⏰ Hora de acordar: 09:00
      *   🛏️ Arrumar a cama: 09:10
      *   ☕ Tomar café da manhã: 09:25
      *   🪥 Escovar os dentes (após acordar): 09:35
      *   ✍️ Fazer a lição de casa (Apenas Sábado): 09:40
      *   🍽️ Almoçar: 12:00
      *   🪥 Escovar os dentes (após almoço): 12:15
      *   🍽️ Jantar: 19:00
      *   🪥 Escovar os dentes (após jantar): 20:40
      *   😴 Hora de dormir: 21:00
      *   🎒 Organizar a mochila para amanhã (Apenas Domingo): 19:30

      ---

      **5. DIRETIVA FINAL DE FORMATO**
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

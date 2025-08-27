
'use server';
/**
 * @fileOverview Um fluxo de IA para gerar uma rotina semanal para uma criança.
 *
 * Este fluxo usa o modelo Gemini para criar uma agenda estruturada com base nas informações
 * fornecidas sobre a criança, como idade, turno escolar e atividades.
 *
 * - generateSchedule - A função principal que gera a agenda.
 * - GenerateScheduleInput - O tipo de entrada para a função.
 * - GenerateScheduleOutput - O tipo de retorno para a função.
 */
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import type { Weekday, SchoolShift } from '@/lib/types';
import { missionCategories } from '@/lib/types';

// Define o esquema para cada item da agenda, garantindo uma estrutura consistente.
const ScheduleItemSchema = z.object({
  activity: z.string().describe("O nome da atividade (ex: 'Hora de Acordar', 'Natação', 'Tempo Livre')."),
  emoji: z.string().regex(/^(\p{Extended_Pictographic}|\p{Emoji_Component})+$/u, { message: "Deve ser um emoji válido." }).describe("Um emoji que represente a atividade."),
  type: z.enum(['school_entry', 'school_exit', 'extra_activity', 'essential_routine', 'free_time']).describe("O tipo de atividade."),
  category: z.custom<typeof missionCategories[number]['id']>((val) => missionCategories.map(rc => rc.id).includes(val as any)).describe("A categoria da atividade (ex: 'school', 'health', 'hobbies')."),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: "Formato de hora inválido. Use HH:mm." }).describe("A hora de início no formato HH:mm."),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: "Formato de hora inválido. Use HH:mm." }).describe("A hora de término no formato HH:mm."),
  days: z.array(z.enum(['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'])).describe("Uma lista dos dias da semana em que a atividade ocorre."),
});

// Define o esquema de entrada para a IA, detalhando as informações necessárias.
export const GenerateScheduleInputSchema = z.object({
  childName: z.string().describe("O nome da criança."),
  childAge: z.number().describe("A idade da criança em anos."),
  schoolShift: z.enum(['morning', 'afternoon', 'full_time', 'not_applicable']).describe("O turno escolar da criança."),
  schoolStartTime: z.string().optional().describe("A hora de início da escola (HH:mm), se aplicável."),
  schoolEndTime: z.string().optional().describe("A hora de término da escola (HH:mm), se aplicável."),
  wakeUpTime: z.string().describe("A hora que a criança acorda (HH:mm)."),
  lunchTime: z.string().describe("A hora do almoço (HH:mm)."),
  dinnerTime: z.string().describe("A hora do jantar (HH:mm)."),
  sleepTime: z.string().describe("A hora de dormir (HH:mm)."),
  extraActivities: z.array(z.object({
    name: z.string(),
    days: z.array(z.string()),
    time: z.string(),
  })).optional().describe("Lista de atividades extracurriculares com seus dias e horários."),
  essentialRoutines: z.array(z.string()).optional().describe("Lista de tarefas diárias essenciais a serem incluídas na rotina."),
});
export type GenerateScheduleInput = z.infer<typeof GenerateScheduleInputSchema>;

// Define o esquema de saída que a IA deve gerar.
export const GenerateScheduleOutputSchema = z.object({
  schedule: z.array(ScheduleItemSchema).describe("A rotina semanal estruturada e completa, de Segunda a Domingo."),
  freeTimeSummary: z.string().describe("Um breve resumo sobre os principais blocos de tempo livre identificados para a criança e qualquer nota sobre conflitos de agendamento."),
});
export type GenerateScheduleOutput = z.infer<typeof GenerateScheduleOutputSchema>;


const generateSchedulePrompt = ai.definePrompt({
    name: 'generateSchedulePrompt',
    input: { schema: GenerateScheduleInputSchema },
    output: { schema: GenerateScheduleOutputSchema },
    prompt: `Você é um especialista em pedagogia e organização de rotinas infantis. Sua tarefa é criar uma rotina semanal detalhada e equilibrada para uma criança chamada {{{childName}}}, de {{{childAge}}} anos, com base nas informações fornecidas.

    **HORÁRIOS DE ÂNCORA FIXOS:**
    - Hora de Acordar: {{{wakeUpTime}}}
    - Hora do Almoço: {{{lunchTime}}}
    - Hora do Jantar: {{{dinnerTime}}}
    - Hora de Dormir: {{{sleepTime}}}

    **INFORMAÇÕES ESCOLARES:**
    - Turno Escolar: {{{schoolShift}}}
    {{#if schoolStartTime}}- Horário da Escola: de {{{schoolStartTime}}} até {{{schoolEndTime}}}{{/if}}

    **ATIVIDADES EXTRAS COM HORÁRIO FIXO:**
    {{#each extraActivities}}
    - {{{this.name}}} às {{{this.time}}} em {{{this.days}}}
    {{else}}
    - Nenhuma atividade extra cadastrada.
    {{/each}}

    **ROTINAS ESSENCIAIS A SEREM INCLUÍDAS:**
    {{#each essentialRoutines}}
    - {{{this}}}
    {{else}}
    - Nenhuma rotina essencial selecionada.
    {{/each}}

    **INSTRUÇÕES DETALHADAS:**

    1.  **ESTRUTURA DA AGENDA:** Sua resposta DEVE ser um objeto JSON válido que corresponda ao esquema de saída fornecido. A chave principal é "schedule", que é um array de objetos.
    2.  **PREENCHIMENTO HIERÁRQUICO:** Preencha a agenda na seguinte ordem de prioridade:
        a.  **Escola:** Se o turno não for 'not_applicable', adicione um bloco "Escola" nos dias de semana (MO, TU, WE, TH, FR) no horário fornecido. Use o emoji "🏫" e a categoria "school".
        b.  **Atividades Extras:** Adicione CADA atividade extra da lista nos dias e horários especificados. Assuma que cada atividade dura 60 minutos.
        c.  **Rotinas Essenciais:** Pegue CADA item da lista "ROTINAS ESSENCIAIS" e distribua-os LOGICAMENTE ao redor dos horários de âncora. Por exemplo:
            - "Arrumar a cama" e "Tomar café" devem ser perto de "Hora de Acordar".
            - "Tomar banho" e "Organizar a mochila" devem ser perto de "Hora de Dormir".
            - "Fazer a lição de casa" deve ser em um bloco de tempo livre, preferencialmente à tarde.
            - **IMPORTANTE:** Para cada rotina, use o emoji e a categoria corretos da lista de referência abaixo.
        d.  **Tempo Livre:** Preencha TODOS os espaços restantes na agenda com a atividade "Hora livre para brincar", usando o emoji "🧩" e a categoria "hobbies".
    3.  **REGRAS DE EMOJI E CATEGORIA (MUITO IMPORTANTE):**
        - O campo "emoji" DEVE conter APENAS o caractere do emoji, sem nenhum texto ou espaço adicional.
        - Use a lista de referência abaixo para encontrar o emoji e a categoria corretos para cada atividade.

    **LISTA DE REFERÊNCIA DE EMOJIS E CATEGORIAS:**
    - Hora de acordar: ⏰ (essential_routines)
    - Arrumar a cama: 🛏️ (essential_routines)
    - Tomar café da manhã: ☕ (essential_routines)
    - Escovar os dentes: 🦷 (health)
    - Almoçar: 🍽️ (essential_routines)
    - Jantar: 🍽️ (essential_routines)
    - Tomar banho: 🛁 (essential_routines)
    - Hora de dormir: 🛌 (essential_routines)
    - Fazer a lição de casa: ✍️ (school)
    - Organizar a mochila para amanhã: 🎒 (school)
    - Aula de Natação: 🏊 (hobbies)
    - Aula de Futebol: ⚽ (hobbies)
    - Aula de Judô: 🥋 (hobbies)
    - Aula de Dança: 💃 (hobbies)
    - Aula de Inglês: 🇬🇧 (languages)
    - Psicologia Infantil: 🧠 (health)
    - Terapia Ocupacional (TO): 👐 (health)
    - Fonoaudiologia: 🗣️ (health)
    - Psicomotricidade: 🤸 (health)
    - Aula de Bateria: 🥁 (hobbies)
    - Aula de Violão: 🎸 (hobbies)

    4.  **Resumo do Tempo Livre:** No campo "freeTimeSummary", escreva uma frase curta resumindo os principais blocos de tempo livre de {{{childName}}}.`
});


// Função principal que é exportada e chamada pela aplicação.
export async function generateSchedule(input: GenerateScheduleInput): Promise<GenerateScheduleOutput> {
  const { output } = await generateSchedulePrompt(input);
  
  if (!output) {
      throw new Error("A IA não conseguiu gerar uma agenda com os dados fornecidos.");
  }
  
  // Garante que a saída esteja em conformidade com o esquema antes de retornar.
  return GenerateScheduleOutputSchema.parse(output);
}
`
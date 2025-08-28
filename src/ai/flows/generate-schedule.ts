
'use server';
/**
 * @fileOverview Um fluxo de IA para gerar uma rotina semanal para uma criança.
 *
 * Este fluxo usa o modelo Gemini para criar uma agenda estruturada com base nas informações
 * fornecidas sobre a criança, como idade, turno escolar e atividades. A IA é instruída a seguir
 * uma lógica hierárquica e a usar uma lista de missões pré-definidas como sua base de conhecimento.
 *
 * - generateSchedule - A função principal que gera a agenda.
 * - GenerateScheduleInput - O tipo de entrada para a função.
 * - GenerateScheduleOutput - O tipo de retorno para a função.
 */
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import type { Weekday, SchoolShift } from '@/lib/types';
import { missionCategories } from '@/lib/types';
import { predefinedMissionGroups } from '@/lib/predefined-missions'; // Importa a lista de missões

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
const GenerateScheduleInputSchema = z.object({
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
  missionReference: z.string().describe("A lista de referência de missões que a IA deve usar."),
});
export type GenerateScheduleInput = z.infer<typeof GenerateScheduleInputSchema>;

// Define o esquema de saída que a IA deve gerar.
const GenerateScheduleOutputSchema = z.object({
  schedule: z.array(ScheduleItemSchema).describe("A rotina semanal estruturada e completa, de Segunda a Domingo."),
  freeTimeSummary: z.string().describe("Um breve resumo sobre os principais blocos de tempo livre identificados para a criança e qualquer nota sobre conflitos de agendamento."),
});
export type GenerateScheduleOutput = z.infer<typeof GenerateScheduleOutputSchema>;


const generateSchedulePrompt = ai.definePrompt({
    name: 'generateSchedulePrompt',
    input: { schema: GenerateScheduleInputSchema },
    output: { schema: GenerateScheduleOutputSchema },
    prompt: `Você é um especialista em pedagogia e organização de rotinas infantis. Sua tarefa é criar uma rotina semanal detalhada e equilibrada para {{{childName}}}, de {{{childAge}}} anos.

    **INFORMAÇÕES DA CRIANÇA:**
    - Turno Escolar: {{{schoolShift}}}
    {{#if schoolStartTime}}- Horário Escolar: de {{{schoolStartTime}}} até {{{schoolEndTime}}}{{/if}}
    - Horários Fixos: Acorda às {{{wakeUpTime}}}, Almoça às {{{lunchTime}}}, Janta às {{{dinnerTime}}}, Dorme às {{{sleepTime}}}.
    - Atividades Extras: {{#each extraActivities}} {{{this.name}}} ({{this.days}} às {{this.time}}); {{else}}Nenhuma;{{/each}}
    - Rotinas Essenciais: {{#each essentialRoutines}} {{{this}}}; {{else}}Nenhuma;{{/each}}

    **REGRAS DE OURO (LÓGICA DE AGENDAMENTO HIERÁRQUICO):**

    1.  **NÍVEL 1 - ESCOLA (Inadiável):** Primeiro, aloque o bloco "Escola" na agenda, de Segunda a Sexta, no horário informado. Este é o bloco mais importante.
    2.  **NÍVEL 2 - COMPROMISSOS (Atividades Extras):** Em seguida, aloque CADA atividade extra. **Se o horário de uma atividade extra conflitar com o horário escolar, IGNORE esta atividade** e adicione uma nota sobre o conflito no campo \`freeTimeSummary\`. Assuma que cada atividade dura 60 minutos.
    3.  **NÍVEL 3 - ROTINAS ESSENCIAIS:** Distribua as rotinas essenciais de forma lógica ao redor dos horários fixos. Por exemplo, "Arrumar a cama" perto da hora de acordar. Se o horário já estiver ocupado por uma atividade extra, tente encaixar a rotina no próximo horário livre.
    4.  **NÍVEL 4 - TEMPO LIVRE:** Após alocar todos os itens acima, preencha TODOS os horários vazios com a atividade "Hora livre para brincar".

    **LISTA DE REFERÊNCIA DE MISSÕES (MUITO IMPORTANTE):**
    Para cada atividade, você DEVE usar o emoji e a categoria EXATOS da lista abaixo. O campo 'emoji' DEVE conter apenas o caractere do emoji. NÃO INVENTE ou ALTERE estes valores.
    {{{missionReference}}}

    **FORMATO DE SAÍDA:** Sua resposta DEVE ser um objeto JSON válido que corresponda ao esquema de saída definido.

    Agora, gere a agenda completa.`
});


// Função principal que é exportada e chamada pela aplicação.
export async function generateSchedule(input: Omit<GenerateScheduleInput, 'missionReference'>): Promise<GenerateScheduleOutput> {
  const MAX_RETRIES = 3;
  let attempt = 0;

  // Constrói a lista de referência de missões dinamicamente
  const missionReference = predefinedMissionGroups
    .flatMap(group => group.items)
    .map(item => `- ${item.title}: emoji ${item.emoji}, categoria ${item.suggestedAppCategory}`)
    .join('\n');

  const fullInput = { ...input, missionReference };

  while (attempt < MAX_RETRIES) {
    try {
      const { output } = await generateSchedulePrompt(fullInput);
      if (!output) {
        throw new Error("A IA não conseguiu gerar uma agenda com os dados fornecidos.");
      }
      // Garante que a saída esteja em conformidade com o esquema antes de retornar.
      // Se a validação falhar, o catch abaixo irá capturar e tentar novamente.
      return GenerateScheduleOutputSchema.parse(output);
    } catch (error: any) {
      attempt++;
      console.error(`Tentativa ${attempt} falhou:`, error.message);
      if (attempt >= MAX_RETRIES) {
          throw new Error("Não foi possível gerar a agenda no momento. O serviço pode estar sobrecarregado ou a resposta foi inválida. Por favor, tente novamente mais tarde.");
      }
      // Espera um pouco antes de tentar novamente, com um pequeno aumento a cada tentativa.
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }

  // Este ponto não deve ser alcançado devido ao erro lançado dentro do loop,
  // mas está aqui como um fallback para garantir que a função sempre retorne ou lance um erro.
  throw new Error("Falha ao gerar agenda após múltiplas tentativas.");
}

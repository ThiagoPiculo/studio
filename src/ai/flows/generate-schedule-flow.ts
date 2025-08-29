
/**
 * @fileOverview Um fluxo de IA para gerar uma rotina semanal para uma criança.
 *
 * Este fluxo usa o modelo Gemini para criar uma agenda estruturada com base nas informações
 * fornecidas sobre a criança, como idade, turno escolar e atividades.
 *
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

// Define o esquema para cada item da agenda, garantindo uma estrutura consistente.
// Simplificado para facilitar a geração pela IA. A validação e mapeamento final ocorrem no código.
const ScheduleItemSchema = z.object({
  activity: z.string().describe("O nome da atividade sugerida (ex: 'Arrumar a cama', 'Tomar banho')."),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: "Formato de hora inválido. Use HH:mm." }).describe("A hora de início sugerida no formato HH:mm."),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: "Formato de hora inválido. Use HH:mm." }).describe("A hora de término sugerida no formato HH:mm."),
  days: z.array(z.enum(['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'])).optional().describe("Uma lista dos dias da semana sugeridos para a atividade."),
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
  extraActivities: z.string().optional().describe("Uma string de texto descrevendo as atividades extracurriculares já agendadas, seus dias e horários. Ex: 'Natação (Seg, Qua) às 16:00; Inglês (Ter, Qui) às 10:00'."),
  essentialRoutines: z.array(z.string()).optional().describe("Lista de tarefas diárias essenciais a serem incluídas na rotina."),
});
export type GenerateScheduleInput = z.infer<typeof GenerateScheduleInputSchema>;

// Define o esquema de saída que a IA deve gerar.
export const GenerateScheduleOutputSchema = z.object({
  schedule: z.array(ScheduleItemSchema).describe("Uma lista de sugestões de atividades para a rotina."),
});
export type GenerateScheduleOutput = z.infer<typeof GenerateScheduleOutputSchema>;

const generateSchedulePrompt = ai.definePrompt({
    name: 'generateSchedulePrompt',
    input: { schema: GenerateScheduleInputSchema },
    output: { schema: GenerateScheduleOutputSchema },
    prompt: `Você é a Aura, uma IA especialista em psicologia infantil. Sua missão é sugerir horários para uma lista de rotinas essenciais de uma criança.

    **INFORMAÇÕES DA CRIANÇA:**
    - Nome: {{{childName}}}, Idade: {{{childAge}}} anos.
    - Acorda: {{{wakeUpTime}}}, Almoça: {{{lunchTime}}}, Janta: {{{dinnerTime}}}, Dorme: {{{sleepTime}}}.
    
    **ROTINAS PARA AGENDAR:**
    {{#each essentialRoutines}}
    - {{{this}}}
    {{/each}}
    
    **INSTRUÇÕES:**
    1.  Para cada rotina da lista "ROTINAS PARA AGENDAR", sugira um horário de início e fim lógicos. Por exemplo, "Arrumar a cama" deve ser perto da hora de acordar.
    2.  Use o bom senso para a duração. "Escovar os dentes" dura 5 minutos. "Tomar banho" dura 15 minutos.
    3.  Para a maioria das rotinas, sugira todos os dias da semana (de MO a SU).
    4.  Retorne APENAS a lista de rotinas com os horários sugeridos. Não inclua a escola nem as atividades extras na sua resposta.

    **FORMATO DE SAÍDA:** Sua resposta DEVE ser um objeto JSON válido que corresponda ao esquema de saída definido.

    Agora, gere as sugestões de horário para as rotinas.`
});


export const generateScheduleFlow = ai.defineFlow(
    {
        name: 'generateScheduleFlow',
        inputSchema: GenerateScheduleInputSchema,
        outputSchema: GenerateScheduleOutputSchema,
    },
    async (input) => {
        const MAX_RETRIES = 3;
        let lastError: any = null;

        for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
            try {
                const { output } = await generateSchedulePrompt(input);
                if (!output) {
                    throw new Error("A IA não retornou uma resposta.");
                }
                // Tenta validar a resposta da IA. Se falhar, o catch tratará.
                const parsedOutput = GenerateScheduleOutputSchema.parse(output);
                return parsedOutput;

            } catch (error) {
                lastError = error;
                console.error(`Tentativa ${attempt + 1} de ${MAX_RETRIES} falhou:`, error);
                
                if (attempt >= MAX_RETRIES - 1) {
                    // Lança o erro final na última tentativa
                     throw new Error("Não foi possível gerar a agenda no momento. O serviço pode estar sobrecarregado ou a resposta foi inválida. Por favor, tente novamente mais tarde.");
                }
                // Espera um pouco antes de tentar novamente.
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        
        // Este código é teoricamente inalcançável por causa do throw dentro do loop.
        // Mas está aqui como um fallback de segurança.
        console.error("Falha final ao gerar agenda:", lastError);
        throw new Error("Não foi possível gerar a agenda no momento. O serviço pode estar sobrecarregado ou a resposta foi inválida. Por favor, tente novamente mais tarde.");
    }
);

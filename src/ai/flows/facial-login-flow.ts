
'use server';
/**
 * @fileOverview Um flow Genkit simulado para "verificação facial".
 * Este flow NÃO realiza reconhecimento facial real ou autenticação biométrica.
 * Ele apenas usa um modelo de visão para detectar se um rosto humano está presente na imagem.
 *
 * - facialLoginFlow - Função que processa a imagem para detecção de rosto.
 * - FacialLoginInput - O tipo de entrada para a função.
 * - FacialLoginOutput - O tipo de retorno da função.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

// Define o schema de entrada para o flow
const FacialLoginInputSchema = z.object({
  imageDataUri: z.string().describe("A imagem capturada pela webcam, como uma data URI (JPEG). Expected format: 'data:image/jpeg;base64,<encoded_data>'."),
  accessCode: z.string().length(6).describe("O código de acesso de 6 dígitos da criança."),
});
export type FacialLoginInput = z.infer<typeof FacialLoginInputSchema>;

// Define o schema de saída para o flow
const FacialLoginOutputSchema = z.object({
  success: z.boolean().describe("Indica se um rosto foi detectado com sucesso."),
  message: z.string().describe("Uma mensagem descrevendo o resultado da verificação."),
});
export type FacialLoginOutput = z.infer<typeof FacialLoginOutputSchema>;

// Exporta a função principal que invoca o flow
export async function facialLoginFlow(input: FacialLoginInput): Promise<FacialLoginOutput> {
  return await processFacialImageFlow(input);
}

// Define o prompt para o modelo de visão
const facialDetectionPrompt = ai.definePrompt({
  name: 'facialDetectionPrompt',
  input: { schema: FacialLoginInputSchema }, 
  output: { schema: z.object({ detected: z.boolean(), reason: z.string() }) }, // Esquema de saída do prompt
  prompt: [
    { media: { url: '{{{imageDataUri}}}' } },
    { text: "Esta imagem contém um rosto humano claramente visível? Responda apenas com 'SIM' ou 'NÃO'." },
  ],
  // Usar o modelo 'gemini-pro-vision' ou um modelo multimodal adequado.
  // O modelo padrão em genkit.ts ('gemini-2.0-flash') é multimodal.
  // config: { model: 'googleai/gemini-pro-vision' } // Descomente se precisar de um modelo específico
});


// Define o flow Genkit
const processFacialImageFlow = ai.defineFlow(
  {
    name: 'processFacialImageFlow',
    inputSchema: FacialLoginInputSchema,
    outputSchema: FacialLoginOutputSchema,
  },
  async (input) => {
    try {
      // Neste ponto, o accessCode não é usado diretamente na lógica de IA do flow,
      // mas é incluído no input para potencial uso futuro ou logging.
      // A autenticação real do código de acesso ocorre no cliente após esta verificação.

      const llmResponse = await ai.generate({ // usando ai.generate diretamente
        prompt: [
          { media: { url: input.imageDataUri } },
          { text: "Esta imagem contém um rosto humano claramente visível e centralizado? Responda apenas com 'SIM' ou 'NÃO'." },
        ],
        // O modelo já está definido globalmente em genkit.ts como gemini-2.0-flash
        // Se precisar de um modelo específico para visão, pode especificar aqui:
        // model: 'googleai/gemini-pro-vision', 
      });
      
      const llmTextOutput = llmResponse.text?.trim().toUpperCase();

      if (llmTextOutput === 'SIM') {
        return {
          success: true,
          message: "Rosto detectado com sucesso.",
        };
      } else if (llmTextOutput === 'NÃO') {
        return {
          success: false,
          message: "Nenhum rosto claramente visível foi detectado. Tente novamente, garantindo boa iluminação e que o rosto esteja centralizado.",
        };
      } else {
        // Resposta inesperada do LLM
        console.warn("Resposta inesperada do LLM para detecção facial:", llmResponse.text);
        return {
          success: false,
          message: "Não foi possível determinar a presença de um rosto. Tente novamente.",
        };
      }
    } catch (error) {
      console.error('Erro no flow de processamento de imagem facial:', error);
      return {
        success: false,
        message: 'Ocorreu um erro durante a análise da imagem. Por favor, tente novamente.',
      };
    }
  }
);

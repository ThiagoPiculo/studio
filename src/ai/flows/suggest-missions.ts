
// src/ai/flows/suggest-missions.ts
'use server';

/**
 * @fileOverview Um agente de IA que sugere missões para crianças com base na idade e interesses.
 *
 * - suggestMissions - Uma função que lida com o processo de sugestão de missões.
 * - SuggestMissionsInput - O tipo de entrada para a função suggestMissions.
 * - SuggestMissionsOutput - O tipo de retorno para a função suggestMissions.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestMissionsInputSchema = z.object({
  childAge: z.number().describe('A idade da criança em anos.'),
  childInterests: z
    .string()
    .describe('Uma lista dos interesses da criança, separados por vírgula.'),
});
export type SuggestMissionsInput = z.infer<typeof SuggestMissionsInputSchema>;

const SuggestMissionsOutputSchema = z.object({
  missions: z
    .array(z.string())
    .describe('Uma lista de missões sugeridas apropriadas para a criança.'),
});
export type SuggestMissionsOutput = z.infer<typeof SuggestMissionsOutputSchema>;

export async function suggestMissions(input: SuggestMissionsInput): Promise<SuggestMissionsOutput> {
  return suggestMissionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestMissionsPrompt',
  input: {schema: SuggestMissionsInputSchema},
  output: {schema: SuggestMissionsOutputSchema},
  prompt: `Você é um assistente prestativo para pais. Sua tarefa é sugerir atividades (chamadas de "missões") apropriadas para a idade das crianças para encorajar a formação de hábitos positivos.

  Considere a idade e os interesses da criança ao gerar a lista de missões.
  Forneça uma lista diversificada de missões, cobrindo áreas como tarefas domésticas, aprendizado, atividades criativas e saúde.

  Idade da Criança: {{{childAge}}}
  Interesses da Criança: {{{childInterests}}}

  Por favor, sugira missões no seguinte formato JSON, preenchendo o campo "missions".
`,
});

const suggestMissionsFlow = ai.defineFlow(
  {
    name: 'suggestMissionsFlow',
    inputSchema: SuggestMissionsInputSchema,
    outputSchema: SuggestMissionsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    const missions = output!.missions;

    return {
      missions,
    };
  }
);

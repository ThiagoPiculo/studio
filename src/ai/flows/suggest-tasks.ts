
// src/ai/flows/suggest-tasks.ts
'use server';

/**
 * @fileOverview Um agente de IA que sugere tarefas para crianças com base na idade e interesses.
 *
 * - suggestTasks - Uma função que lida com o processo de sugestão de tarefas.
 * - SuggestTasksInput - O tipo de entrada para a função suggestTasks.
 * - SuggestTasksOutput - O tipo de retorno para a função suggestTasks.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestTasksInputSchema = z.object({
  childAge: z.number().describe('A idade da criança em anos.'),
  childInterests: z
    .string()
    .describe('Uma lista dos interesses da criança, separados por vírgula.'),
});
export type SuggestTasksInput = z.infer<typeof SuggestTasksInputSchema>;

const SuggestTasksOutputSchema = z.object({
  tasks: z
    .array(z.string())
    .describe('Uma lista de tarefas sugeridas apropriadas para a criança.'),
});
export type SuggestTasksOutput = z.infer<typeof SuggestTasksOutputSchema>;

export async function suggestTasks(input: SuggestTasksInput): Promise<SuggestTasksOutput> {
  return suggestTasksFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestTasksPrompt',
  input: {schema: SuggestTasksInputSchema},
  output: {schema: SuggestTasksOutputSchema},
  prompt: `Você é um assistente prestativo para pais. Sua tarefa é sugerir atividades apropriadas para a idade das crianças para encorajar a formação de hábitos positivos.

  Considere a idade e os interesses da criança ao gerar a lista de tarefas.
  Forneça uma lista diversificada de tarefas, cobrindo áreas como tarefas domésticas, aprendizado, atividades criativas e saúde.

  Idade da Criança: {{{childAge}}}
  Interesses da Criança: {{{childInterests}}}

  Por favor, sugira tarefas no seguinte formato:
  - Tarefa 1
  - Tarefa 2
  - Tarefa 3
`,
});

const suggestTasksFlow = ai.defineFlow(
  {
    name: 'suggestTasksFlow',
    inputSchema: SuggestTasksInputSchema,
    outputSchema: SuggestTasksOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    //splitting into lines
    const tasks = output!.tasks

    return {
      tasks,
    };
  }
);

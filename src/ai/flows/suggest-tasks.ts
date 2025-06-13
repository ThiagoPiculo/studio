// src/ai/flows/suggest-tasks.ts
'use server';

/**
 * @fileOverview An AI agent that suggests tasks for children based on their age and interests.
 *
 * - suggestTasks - A function that handles the task suggestion process.
 * - SuggestTasksInput - The input type for the suggestTasks function.
 * - SuggestTasksOutput - The return type for the suggestTasks function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestTasksInputSchema = z.object({
  childAge: z.number().describe('The age of the child in years.'),
  childInterests: z
    .string()
    .describe('A comma-separated list of the child\'s interests.'),
});
export type SuggestTasksInput = z.infer<typeof SuggestTasksInputSchema>;

const SuggestTasksOutputSchema = z.object({
  tasks: z
    .array(z.string())
    .describe('A list of suggested tasks appropriate for the child.'),
});
export type SuggestTasksOutput = z.infer<typeof SuggestTasksOutputSchema>;

export async function suggestTasks(input: SuggestTasksInput): Promise<SuggestTasksOutput> {
  return suggestTasksFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestTasksPrompt',
  input: {schema: SuggestTasksInputSchema},
  output: {schema: SuggestTasksOutputSchema},
  prompt: `You are a helpful assistant for parents. Your task is to suggest age-appropriate tasks for children to encourage positive habit formation.

  Consider the child's age and interests when generating the list of tasks.
  Provide a diverse list of tasks, covering areas like chores, learning, creative activities and health.

  Child's Age: {{{childAge}}}
  Child's Interests: {{{childInterests}}}

  Please suggest tasks in the following format:
  - Task 1
  - Task 2
  - Task 3
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

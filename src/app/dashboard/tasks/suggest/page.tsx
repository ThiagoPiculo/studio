
// src/app/dashboard/tasks/suggest/page.tsx
"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { suggestTasks, type SuggestTasksInput, type SuggestTasksOutput } from '@/ai/flows/suggest-tasks';
import { Loader2, Lightbulb, Wand2, ListPlus } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const suggestTasksFormSchema = z.object({
  childAge: z.coerce
    .number()
    .min(1, { message: 'A idade deve ser de pelo menos 1 ano.' })
    .max(18, { message: 'A idade não pode ser superior a 18 anos.' }),
  childInterests: z
    .string()
    .min(3, { message: 'Descreva pelo menos um interesse.' })
    .max(200, { message: 'Os interesses não devem exceder 200 caracteres.' }),
});

type SuggestTasksFormValues = z.infer<typeof suggestTasksFormSchema>;

export default function SuggestTasksPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [suggestedTasks, setSuggestedTasks] = useState<string[]>([]);

  const form = useForm<SuggestTasksFormValues>({
    resolver: zodResolver(suggestTasksFormSchema),
    defaultValues: {
      childAge: undefined,
      childInterests: '',
    },
  });

  const onSubmit = async (values: SuggestTasksFormValues) => {
    setIsLoading(true);
    setSuggestedTasks([]); // Clear previous suggestions
    try {
      const input: SuggestTasksInput = {
        childAge: values.childAge,
        childInterests: values.childInterests,
      };
      const result: SuggestTasksOutput = await suggestTasks(input);
      if (result.tasks && result.tasks.length > 0) {
        setSuggestedTasks(result.tasks);
        toast({
          title: 'Sugestões Geradas!',
          description: 'Aqui estão algumas ideias de tarefas para você.',
        });
      } else {
        setSuggestedTasks([]);
        toast({
          title: 'Nenhuma Sugestão',
          description: 'A IA não retornou sugestões desta vez. Tente refinar os interesses.',
          variant: 'default',
        });
      }
    } catch (error) {
      console.error('Error suggesting tasks:', error);
      setSuggestedTasks([]);
      toast({
        title: 'Erro ao Gerar Sugestões',
        description: 'Não foi possível obter sugestões da IA. Tente novamente mais tarde.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-xl">
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            <Lightbulb className="h-10 w-10 text-accent" />
            <div>
              <CardTitle className="text-3xl font-headline">Gerador de Tarefas com IA</CardTitle>
              <CardDescription className="text-md">
                Precisa de inspiração? Descreva a idade e os interesses da criança para receber sugestões de tarefas personalizadas.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FormField
                  control={form.control}
                  name="childAge"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Idade da Criança</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="Ex: 7" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="md:col-span-2">
                  <FormField
                    control={form.control}
                    name="childInterests"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Interesses da Criança</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Ex: dinossauros, desenhar, jogos de tabuleiro"
                            className="resize-none"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              <Button type="submit" className="w-full md:w-auto" disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Wand2 className="mr-2 h-4 w-4" />
                )}
                Sugerir Tarefas
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {isLoading && (
        <Card>
          <CardHeader>
            <CardTitle>Gerando sugestões...</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-10 w-full rounded-md" />
            ))}
          </CardContent>
        </Card>
      )}

      {!isLoading && suggestedTasks.length > 0 && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl">Tarefas Sugeridas</CardTitle>
            <CardDescription>Aqui estão algumas ideias. Você pode usá-las como base para criar tarefas reais.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {suggestedTasks.map((task, index) => (
                <li key={index} className="flex items-center justify-between gap-4 p-3 bg-muted/50 rounded-md border">
                  <span className="flex-grow">{task.startsWith('- ') ? task.substring(2) : task}</span>
                  <Button variant="outline" size="sm" onClick={() => toast({ title: "Funcionalidade Futura", description: "Em breve você poderá adicionar esta tarefa diretamente!"})}>
                    <ListPlus className="mr-2 h-4 w-4" />
                    Usar Tarefa
                  </Button>
                </li>
              ))}
            </ul>
          </CardContent>
          <CardFooter>
            <p className="text-xs text-muted-foreground">
              Lembre-se que estas são apenas sugestões. Adapte-as conforme necessário para seu Mini Heroi!
            </p>
          </CardFooter>
        </Card>
      )}
       {!isLoading && suggestedTasks.length === 0 && form.formState.isSubmitted && (
        <Card>
          <CardHeader>
            <CardTitle>Nenhuma Sugestão Encontrada</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              A IA não conseguiu gerar sugestões com os dados fornecidos. Tente alterar a idade ou os interesses e tente novamente.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

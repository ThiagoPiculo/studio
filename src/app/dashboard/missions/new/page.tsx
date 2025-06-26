
"use client";

import { Suspense, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useFamily } from '@/contexts/FamilyContext';
import { addMissionTemplate } from '@/lib/firebase/firestore';
import type { MissionCategory, MissionTemplate } from '@/lib/types';
import { missionCategories } from '@/lib/types'; 
import { Loader2, ListChecks, ArrowLeft, Star as StarIcon, BadgeCheck, Lightbulb } from 'lucide-react';
import Link from 'next/link';

const missionTemplateFormSchema = z.object({
  title: z.string().min(3, { message: "O título deve ter pelo menos 3 caracteres." }).max(100, { message: "O título não deve exceder 100 caracteres." }),
  description: z.string().max(500, { message: "A descrição não deve exceder 500 caracteres." }).optional().default(''),
  category: z.custom<MissionCategory>((val) => missionCategories.map(rc => rc.id).includes(val as MissionCategory) , {
    message: "Selecione uma categoria válida.",
  }),
  starsReward: z.coerce.number().min(0, { message: "A recompensa não pode ser negativa." }).max(1000, {message: "A recompensa não pode ser superior a 1000 estrelas."}),
  xpReward: z.coerce.number().min(0, { message: "A recompensa não pode ser negativa." }).max(1000, {message: "A recompensa não pode ser superior a 1000 XP."}),
});

type MissionTemplateFormValues = z.infer<typeof missionTemplateFormSchema>;

function CreateMissionTemplatePageContent() {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { currentContext } = useFamily();
  const [isLoading, setIsLoading] = useState(false);

  const initialTitle = searchParams.get('title') || '';
  const categoryParam = searchParams.get('category') as MissionCategory | null;
  let resolvedInitialCategory: MissionCategory | undefined = undefined;
  if (categoryParam && missionCategories.some(rc => rc.id === categoryParam)) {
    resolvedInitialCategory = categoryParam;
  }

  const form = useForm<MissionTemplateFormValues>({
    resolver: zodResolver(missionTemplateFormSchema),
    defaultValues: {
      title: initialTitle,
      description: '',
      category: resolvedInitialCategory, 
      starsReward: 5,
      xpReward: 10,
    },
  });

  const onSubmit = async (values: MissionTemplateFormValues) => {
    if (!user) {
      toast({ title: "Erro de Autenticação", description: "Você precisa estar logado.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const templateDataPayload: Omit<MissionTemplate, 'id' | 'createdAt' | 'updatedAt' | 'status'> = {
        ownerId: user.uid,
        familyId: currentContext === 'my-space' ? null : currentContext,
        title: values.title,
        description: values.description,
        category: values.category,
        starsReward: values.starsReward,
        xpReward: values.xpReward,
      };
      
      await addMissionTemplate(templateDataPayload);
      toast({
        title: 'Missão Adicionada ao Catálogo!',
        description: `A missão "${values.title}" está pronta para ser atribuída.`,
      });
      router.push('/dashboard/missions');
    } catch (error) {
      console.error('Error creating mission template:', error);
      toast({
        title: 'Erro ao Criar Missão',
        description: 'Não foi possível criar a missão. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-10">
      <div className="flex flex-wrap gap-2 justify-between items-center mb-4">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
        </Button>
        <Link href="/dashboard/missions/ideas">
          <Button variant="outline">
            <Lightbulb className="mr-2 h-4 w-4" /> Ver Ideias de Missões
          </Button>
        </Link>
      </div>
      <Card className="shadow-xl">
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            <ListChecks className="h-10 w-10 text-primary" />
            <div>
              <CardTitle className="text-3xl font-headline">Criar Nova Missão</CardTitle>
              <CardDescription className="text-md">
                Defina uma nova missão para o catálogo. Depois você poderá atribuí-la aos Mini Herois.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Título da Missão</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Arrumar a cama todas as manhãs" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição (Opcional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Detalhes sobre a missão, como 'Deixar o travesseiro e o lençol bem esticados'."
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma categoria..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {missionCategories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                             <div className="flex items-center">
                               <category.icon className={`mr-2 h-4 w-4 ${category.colorClasses.split(" ")[1]}`} />
                               <span>{category.label}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="starsReward"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5"><StarIcon className="text-yellow-500"/> Recompensa em Estrelas</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="Ex: 5" {...field} />
                      </FormControl>
                       <FormDescription>
                        Estrelas que o herói ganha.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="xpReward"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5"><BadgeCheck className="text-blue-500" /> Recompensa em XP</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="Ex: 10" {...field} />
                      </FormControl>
                      <FormDescription>
                        Pontos para subir de nível.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <Button type="submit" className="w-full md:w-auto" disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ListChecks className="mr-2 h-4 w-4" />
                )}
                Criar Missão
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function CreateMissionPage() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center min-h-screen"><Loader2 className="h-12 w-12 animate-spin text-primary" /><p className="ml-3">Carregando...</p></div>}>
            <CreateMissionTemplatePageContent />
        </Suspense>
    )
}

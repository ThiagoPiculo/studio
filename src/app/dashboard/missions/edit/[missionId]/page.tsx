
"use client";

import { useState, useEffect } from 'react';
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
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getMissionTemplateById, updateMissionTemplate } from '@/lib/firebase/firestore';
import type { MissionCategory, MissionTemplate, RecurrenceRule } from '@/lib/types';
import { missionCategories, weekdays } from '@/lib/types'; 
import { Loader2, Target, Save, ArrowLeft, Star as StarIcon, BadgeCheck } from 'lucide-react';
import { RecurrenceControl } from '@/components/dashboard/missions/RecurrenceControl';
import { Timestamp } from 'firebase/firestore';

const recurrenceRuleSchema = z.object({
  freq: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']),
  interval: z.coerce.number().min(1),
  byDay: z.array(z.enum(weekdays)).optional(),
  endDate: z.date().optional().nullable(),
  count: z.coerce.number().min(1).optional().nullable(),
}).nullable();


const missionTemplateFormSchema = z.object({
  title: z.string().min(3, { message: "O título deve ter pelo menos 3 caracteres." }).max(100, { message: "O título não deve exceder 100 caracteres." }),
  description: z.string().max(500, { message: "A descrição não deve exceder 500 caracteres." }).optional().default(''),
  category: z.custom<MissionCategory>((val) => missionCategories.map(rc => rc.id).includes(val as MissionCategory) , {
    message: "Selecione uma categoria válida.",
  }),
  starsReward: z.coerce.number().min(0, { message: "A recompensa não pode ser negativa." }).max(1000, {message: "A recompensa não pode ser superior a 1000 estrelas."}),
  xpReward: z.coerce.number().min(0, { message: "A recompensa não pode ser negativa." }).max(1000, {message: "A recompensa não pode ser superior a 1000 XP."}),
  status: z.enum(['active', 'archived']).default('active'),
  
  isRecurring: z.boolean().default(false),
  startDate: z.date().optional().nullable(),
  dueDate: z.date().optional().nullable(),
  recurrenceRule: recurrenceRuleSchema,
}).superRefine((data, ctx) => {
    if (data.isRecurring) {
        if (!data.startDate) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "A data de início é obrigatória para missões recorrentes.",
                path: ["startDate"],
            });
        }
        if (data.recurrenceRule?.endDate && data.startDate && data.recurrenceRule.endDate < data.startDate) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "A data de fim da recorrência não pode ser anterior à data de início.",
                path: ['recurrenceRule.endDate'],
            });
        }
    } else {
        if (!data.dueDate) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "A data de prazo é obrigatória para missões únicas.",
                path: ["dueDate"],
            });
        }
    }
});

type MissionTemplateFormValues = z.infer<typeof missionTemplateFormSchema>;

export default function EditMissionTemplatePage() {
  const { toast } = useToast();
  const router = useRouter();
  const params = useParams();
  const missionId = params.missionId as string;
  const { user } = useAuth();
  
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingData, setIsFetchingData] = useState(true);
  const [missionTemplate, setMissionTemplate] = useState<MissionTemplate | null>(null);

  const form = useForm<MissionTemplateFormValues>({
    resolver: zodResolver(missionTemplateFormSchema),
    defaultValues: {
      title: '',
      description: '',
      category: undefined, 
      starsReward: 5,
      xpReward: 10,
      status: 'active',
      isRecurring: false,
      startDate: null,
      dueDate: null,
      recurrenceRule: null,
    },
  });

  useEffect(() => {
    if (!missionId || !user) {
      setIsFetchingData(false);
      if(!user) router.push('/auth/login');
      else router.push('/dashboard/missions');
      return;
    }

    const fetchMissionTemplateData = async () => {
      setIsFetchingData(true);
      try {
        const fetchedTemplate = await getMissionTemplateById(missionId);
        if (fetchedTemplate) {
          setMissionTemplate(fetchedTemplate);
          
          let initialRecurrenceRule = null;
          if (fetchedTemplate.recurrenceRule) {
            initialRecurrenceRule = {
              ...fetchedTemplate.recurrenceRule,
              endDate: fetchedTemplate.recurrenceRule.endDate?.toDate() ?? null
            }
          }

          form.reset({
            title: fetchedTemplate.title,
            description: fetchedTemplate.description || '',
            category: fetchedTemplate.category,
            starsReward: fetchedTemplate.starsReward,
            xpReward: fetchedTemplate.xpReward,
            status: fetchedTemplate.status,
            isRecurring: !!fetchedTemplate.isRecurring,
            startDate: fetchedTemplate.startDate?.toDate() || null,
            dueDate: fetchedTemplate.dueDate?.toDate() || null,
            recurrenceRule: initialRecurrenceRule,
          });
        } else {
          toast({ title: "Missão não encontrada", variant: "destructive" });
          router.push('/dashboard/missions');
        }
      } catch (error) {
        console.error("Error fetching mission template:", error);
        toast({ title: "Erro ao carregar missão", variant: "destructive" });
        router.push('/dashboard/missions');
      } finally {
        setIsFetchingData(false);
      }
    };
    fetchMissionTemplateData();
  }, [missionId, user, router, toast, form]);

  const onSubmit = async (values: MissionTemplateFormValues) => {
    if (!user || !missionTemplate) {
      toast({ title: "Erro de Autenticação ou Dados", description: "Não foi possível salvar.", variant: "destructive" });
      return;
    }
    setIsLoading(true);

    try {
      const updatePayload: Partial<Omit<MissionTemplate, 'id' | 'createdAt' | 'ownerId'| 'familyId'>> = {
          title: values.title,
          description: values.description,
          category: values.category,
          starsReward: values.starsReward,
          xpReward: values.xpReward,
          status: values.status,
          isRecurring: values.isRecurring,
          // Se for recorrente, salve startDate e a regra. Senão, salve dueDate.
          startDate: values.isRecurring && values.startDate ? Timestamp.fromDate(values.startDate) : null,
          dueDate: !values.isRecurring && values.dueDate ? Timestamp.fromDate(values.dueDate) : null,
          recurrenceRule: values.isRecurring && values.recurrenceRule ? {
            ...values.recurrenceRule,
            endDate: values.recurrenceRule.endDate ? Timestamp.fromDate(values.recurrenceRule.endDate) : null,
          } : null,
      };

      await updateMissionTemplate(missionTemplate.id, updatePayload);

      toast({
        title: 'Missão Atualizada!',
        description: `A missão "${values.title}" foi atualizada com sucesso.`,
      });
      router.push('/dashboard/missions'); 
    } catch (error) {
      console.error('Error updating mission template:', error);
      toast({
        title: 'Erro ao Atualizar Missão',
        description: 'Não foi possível salvar as alterações. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetchingData) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-3">Carregando dados da missão...</p>
      </div>
    );
  }

  if (!missionTemplate) {
     return (
      <div className="flex flex-col justify-center items-center min-h-screen">
        <p className="text-lg text-destructive mb-4">Missão não encontrada.</p>
        <Button onClick={() => router.push('/dashboard/missions')}>Voltar para a Central</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-10">
      <Button variant="outline" onClick={() => router.back()} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
      </Button>
      <Card className="shadow-xl">
        <CardHeader>
           <div className="flex items-center gap-3 mb-2">
            <Target className="h-10 w-10 text-primary" />
            <div>
              <CardTitle className="text-3xl font-headline">Editar Missão</CardTitle>
              <CardDescription className="text-md">
                Modifique os detalhes desta missão no catálogo.
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
                      <Input placeholder="Ex: Arrumar a cama" {...field} />
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
                        placeholder="Detalhes sobre a missão."
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
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
                                {category.icon && <category.icon className={`mr-2 h-4 w-4 ${category.colorClasses.split(" ")[1]}`} />}
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
              </div>

              <RecurrenceControl />

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
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status da Missão</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o status da missão..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">Ativa (pode ser atribuída)</SelectItem>
                        <SelectItem value="archived">Arquivada (não pode ser atribuída)</SelectItem>
                      </SelectContent>
                    </Select>
                     <FormDescription>
                      Missões ativas podem ser atribuídas a crianças. Missões arquivadas não aparecerão para novas atribuições.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <Button type="submit" className="w-full md:w-auto" disabled={isLoading || isFetchingData}>
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Salvar Alterações na Missão
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

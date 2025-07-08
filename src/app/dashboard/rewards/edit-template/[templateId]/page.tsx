
"use client";

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getRewardTemplateById, updateRewardTemplate } from '@/lib/firebase/firestore';
import type { RewardCategory, RewardTemplate } from '@/lib/types';
import { rewardCategories } from '@/lib/types'; 
import { Loader2, Package, Save, ArrowLeft } from 'lucide-react';

const rewardTemplateFormSchema = z.object({
  title: z.string().min(3, { message: "O título deve ter pelo menos 3 caracteres." }).max(100, { message: "O título não deve exceder 100 caracteres." }),
  description: z.string().max(500, { message: "A descrição não deve exceder 500 caracteres." }).optional(),
  category: z.custom<RewardCategory>((val) => rewardCategories.map(rc => rc.id).includes(val as RewardCategory) , {
    message: "Selecione uma categoria válida.",
  }),
  starsCost: z.coerce.number().min(1, { message: "O custo deve ser de pelo menos 1 estrela." }).max(10000, {message: "O custo não pode ser superior a 10.000 estrelas."}),
  isMaterial: z.boolean().default(false),
  status: z.enum(['active', 'archived']).default('active'),
});

type RewardTemplateFormValues = z.infer<typeof rewardTemplateFormSchema>;

export default function EditRewardTemplatePage() {
  const { toast } = useToast();
  const router = useRouter();
  const params = useParams();
  const templateId = params.templateId as string;
  const { user } = useAuth();
  
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingData, setIsFetchingData] = useState(true);
  const [rewardTemplate, setRewardTemplate] = useState<RewardTemplate | null>(null);


  const form = useForm<RewardTemplateFormValues>({
    resolver: zodResolver(rewardTemplateFormSchema),
    defaultValues: {
      title: '',
      description: '',
      category: undefined, 
      starsCost: 10,
      isMaterial: false,
      status: 'active',
    },
  });

  useEffect(() => {
    if (!templateId || !user) {
      setIsFetchingData(false);
      if(!user) router.push('/auth/login');
      else router.push('/dashboard/rewards');
      return;
    }

    const fetchRewardTemplateData = async () => {
      setIsFetchingData(true);
      try {
        const fetchedTemplate = await getRewardTemplateById(templateId);
        if (fetchedTemplate) {
          setRewardTemplate(fetchedTemplate);
          form.reset({
            title: fetchedTemplate.title,
            description: fetchedTemplate.description || '',
            category: fetchedTemplate.category,
            starsCost: fetchedTemplate.starsCost,
            isMaterial: fetchedTemplate.isMaterial,
            status: fetchedTemplate.status,
          });
        } else {
          toast({ title: "Recompensa não encontrada", variant: "destructive" });
          router.push('/dashboard/rewards');
        }
      } catch (error) {
        console.error("Error fetching reward template:", error);
        toast({ title: "Erro ao carregar recompensa", variant: "destructive" });
        router.push('/dashboard/rewards');
      } finally {
        setIsFetchingData(false);
      }
    };
    fetchRewardTemplateData();
  }, [templateId, user, router, toast, form]);

  useEffect(() => {
    const subscription = form.watch((value, { name, type }) => {
      if (name === 'category') {
        form.setValue('isMaterial', value.category === 'material_items');
      }
    });
    return () => subscription.unsubscribe();
  }, [form]);


  const onSubmit = async (values: RewardTemplateFormValues) => {
    if (!user || !rewardTemplate) {
      toast({ title: "Erro de Autenticação ou Dados", description: "Não foi possível salvar.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const originalStatus = rewardTemplate.status;
      const updatePayload: Partial<Omit<RewardTemplate, 'id' | 'createdAt' | 'ownerId' | 'familyId'>> = {
        title: values.title,
        description: values.description,
        category: values.category,
        starsCost: values.starsCost,
        isMaterial: values.isMaterial,
        status: values.status,
      };
      
      await updateRewardTemplate(rewardTemplate.id, updatePayload);

      let toastDescription = `A recompensa "${values.title}" foi atualizada com sucesso.`;
      if (originalStatus === 'archived' && values.status === 'active') {
        toastDescription = `A recompensa "${values.title}" foi atualizada e reativada no catálogo.`;
      }

      toast({
        title: 'Recompensa Atualizada!',
        description: toastDescription,
      });
      router.push('/dashboard/rewards'); 
    } catch (error) {
      console.error('Error updating reward template:', error);
      toast({
        title: 'Erro ao Atualizar Recompensa',
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
        <p className="ml-3">Carregando dados da recompensa...</p>
      </div>
    );
  }

  if (!rewardTemplate) {
     return (
      <div className="flex flex-col justify-center items-center min-h-screen">
        <p className="text-lg text-destructive mb-4">Recompensa não encontrada.</p>
        <Button onClick={() => router.push('/dashboard/rewards')}>Voltar ao Mural de Recompensas</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-10">
      <Button variant="outline" onClick={() => router.back()} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" /> Voltar ao Mural de Recompensas
      </Button>
      <Card className="shadow-xl">
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            <Package className="h-10 w-10 text-primary" />
            <div>
              <CardTitle className="text-3xl font-headline">Editar Recompensa</CardTitle>
              <CardDescription className="text-md">
                Modifique os detalhes desta recompensa.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Título da Recompensa</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Uma tarde de jogos" {...field} />
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
                          {rewardCategories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                               <div className="flex items-center">
                                 {category.icon && <category.icon className={`mr-2 h-4 w-4 ${category.colorClasses.split(" ")[1]}`} />}
                                <span className={`px-2 py-0.5 rounded-full text-xs border ${category.colorClasses}`}>
                                  {category.label}
                                </span>
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="starsCost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Custo em Estrelas</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="Ex: 50" {...field} />
                      </FormControl>
                      <FormDescription>
                        Quantas estrelas o Mini Heroi precisa.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="isMaterial"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm bg-muted/30 h-full">
                      <div className="space-y-0.5">
                        <FormLabel>Item material?</FormLabel>
                        <FormDescription>
                          É um objeto físico?
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={form.getValues('category') === 'material_items'}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição (Opcional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Detalhes sobre a recompensa."
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
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status da Recompensa</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o status da recompensa..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">Ativa (pode ser atribuída)</SelectItem>
                        <SelectItem value="archived">Arquivada (não pode ser atribuída)</SelectItem>
                      </SelectContent>
                    </Select>
                     <FormDescription>
                      Recompensas ativas podem ser atribuídas a crianças. Recompensas arquivadas não aparecerão para novas atribuições.
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
                Salvar Alterações na Recompensa
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter>
            <p className="text-xs text-muted-foreground">
                Alterações aqui afetam a recompensa base do catálogo. A lógica para propagar alterações para recompensas já atribuídas será implementada futuramente.
            </p>
        </CardFooter>
      </Card>
    </div>
  );
}

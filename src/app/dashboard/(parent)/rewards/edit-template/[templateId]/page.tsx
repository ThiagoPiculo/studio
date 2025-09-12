

"use client";

import { useState, useEffect, useMemo } from 'react';
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
import { getRewardTemplateById, updateRewardTemplate, getChildProfilesForAttribution } from '@/lib/firebase/firestore';
import type { RewardCategory, RewardTemplate, ChildProfile, FamilyRole } from '@/lib/types';
import { rewardCategories } from '@/lib/types'; 
import { Loader2, Gift, Save, ArrowLeft, Users, ArrowRight } from 'lucide-react';
import { useFamily } from '@/contexts/FamilyContext';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials, cn } from '@/lib/utils';
import { AssignRewardDialog } from '@/components/dashboard/rewards/AssignRewardDialog';

const rewardTemplateFormSchema = z.object({
  title: z.string().min(3, { message: "O título deve ter pelo menos 3 caracteres." }).max(100, { message: "O título não deve exceder 100 caracteres." }),
  description: z.string().max(500, { message: "A descrição não deve exceder 500 caracteres." }).optional(),
  category: z.custom<RewardCategory>((val) => rewardCategories.map(rc => rc.id).includes(val as RewardCategory) , {
    message: "Selecione uma categoria válida.",
  }),
  starsCost: z.coerce.number().min(1, { message: "O custo deve ser de pelo menos 1 estrela." }).max(10000, {message: "O custo não pode ser superior a 10.000 estrelas."}),
  isMaterial: z.boolean().default(false),
  isUnique: z.boolean().default(false),
  status: z.enum(['active', 'archived']).default('active'),
});

type RewardTemplateFormValues = z.infer<typeof rewardTemplateFormSchema>;

export default function EditRewardTemplatePage() {
  const { toast } = useToast();
  const router = useRouter();
  const params = useParams();
  const templateId = params.templateId as string;
  const { user } = useAuth();
  const { currentContext, currentRole } = useFamily();
  
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingData, setIsFetchingData] = useState(true);
  const [rewardTemplate, setRewardTemplate] = useState<RewardTemplate | null>(null);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);

  const canEdit = useMemo(() => {
    if (currentContext === 'my-space') return true;
    if (!currentRole) return false;
    const editableRoles: FamilyRole[] = ['Owner', 'Co-Owner', 'Guardian'];
    return editableRoles.includes(currentRole as FamilyRole);
  }, [currentContext, currentRole]);

  const form = useForm<RewardTemplateFormValues>({
    resolver: zodResolver(rewardTemplateFormSchema),
    defaultValues: {
      title: '',
      description: '',
      category: undefined, 
      starsCost: 10,
      isMaterial: false,
      isUnique: false,
      status: 'active',
    },
  });
  
  const fetchRewardTemplateData = async () => {
    if (!templateId || !user) {
      setIsFetchingData(false);
      if(!user) router.push('/auth/login');
      else router.push('/dashboard/rewards');
      return;
    }

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
          isUnique: fetchedTemplate.isUnique,
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

  useEffect(() => {
    fetchRewardTemplateData();
  }, [templateId, user]);


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
        isUnique: values.isUnique,
        status: values.status,
      };
      
      await updateRewardTemplate(user, rewardTemplate.id, updatePayload);

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
        <Button onClick={() => router.push('/dashboard/rewards')}>Voltar para o Baú de Recompensas</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-10">
      <Card className="shadow-xl">
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            <Gift className="h-10 w-10 text-primary" />
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
              <fieldset disabled={!canEdit} className="space-y-8">
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
                                  {category.icon && <category.icon className={cn("mr-2 h-4 w-4", category.colorClasses.split(" ")[1])} />}
                                  <span className={cn("px-2 py-0.5 rounded-full text-xs border", category.colorClasses)}>
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
                   <div className="space-y-4">
                        <FormField
                            control={form.control}
                            name="isMaterial"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm bg-muted/30 h-[calc(50%-0.5rem)]">
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
                                    disabled={form.getValues('category') === 'material_items' || !canEdit}
                                    />
                                </FormControl>
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="isUnique"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm bg-muted/30 h-[calc(50%-0.5rem)]">
                                <div className="space-y-0.5">
                                    <FormLabel>Resgate Único?</FormLabel>
                                    <FormDescription>
                                    Pode ser resgatado só uma vez.
                                    </FormDescription>
                                </div>
                                <FormControl>
                                    <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                    disabled={!canEdit}
                                    />
                                </FormControl>
                                </FormItem>
                            )}
                        />
                    </div>
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
                          <SelectItem value="active">Ativa (disponível no Baú)</SelectItem>
                          <SelectItem value="archived">Arquivada (oculta no Baú)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Recompensas ativas ficam visíveis para os heróis. Recompensas arquivadas ficam guardadas no seu catálogo.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {canEdit && (
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button type="button" variant="secondary" className="w-full sm:w-auto" onClick={() => setIsAssignDialogOpen(true)}>
                       <Users className="mr-2 h-4 w-4" /> Gerenciar para os Heróis
                    </Button>
                    <Button type="submit" className="w-full sm:w-auto" disabled={isLoading || isFetchingData}>
                      {isLoading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="mr-2 h-4 w-4" />
                      )}
                      Salvar Alterações na Recompensa
                    </Button>
                  </div>
                )}
              </fieldset>
            </form>
          </Form>
        </CardContent>
      </Card>
      {rewardTemplate && (
        <AssignRewardDialog
            template={rewardTemplate}
            isOpen={isAssignDialogOpen}
            onOpenChange={setIsAssignDialogOpen}
            onAssigned={fetchRewardTemplateData}
        />
      )}
    </div>
  );
}

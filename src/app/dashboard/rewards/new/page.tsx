
"use client";

import { useState, useEffect, Suspense, useMemo } from 'react';
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
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useFamily } from '@/contexts/FamilyContext';
import { addRewardTemplate } from '@/lib/firebase/firestore';
import type { RewardCategory, RewardTemplate } from '@/lib/types';
import { rewardCategories } from '@/lib/types'; 
import { Loader2, Gift, ArrowLeft, AlertTriangle, Sparkles } from 'lucide-react';
import { predefinedRewardGroups } from '@/lib/predefined-reward-ideas';

const rewardTemplateFormSchema = z.object({
  title: z.string().min(3, { message: "O título deve ter pelo menos 3 caracteres." }).max(100, { message: "O título não deve exceder 100 caracteres." }),
  description: z.string().max(500, { message: "A descrição não deve exceder 500 caracteres." }).optional().default(''),
  category: z.custom<RewardCategory>((val) => rewardCategories.map(rc => rc.id).includes(val as RewardCategory) , {
    message: "Selecione uma categoria válida.",
  }),
  starsCost: z.coerce.number().min(1, { message: "O custo deve ser de pelo menos 1 estrela." }).max(10000, {message: "O custo não pode ser superior a 10.000 estrelas."}),
  isMaterial: z.boolean().default(false),
  isUnique: z.boolean().default(false),
});

type RewardTemplateFormValues = z.infer<typeof rewardTemplateFormSchema>;

function CreateRewardTemplatePageContent() {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { currentContext } = useFamily();

  const [isLoading, setIsLoading] = useState(false);
  const [newlyCreatedTemplate, setNewlyCreatedTemplate] = useState<RewardTemplate | null>(null);

  // Ler parâmetros da URL para defaultValues
  const initialTitle = searchParams.get('title') || '';
  const initialDescription = searchParams.get('description') || '';
  const categoryParam = searchParams.get('category') as RewardCategory | null;
  const isMaterialParam = searchParams.get('isMaterial');
  const initialStarsCost = searchParams.get('starsCost');

  let resolvedInitialCategory: RewardCategory | undefined = undefined;
  if (categoryParam && rewardCategories.some(rc => rc.id === categoryParam)) {
    resolvedInitialCategory = categoryParam;
  }

  let resolvedInitialIsMaterial = false;
  if (isMaterialParam !== null) {
    resolvedInitialIsMaterial = isMaterialParam === 'true';
  } else if (resolvedInitialCategory === 'material_items') {
    resolvedInitialIsMaterial = true;
  }
  
  const form = useForm<RewardTemplateFormValues>({
    resolver: zodResolver(rewardTemplateFormSchema),
    defaultValues: {
      title: initialTitle,
      description: initialDescription,
      category: resolvedInitialCategory, 
      starsCost: initialStarsCost ? parseInt(initialStarsCost, 10) : 10,
      isMaterial: resolvedInitialIsMaterial,
      isUnique: false,
    },
  });

  const suggestedCost = useMemo(() => {
    const category = form.watch('category');
    if (!category) return null;
    
    // Simple logic to suggest a price based on category. Could be more complex.
    switch (category) {
        case 'privileges': return 75;
        case 'experiences': return 150;
        case 'material_items': return 250;
        case 'personal_development': return 120;
        case 'impact_generosity': return 50;
        default: return null;
    }
  }, [form.watch('category')]);
  
  useEffect(() => {
    const subscription = form.watch((value, { name, type }) => {
      if (name === 'category') {
        const currentCategoryValue = value.category;
        const isCategoryMaterial = currentCategoryValue === 'material_items';

        if (isCategoryMaterial) {
          form.setValue('isMaterial', true, { shouldValidate: true });
        } else {
             if (isMaterialParam !== 'true') {
                 form.setValue('isMaterial', false, { shouldValidate: true });
             }
        }
        
        if (isCategoryMaterial) {
            toast({
                title: "Dica de Mestre Heroi",
                description: "Lembre-se que recompensas materiais são 'extras' divertidos, e não itens essenciais como comida ou material escolar obrigatório.",
                variant: "default", 
                duration: 10000,
            });
        }
      }
    });
    if (form.getValues('category') === 'material_items') {
        toast({
            title: "Dica de Mestre Heroi",
            description: "Lembre-se que recompensas materiais são 'extras' divertidos, e não itens essenciais como comida ou material escolar obrigatório.",
            variant: "default",
            duration: 10000,
        });
    }
    return () => subscription.unsubscribe();
  }, [form, toast, isMaterialParam]);


  const onSubmit = async (values: RewardTemplateFormValues) => {
    if (!user) {
      toast({ title: "Erro de Autenticação", description: "Você precisa estar logado.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const isFromPredefined = predefinedRewardGroups.flatMap(g => g.items).some(item => item.title === values.title && item.suggestedAppCategory === values.category);
      const templateDataPayload: Omit<RewardTemplate, 'id' | 'createdAt' | 'updatedAt' | 'status'> = {
        ownerId: user.uid,
        title: values.title,
        description: values.description,
        category: values.category,
        starsCost: values.starsCost,
        isMaterial: values.isMaterial,
        isUnique: values.isUnique,
        familyId: currentContext === 'my-space' ? null : currentContext,
        source: isFromPredefined ? 'predefined' : 'custom',
        justification: '', 
        tip: '',
      };
      
      await addRewardTemplate(user, templateDataPayload);
      toast({
        title: 'Tesouro Adicionado!',
        description: `A recompensa "${values.title}" foi adicionada ao Baú de Recompensas.`,
      });
      router.push('/dashboard/rewards'); 

    } catch (error) {
      console.error('Error creating reward template:', error);
      toast({
        title: 'Erro ao Criar Recompensa',
        description: 'Não foi possível criar a recompensa. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-10">
      <Card className="shadow-xl">
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            <Gift className="h-10 w-10 text-primary" />
            <div>
              <CardTitle className="text-3xl font-headline">Criar Recompensa</CardTitle>
              <CardDescription className="text-md">
                Defina um novo item ou experiência para o Baú de Recompensas.
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
                        {suggestedCost ? `Sugestão para esta categoria: ${suggestedCost} estrelas.` : 'Quantas estrelas serão necessárias.'}
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
                            disabled={form.getValues('category') === 'material_items'}
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
              
              <Button type="submit" className="w-full md:w-auto" disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Gift className="mr-2 h-4 w-4" />
                )}
                Adicionar ao Baú de Recompensas
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex-col items-start space-y-2">
            <p className="text-xs text-muted-foreground">
                Esta recompensa ficará disponível para todos os heróis neste espaço de trabalho.
            </p>
            {form.getValues('category') === 'material_items' && (
                 <div className="p-3 rounded-md border border-yellow-500/50 bg-yellow-500/10 text-yellow-700 text-xs flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 mt-0.5 text-yellow-600 flex-shrink-0" />
                    <span>
                        <strong>Atenção:</strong> Recompensas materiais devem ser extras e não itens essenciais (como roupas básicas, material escolar obrigatório ou comida).
                    </span>
                </div>
            )}
        </CardFooter>
      </Card>
    </div>
  );
}

export default function CreateRewardPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-screen"><Loader2 className="h-12 w-12 animate-spin text-primary" /><p className="ml-3">Carregando...</p></div>}>
      <CreateRewardTemplatePageContent />
    </Suspense>
  )
}


"use client";

import { useState, useEffect, Suspense } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useFamily } from '@/contexts/FamilyContext';
import { addRewardTemplate } from '@/lib/firebase/firestore';
import type { RewardCategory, RewardTemplate } from '@/lib/types';
import { rewardCategories } from '@/lib/types'; 
import { Loader2, PackagePlus, ArrowLeft, AlertTriangle } from 'lucide-react';

const rewardTemplateFormSchema = z.object({
  title: z.string().min(3, { message: "O título deve ter pelo menos 3 caracteres." }).max(100, { message: "O título não deve exceder 100 caracteres." }),
  description: z.string().max(500, { message: "A descrição não deve exceder 500 caracteres." }).optional().default(''),
  category: z.custom<RewardCategory>((val) => rewardCategories.map(rc => rc.id).includes(val as RewardCategory) , {
    message: "Selecione uma categoria válida.",
  }),
  starsCost: z.coerce.number().min(1, { message: "O custo deve ser de pelo menos 1 estrela." }).max(10000, {message: "O custo não pode ser superior a 10.000 estrelas."}),
  isMaterial: z.boolean().default(false),
});

type RewardTemplateFormValues = z.infer<typeof rewardTemplateFormSchema>;

function CreateRewardTemplatePageContent() {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { currentContext } = useFamily();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<RewardTemplateFormValues>({
    resolver: zodResolver(rewardTemplateFormSchema),
    defaultValues: {
      title: '',
      description: '',
      category: undefined, 
      starsCost: 10,
      isMaterial: false,
    },
  });

  useEffect(() => {
    const titleParam = searchParams.get('title');
    const descriptionParam = searchParams.get('description');
    const categoryParam = searchParams.get('category') as RewardCategory | null;
    const isMaterialParam = searchParams.get('isMaterial');

    if (titleParam) form.setValue('title', titleParam);
    if (descriptionParam) form.setValue('description', descriptionParam);
    if (categoryParam && rewardCategories.some(rc => rc.id === categoryParam)) {
      form.setValue('category', categoryParam);
    }
    if (isMaterialParam !== null) {
      form.setValue('isMaterial', isMaterialParam === 'true');
    }
    
    // Auto-check isMaterial if category is 'material' and it wasn't set by params
    // This specific condition will be handled by the watchEffect below more robustly
    // if (categoryParam === 'material' && isMaterialParam === null) {
    //     form.setValue('isMaterial', true);
    // }

  }, [searchParams, form]);
  
  useEffect(() => {
    const subscription = form.watch((value, { name, type }) => {
      if (name === 'category') {
        // If category is set (either by user or programmatically from URL param),
        // update isMaterial accordingly.
        // If isMaterial was explicitly set by URL param, that takes precedence
        // (handled in the useEffect above for searchParams).
        const isMaterialFromParam = searchParams.get('isMaterial');
        if (isMaterialFromParam === null) { // Only auto-set if not explicitly in params
          form.setValue('isMaterial', value.category === 'material');
        }

        if (value.category === 'material') {
          toast({
            title: "Atenção: Recompensas Materiais",
            description: "Lembre-se de não condicionar itens essenciais (como roupas básicas, material escolar obrigatório ou comida) ao cumprimento de tarefas. A recompensa deve ser sempre um 'extra'.",
            variant: "default", 
            duration: 8000,
          });
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [form, toast, searchParams]);


  const onSubmit = async (values: RewardTemplateFormValues) => {
    if (!user) {
      toast({ title: "Erro de Autenticação", description: "Você precisa estar logado.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const templateDataPayload: Omit<RewardTemplate, 'id' | 'createdAt' | 'updatedAt' | 'status'> = {
        ownerId: user.uid,
        title: values.title,
        description: values.description,
        category: values.category,
        starsCost: values.starsCost,
        isMaterial: values.isMaterial,
        familyId: currentContext === 'my-space' ? null : currentContext,
      };
      
      await addRewardTemplate(templateDataPayload);
      toast({
        title: 'Modelo de Recompensa Criado!',
        description: `O modelo "${values.title}" foi adicionado ao catálogo com sucesso.`,
      });
      router.push('/dashboard/rewards'); 
    } catch (error) {
      console.error('Error creating reward template:', error);
      toast({
        title: 'Erro ao Criar Modelo',
        description: 'Não foi possível criar o modelo de recompensa. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-10">
      <Button variant="outline" onClick={() => router.back()} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
      </Button>
      <Card className="shadow-xl">
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            <PackagePlus className="h-10 w-10 text-primary" />
            <div>
              <CardTitle className="text-3xl font-headline">Criar Novo Modelo de Recompensa</CardTitle>
              <CardDescription className="text-md">
                Defina um novo item ou experiência para o catálogo. Depois você poderá atribuí-lo aos Mini Herois.
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
                    <FormLabel>Título do Modelo</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Uma tarde de jogos de tabuleiro" {...field} />
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
                        placeholder="Detalhes sobre o modelo da recompensa."
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
              
              <FormField
                control={form.control}
                name="isMaterial"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4 shadow-sm bg-muted/30">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        // Disabled if category is 'material' (auto-set), but allow override if user changes category away from material then back.
                        // Or more simply, allow user to always toggle it unless category IS 'material'.
                        disabled={form.getValues('category') === 'material'} 
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        Este modelo de recompensa é para um item material?
                      </FormLabel>
                      <FormDescription>
                        Marque se é um objeto físico (ex: brinquedo, livro).
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

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
                      Quantas estrelas serão necessárias para resgatar esta recompensa.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <Button type="submit" className="w-full md:w-auto" disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <PackagePlus className="mr-2 h-4 w-4" />
                )}
                Criar Modelo de Recompensa
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex-col items-start space-y-2">
            <p className="text-xs text-muted-foreground">
                Modelos são a base para as recompensas que seus Mini Herois poderão ganhar!
            </p>
            {form.getValues('category') === 'material' && (
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

export default function CreateRewardTemplatePage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-screen"><Loader2 className="h-12 w-12 animate-spin text-primary" /><p className="ml-3">Carregando...</p></div>}>
      <CreateRewardTemplatePageContent />
    </Suspense>
  )
}


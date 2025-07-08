
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
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useFamily } from '@/contexts/FamilyContext';
import { addRewardTemplate } from '@/lib/firebase/firestore';
import type { RewardCategory, RewardTemplate } from '@/lib/types';
import { rewardCategories } from '@/lib/types'; 
import { Loader2, PackagePlus, ArrowLeft, AlertTriangle, Sparkles } from 'lucide-react';
import { AssignRewardDialog } from '@/components/dashboard/rewards/AssignRewardDialog';
import Link from 'next/link';

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
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
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
    },
  });
  
  useEffect(() => {
    // Este useEffect lida com a lógica reativa quando a categoria é alterada pelo usuário
    // ou se a categoria inicial (via URL) for 'material_items'.
    const subscription = form.watch((value, { name, type }) => {
      if (name === 'category') {
        const currentCategoryValue = value.category;
        const isCategoryMaterial = currentCategoryValue === 'material_items';

        // Atualiza isMaterial se a categoria for 'material_items'
        if (isCategoryMaterial) {
          form.setValue('isMaterial', true, { shouldValidate: true });
        } else {
            // Se a categoria mudou para NÃO material E 'isMaterial' não foi explicitamente definido como true via URL
            // desmarcamos 'isMaterial'.
            // Se isMaterialParam === 'true', o usuário explicitamente passou, então não desmarcamos automaticamente
            // ao mudar para categoria não-material. Ele pode querer.
             if (isMaterialParam !== 'true') {
                 form.setValue('isMaterial', false, { shouldValidate: true });
             }
        }
        
        // Mostra o toast de aviso para recompensas materiais, se aplicável
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
    // Disparar a lógica do toast se a categoria inicial for material
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
      const templateDataPayload: Omit<RewardTemplate, 'id' | 'createdAt' | 'updatedAt' | 'status'> = {
        ownerId: user.uid,
        title: values.title,
        description: values.description,
        category: values.category,
        starsCost: values.starsCost,
        isMaterial: values.isMaterial,
        familyId: currentContext === 'my-space' ? null : currentContext,
      };
      
      const createdTemplate = await addRewardTemplate(templateDataPayload);
      toast({
        title: 'Tesouro Adicionado!',
        description: `A recompensa "${createdTemplate.title}" foi adicionada ao catálogo de prêmios.`,
      });
      setNewlyCreatedTemplate(createdTemplate);
      setIsAssignDialogOpen(true);
      form.reset(); // Limpa o formulário após o sucesso

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
      <div className="flex flex-wrap gap-2 justify-between items-center mb-4">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar ao Mural de Recompensas
        </Button>
        <Link href="/dashboard/rewards/ideas">
          <Button variant="secondary">
            <Sparkles className="mr-2 h-4 w-4" /> Ver Ideias de Recompensas
          </Button>
        </Link>
      </div>
      <Card className="shadow-xl">
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            <PackagePlus className="h-10 w-10 text-primary" />
            <div>
              <CardTitle className="text-3xl font-headline">Criar Recompensa para Mini Herois</CardTitle>
              <CardDescription className="text-md">
                Defina um novo item ou experiência para o catálogo. Depois você poderá atribuí-lo aos Mini Herois.
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
                        Quantas estrelas serão necessárias.
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
              
              <Button type="submit" className="w-full md:w-auto" disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <PackagePlus className="mr-2 h-4 w-4" />
                )}
                Criar Recompensa
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex-col items-start space-y-2">
            <p className="text-xs text-muted-foreground">
                Recompensas são a base para os prêmios que seus Mini Herois poderão ganhar!
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

      {newlyCreatedTemplate && (
        <AssignRewardDialog
          template={newlyCreatedTemplate}
          isOpen={isAssignDialogOpen}
          onOpenChange={(isOpen) => {
            if (!isOpen) { // Se o diálogo for fechado
              setNewlyCreatedTemplate(null); // Limpar o template
              router.push('/dashboard/rewards'); // Navegar para o catálogo
            }
            setIsAssignDialogOpen(isOpen);
          }}
          onAssigned={() => {
            toast({ title: "Recompensa Atribuída!", description: "A nova recompensa foi atribuída às crianças selecionadas."});
          }}
        />
      )}
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

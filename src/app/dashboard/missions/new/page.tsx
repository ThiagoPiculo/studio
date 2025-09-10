

"use client";

import { Suspense, useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useFamily } from '@/contexts/FamilyContext';
import { addMissionTemplate, getMissionTemplatesByOwnerOrFamily, updateMissionTemplate } from '@/lib/firebase/firestore';
import type { MissionCategory, MissionTemplate } from '@/lib/types';
import { missionCategories } from '@/lib/types'; 
import { Loader2, Target, ArrowLeft, Star as StarIcon, BadgeCheck, Lightbulb, Check, ChevronsUpDown, Edit3, CircleDot, Link as LinkIcon } from 'lucide-react';
import { AssignMissionDialog } from '@/components/dashboard/missions/AssignMissionDialog';
import { AlertDialog, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel, AlertDialogContent } from '@/components/ui/alert-dialog';
import { predefinedMissionGroups } from '@/lib/predefined-missions';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Command, CommandInput, CommandEmpty, CommandList, CommandGroup, CommandItem, CommandSeparator } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import Link from 'next/link';


const missionTemplateFormSchema = z.object({
  title: z.string().min(3, { message: "O título deve ter pelo menos 3 caracteres." }).max(100, { message: "O título não deve exceder 100 caracteres." }),
  emoji: z.string().max(4, { message: "O emoji deve ter no máximo 4 caracteres." }).optional().default(''),
  description: z.string().max(500, { message: "A descrição não deve exceder 500 caracteres." }).optional().default(''),
  category: z.custom<MissionCategory>((val) => missionCategories.map(rc => rc.id).includes(val as MissionCategory) , {
    message: "Selecione uma categoria válida.",
  }),
  starsReward: z.coerce.number().min(0, { message: "A recompensa não pode ser negativa." }).max(1000, {message: "A recompensa não pode ser superior a 1000 estrelas."}),
  targetContexts: z.array(z.string()).min(1, { message: "Selecione pelo menos um espaço de trabalho para salvar." }),
});

type MissionTemplateFormValues = z.infer<typeof missionTemplateFormSchema>;

function CreateMissionTemplatePageContent() {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { currentContext, availableContexts } = useFamily();
  const [isLoading, setIsLoading] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [newlyCreatedTemplate, setNewlyCreatedTemplate] = useState<MissionTemplate | null>(null);

  const [userTemplates, setUserTemplates] = useState<MissionTemplate[]>([]);
  const [isCheckingDuplicates, setIsCheckingDuplicates] = useState(true);
  
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  
  const [duplicateMission, setDuplicateMission] = useState<MissionTemplate | null>(null);
  const [isDuplicateDialogOpen, setIsDuplicateDialogOpen] = useState(false);
  const [ideaForDuplicate, setIdeaForDuplicate] = useState<any>(null);


  const allMissionIdeas = useMemo(() => predefinedMissionGroups.flatMap(g => g.items), []);

  const initialTitle = searchParams.get('title') || '';
  const initialEmoji = searchParams.get('emoji') || '✨';
  const categoryParam = searchParams.get('category') as MissionCategory | null;
  const starsParam = searchParams.get('starsReward');

  let resolvedInitialCategory: MissionCategory | undefined = undefined;
  if (categoryParam && missionCategories.some(rc => rc.id === categoryParam)) {
    resolvedInitialCategory = categoryParam;
  }

  const form = useForm<MissionTemplateFormValues>({
    resolver: zodResolver(missionTemplateFormSchema),
    defaultValues: {
      title: initialTitle,
      emoji: initialEmoji,
      description: '',
      category: resolvedInitialCategory, 
      starsReward: starsParam ? parseInt(starsParam, 10) : 5,
      targetContexts: [currentContext],
    },
  });
  
  const watchedTitle = form.watch('title');
  useEffect(() => {
    if (!watchedTitle) {
      form.setValue('emoji', '');
      return;
    }
    const matchedIdea = allMissionIdeas.find(idea => idea.title.toLowerCase().trim() === watchedTitle.toLowerCase().trim());
    if (matchedIdea) {
      form.setValue('emoji', matchedIdea.emoji);
    } else {
      form.setValue('emoji', '✨');
    }
  }, [watchedTitle, form, allMissionIdeas]);

  const existingTemplatesMap = useMemo(() => {
    const map = new Map<string, MissionTemplate>();
    userTemplates.forEach(t => {
      const key = `${(t.familyId || 'my-space')}-${t.title.trim().toLowerCase()}`;
      map.set(key, t);
    });
    return map;
  }, [userTemplates]);


  useEffect(() => {
    if (!user) {
      setIsCheckingDuplicates(false);
      return;
    }
    const fetchAllUserTemplates = async () => {
        try {
            const allTemplates: MissionTemplate[] = [];
            for (const context of availableContexts) {
                const familyIdToQuery = context.id === 'my-space' ? null : context.id;
                const templates = await getMissionTemplatesByOwnerOrFamily(user.uid, familyIdToQuery);
                allTemplates.push(...templates);
            }
            setUserTemplates(allTemplates);
        } catch (error) {
            console.error("Error fetching all user templates:", error);
        } finally {
            setIsCheckingDuplicates(false);
        }
    }
    fetchAllUserTemplates();
  }, [user, availableContexts]);
  
  const handleIdeaSelection = (idea: any) => {
    const key = `${currentContext}-${idea.title.trim().toLowerCase()}`;
    const existingTemplate = existingTemplatesMap.get(key);

    if (existingTemplate) {
        setDuplicateMission(existingTemplate);
        setIdeaForDuplicate(idea);
        setIsDuplicateDialogOpen(true);
    } else {
        form.setValue("title", idea.title);
        form.setValue("emoji", idea.emoji);
        form.setValue("category", idea.suggestedAppCategory);
        form.setValue("starsReward", idea.starsReward);
        setIsPopoverOpen(false);
    }
  };


  const onSubmit = async (values: MissionTemplateFormValues) => {
    if (!user) {
      toast({ title: "Erro de Autenticação", description: "Você precisa estar logado.", variant: "destructive" });
      return;
    }
    
    // Check for duplicates only in the selected contexts
    for (const contextId of values.targetContexts) {
        const key = `${contextId}-${values.title.trim().toLowerCase()}`;
        const existingTemplate = existingTemplatesMap.get(key);
        if (existingTemplate) {
            setDuplicateMission(existingTemplate);
            setIsDuplicateDialogOpen(true);
            return;
        }
    }

    setIsLoading(true);

    try {
      const isFromPredefined = allMissionIdeas.flatMap(g => g.items).some(item => item.title === values.title && item.emoji === values.emoji && item.starsReward === values.starsReward);

      const templateDataPayload: Omit<MissionTemplate, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'familyId'> = {
        ownerId: user.uid,
        title: values.title,
        emoji: values.emoji || '✨',
        description: values.description,
        category: values.category,
        starsReward: values.starsReward,
        isRecurring: false,
        startDate: null,
        dueDate: null,
        recurrenceRule: null,
        source: isFromPredefined ? 'predefined' : 'custom',
      };
      
      const createdTemplate = await addMissionTemplate(user, templateDataPayload, values.targetContexts);

      toast({
        title: 'Missão(ões) Adicionada(s) ao Catálogo!',
        description: `A missão "${values.title}" foi salva nos espaços selecionados.`,
      });
      
      if (createdTemplate) {
          setNewlyCreatedTemplate(createdTemplate);
          setIsAssignDialogOpen(true);
      } else {
          router.push('/dashboard/missions');
      }

      form.reset();

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
  
  const handleEditDuplicate = () => {
    if (duplicateMission) {
      router.push(`/dashboard/missions/edit/${duplicateMission.id}`);
    }
    setIsDuplicateDialogOpen(false);
  };

  const handleCreateAnyway = () => {
    if (ideaForDuplicate) {
        form.setValue("title", ideaForDuplicate.title);
        form.setValue("emoji", ideaForDuplicate.emoji);
        form.setValue("category", ideaForDuplicate.suggestedAppCategory);
        form.setValue("starsReward", ideaForDuplicate.starsReward);
    }
    setIsDuplicateDialogOpen(false);
  };

   const getContextName = (contextId: string) => {
    if (contextId === 'my-space') return "No seu Espaço (Cuidar Solo)";
    const context = availableContexts.find(c => c.id === contextId);
    return context ? `Na Aliança: "${context.name}"` : 'Espaço Desconhecido';
  };

  const IconForContext = ({ contextId }: { contextId: string }) => {
    return contextId === 'my-space' ? <CircleDot className="h-4 w-4 text-chart-2" /> : <LinkIcon className="h-4 w-4 text-chart-4" />;
  };

  return (
    <>
      <div className="space-y-6 max-w-2xl mx-auto pb-10">
        <Card className="shadow-xl">
           <CardHeader>
             <Link href="/dashboard/missions" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary transition-colors mb-4">
                <ArrowLeft className="mr-1 h-4 w-4" />
                Voltar para o Quadro de Missões
            </Link>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-6">
                  <div className="grid grid-cols-[auto,1fr] gap-4 items-end">
                      <FormField
                        control={form.control}
                        name="emoji"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Emoji</FormLabel>
                            <FormControl>
                              <Input className="w-16 h-10 text-center text-xl p-0" maxLength={4} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="starsReward"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-1.5"><StarIcon className="text-yellow-500"/> Estrelas</FormLabel>
                            <FormControl>
                              <Input type="number" placeholder="Ex: 5" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                  </div>

                  <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Categoria</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {missionCategories.map((category) => (
                                <SelectItem key={category.id} value={category.id}>
                                  <div className="flex items-center">
                                    <category.icon className={cn("mr-2 h-4 w-4", category.colorClasses.split(" ")[1])} />
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
                 <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                        <FormItem className="flex flex-col flex-grow">
                            <FormLabel>Título da Missão</FormLabel>
                            <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                                <PopoverTrigger asChild>
                                    <FormControl>
                                        <Button
                                            variant="outline"
                                            role="combobox"
                                            className={cn("w-full justify-between", !field.value && "text-muted-foreground")}
                                        >
                                            {field.value || "Selecione ou digite o nome da missão"}
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                     <Command>
                                        <CommandInput placeholder="Buscar ideia de missão..." onValueChange={(value) => form.setValue("title", value)} value={field.value}/>
                                        <CommandList>
                                            <CommandEmpty>Nenhuma ideia encontrada.</CommandEmpty>
                                            {predefinedMissionGroups.map((group) => (
                                                <CommandGroup key={group.userCategory} heading={group.userCategory}>
                                                    {group.items.map(idea => {
                                                        const isAdded = existingTemplatesMap.has(`${currentContext}-${idea.title.trim().toLowerCase()}`);
                                                        return (
                                                            <CommandItem
                                                                value={idea.title}
                                                                key={idea.title}
                                                                onSelect={() => handleIdeaSelection(idea)}
                                                            >
                                                                <Check className={cn("mr-2 h-4 w-4", field.value === idea.title ? "opacity-100" : "opacity-0")} />
                                                                {idea.title}
                                                                {isAdded && <span className="ml-auto text-xs text-muted-foreground">(Adicionada)</span>}
                                                            </CommandItem>
                                                        )
                                                    })}
                                                </CommandGroup>
                                            ))}
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
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
                    name="targetContexts"
                    render={() => (
                      <FormItem>
                         <div className="mb-4">
                            <FormLabel className="text-base font-semibold">Publicar Missão Em:</FormLabel>
                            <FormDescription>
                                Escolha em quais dos seus espaços de trabalho esta missão estará disponível.
                            </FormDescription>
                        </div>
                        <div className="space-y-2">
                          {availableContexts.map((context) => (
                            <FormField
                              key={context.id}
                              control={form.control}
                              name="targetContexts"
                              render={({ field }) => {
                                return (
                                  <FormItem
                                    key={context.id}
                                    className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-3 hover:bg-accent/50 has-[:checked]:bg-primary/10 has-[:checked]:border-primary/50 transition-colors"
                                  >
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value?.includes(context.id)}
                                        onCheckedChange={(checked) => {
                                          return checked
                                            ? field.onChange([...(field.value || []), context.id])
                                            : field.onChange(
                                                field.value?.filter(
                                                  (value) => value !== context.id
                                                )
                                              )
                                        }}
                                      />
                                    </FormControl>
                                     <FormLabel className="font-normal flex-1 cursor-pointer flex items-center gap-2">
                                        <IconForContext contextId={context.id} />
                                        {getContextName(context.id)}
                                    </FormLabel>
                                  </FormItem>
                                )
                              }}
                            />
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                
                <div className="flex items-center justify-end gap-2 mt-8 border-t pt-6">
                  <Button type="button" variant="outline" onClick={() => router.back()} disabled={isLoading}>
                    Cancelar
                  </Button>
                  <Button type="submit" className="w-full sm:w-auto" disabled={isLoading}>
                    {isLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Target className="mr-2 h-4 w-4" />
                    )}
                    Criar e Atribuir Missão
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>

       <AlertDialog open={isDuplicateDialogOpen} onOpenChange={setIsDuplicateDialogOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Missão Já Existe no Catálogo</AlertDialogTitle>
                    <AlertDialogDescription>
                        Você já tem uma missão chamada "{duplicateMission?.title}" em um dos espaços selecionados. O que você gostaria de fazer?
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                    <Button variant="outline" onClick={handleCreateAnyway} className="w-full sm:w-auto">
                        Mudar o nome e criar
                    </Button>
                    <Button onClick={handleEditDuplicate} className="w-full sm:w-auto">
                        <Edit3 className="mr-2 h-4 w-4" />
                        Gerenciar a existente
                    </Button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

      {newlyCreatedTemplate && (
        <AssignMissionDialog
          template={newlyCreatedTemplate}
          isOpen={isAssignDialogOpen}
          onOpenChange={(isOpen) => {
            if (!isOpen) { 
              setNewlyCreatedTemplate(null);
              router.push('/dashboard/missions');
            }
            setIsAssignDialogOpen(isOpen);
          }}
          onAssigned={() => {
            toast({ title: "Missões Atribuídas!", description: "As novas missões foram adicionadas para as crianças selecionadas."});
          }}
        />
      )}
    </>
  );
}

export default function CreateMissionPage() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center min-h-screen"><Loader2 className="h-12 w-12 animate-spin text-primary" /><p className="ml-3">Carregando...</p></div>}>
            <CreateMissionTemplatePageContent />
        </Suspense>
    )
}

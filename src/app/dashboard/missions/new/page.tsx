
"use client";

import { Suspense, useState, useEffect, useMemo } from 'react';
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
import { addMissionTemplate, getMissionTemplatesByOwnerOrFamily } from '@/lib/firebase/firestore';
import type { MissionCategory, MissionTemplate } from '@/lib/types';
import { missionCategories } from '@/lib/types'; 
import { Loader2, Target, ArrowLeft, Star as StarIcon, BadgeCheck, Lightbulb, Check, ChevronsUpDown } from 'lucide-react';
import Link from 'next/link';
import { AssignMissionDialog } from '@/components/dashboard/missions/AssignMissionDialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { predefinedMissionGroups } from '@/lib/predefined-missions';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Command, CommandInput, CommandEmpty, CommandList, CommandGroup, CommandItem, CommandSeparator } from '@/components/ui/command';
import { cn } from '@/lib/utils';


// Schema simplified to remove all scheduling fields
const missionTemplateFormSchema = z.object({
  title: z.string().min(3, { message: "O título deve ter pelo menos 3 caracteres." }).max(100, { message: "O título não deve exceder 100 caracteres." }),
  emoji: z.string().max(4, { message: "O emoji deve ter no máximo 4 caracteres." }).optional().default(''),
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
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [newlyCreatedTemplate, setNewlyCreatedTemplate] = useState<MissionTemplate | null>(null);

  const [userTemplates, setUserTemplates] = useState<MissionTemplate[]>([]);
  const [isCheckingDuplicates, setIsCheckingDuplicates] = useState(true);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [duplicateTitle, setDuplicateTitle] = useState('');
  
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const allMissionIdeas = useMemo(() => predefinedMissionGroups, []);

  const initialTitle = searchParams.get('title') || '';
  const initialEmoji = searchParams.get('emoji') || '';
  const categoryParam = searchParams.get('category') as MissionCategory | null;
  const starsParam = searchParams.get('starsReward');
  const xpParam = searchParams.get('xpReward');


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
      xpReward: xpParam ? parseInt(xpParam, 10) : 10,
    },
  });
  
  const existingTitles = useMemo(() => {
    return new Set(userTemplates.map(t => t.title.trim().toLowerCase()));
  }, [userTemplates]);

  useEffect(() => {
    if (!user) {
      setIsCheckingDuplicates(false);
      return;
    }
    const familyIdToQuery = currentContext === 'my-space' ? null : currentContext;
    getMissionTemplatesByOwnerOrFamily(user.uid, familyIdToQuery)
      .then(setUserTemplates)
      .catch(console.error)
      .finally(() => setIsCheckingDuplicates(false));
  }, [user, currentContext]);


  const onSubmit = async (values: MissionTemplateFormValues) => {
    if (!user) {
      toast({ title: "Erro de Autenticação", description: "Você precisa estar logado.", variant: "destructive" });
      return;
    }
    setIsLoading(true);

    try {
      const isFromPredefined = allMissionIdeas.flatMap(g => g.items).some(item => item.title === values.title && item.emoji === values.emoji && item.starsReward === values.starsReward);

      const templateDataPayload: Omit<MissionTemplate, 'id' | 'createdAt' | 'updatedAt' | 'status'> = {
        ownerId: user.uid,
        familyId: currentContext === 'my-space' ? null : currentContext,
        title: values.title,
        emoji: values.emoji,
        description: values.description,
        category: values.category,
        starsReward: values.starsReward,
        xpReward: values.xpReward,
        isRecurring: false,
        startDate: null,
        dueDate: null,
        recurrenceRule: null,
        source: isFromPredefined ? 'predefined' : 'custom',
      };
      
      const createdTemplate = await addMissionTemplate(user, templateDataPayload);
      toast({
        title: 'Missão Adicionada ao Catálogo!',
        description: `A missão "${createdTemplate.title}" está pronta para ser atribuída.`,
      });
      setNewlyCreatedTemplate(createdTemplate);
      setIsAssignDialogOpen(true);
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

  return (
    <>
      <div className="space-y-6 max-w-2xl mx-auto pb-10">
        <Card className="shadow-xl">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
              <div className="flex items-center gap-3">
                  <Target className="h-10 w-10 text-primary" />
                  <div>
                  <CardTitle className="text-3xl font-headline">Criar Nova Missão</CardTitle>
                  <CardDescription className="text-md">
                      Defina uma nova missão para o catálogo.
                  </CardDescription>
                  </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                
                <div className="grid grid-cols-1 sm:grid-cols-[auto,1fr] gap-4 items-end">
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
                        name="title"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="flex items-center justify-between">
                                    Título da Missão
                                    <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                                        <PopoverTrigger asChild>
                                            <Button type="button" variant="link" className="p-0 h-auto text-xs">
                                                <Lightbulb className="mr-1 h-3 w-3" /> Buscar ideias
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                             <Command>
                                                <CommandInput placeholder="Buscar ideia de missão..." />
                                                <CommandList>
                                                    <CommandEmpty>Nenhuma ideia encontrada.</CommandEmpty>
                                                    {allMissionIdeas.map((group) => (
                                                        <CommandGroup key={group.userCategory} heading={group.userCategory}>
                                                            {group.items.map(idea => {
                                                                const isDuplicate = existingTitles.has(idea.title.trim().toLowerCase());
                                                                return (
                                                                    <CommandItem
                                                                        value={idea.title}
                                                                        key={idea.title}
                                                                        onSelect={() => {
                                                                            if (isDuplicate) {
                                                                                setDuplicateTitle(idea.title);
                                                                                setShowDuplicateDialog(true);
                                                                                return;
                                                                            }
                                                                            form.setValue("title", idea.title);
                                                                            form.setValue("emoji", idea.emoji);
                                                                            form.setValue("category", idea.suggestedAppCategory);
                                                                            form.setValue("starsReward", idea.starsReward);
                                                                            form.setValue("xpReward", idea.xpReward);
                                                                            setIsPopoverOpen(false);
                                                                        }}
                                                                    >
                                                                        <Check className={cn("mr-2 h-4 w-4", field.value === idea.title ? "opacity-100" : "opacity-0")} />
                                                                        {idea.title}
                                                                        {isDuplicate && <span className="ml-auto text-xs text-muted-foreground">(Já existe)</span>}
                                                                    </CommandItem>
                                                                )
                                                            })}
                                                        </CommandGroup>
                                                    ))}
                                                </CommandList>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>
                                </FormLabel>
                                <FormControl>
                                    <Input placeholder="Ex: Arrumar a cama" {...field} />
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
                          Estrelas que o heroi ganha.
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

       {showDuplicateDialog && (
        <AlertDialog open={showDuplicateDialog} onOpenChange={setShowDuplicateDialog}>
            <AlertDialogHeader>
                <AlertDialogTitle>Missão Já Existe!</AlertDialogTitle>
                <AlertDialogDescription>
                    A missão "{duplicateTitle}" já está no seu catálogo. Você gostaria de gerenciá-la ou criar uma nova versão?
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogAction onClick={() => {
                    setShowDuplicateDialog(false);
                    const idea = allMissionIdeas.flatMap(g => g.items).find(i => i.title === duplicateTitle);
                    if(idea) {
                         form.setValue("title", idea.title);
                         form.setValue("emoji", idea.emoji);
                         form.setValue("category", idea.suggestedAppCategory);
                         form.setValue("starsReward", idea.starsReward);
                         form.setValue("xpReward", idea.xpReward);
                    }
                }}>Criar mesmo assim</AlertDialogAction>
                <AlertDialogCancel onClick={() => {
                    setShowDuplicateDialog(false);
                    router.push('/dashboard/missions');
                }}>Ir para o Catálogo</AlertDialogCancel>
            </AlertDialogFooter>
        </AlertDialog>
      )}

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

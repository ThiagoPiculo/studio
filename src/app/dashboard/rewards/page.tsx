
"use client";

import React, { useEffect, useState, useMemo, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Gift, PlusCircle, Star as StarIcon, PackageSearch, Loader2, MoreHorizontal, Edit3, Trash2, Users, Info, Sparkles } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useFamily } from '@/contexts/FamilyContext';
import { 
  getRewardTemplatesByOwnerOrFamily, 
  deleteRewardTemplate,
  getChildProfilesForAttribution,
  getChildRewardInstancesForContext
} from '@/lib/firebase/firestore';
import type { RewardTemplate, RewardCategoryDetails, ChildProfile, ChildRewardInstance, FamilyRole } from '@/lib/types';
import { rewardCategories } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { AssignRewardDialog } from '@/components/dashboard/rewards/AssignRewardDialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from '@/components/ui/skeleton';
import { db } from '@/lib/firebase/config';
import { doc, updateDoc } from 'firebase/firestore';
import { Separator } from '@/components/ui/separator';
import { getInitials } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { predefinedRewardGroups } from '@/lib/predefined-reward-ideas';
import { Progress } from '@/components/ui/progress';
import Loading from './loading';


function RewardsHubContent({ initialData }: { initialData: { templates: RewardTemplate[], children: ChildProfile[], instances: ChildRewardInstance[], rewardMode: 'automatic' | 'manual' }}) {
  const { templates, children: initialChildren, instances, rewardMode: initialRewardMode } = initialData;
  const { user } = useAuth();
  const { currentContext, availableContexts, currentRole } = useFamily();
  const { toast } = useToast();
  const router = useRouter();

  const [rewardTemplates, setRewardTemplates] = useState<RewardTemplate[]>(templates);
  const [children, setChildren] = useState<ChildProfile[]>(initialChildren);
  const [rewardInstances, setRewardInstances] = useState<ChildRewardInstance[]>(instances);
  
  const [templateToDelete, setTemplateToDelete] = useState<RewardTemplate | null>(null);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [templateToAssign, setTemplateToAssign] = useState<RewardTemplate | null>(null);
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  const rewardMode = user?.settings?.rewardMode || initialRewardMode;
  
   const canEdit = useMemo(() => {
    if (currentContext === 'my-space') return true;
    if (!currentRole) return false;
    const editableRoles: FamilyRole[] = ['Owner', 'Co-Owner', 'Guardian'];
    return editableRoles.includes(currentRole as FamilyRole);
  }, [currentContext, currentRole]);
  
  const fetchData = useCallback(async () => {
    if (!user) {
      return;
    }
    try {
      const familyIdToQuery = currentContext === 'my-space' ? null : currentContext;
      const [fetchedTemplates, fetchedChildren, fetchedInstances] = await Promise.all([
        getRewardTemplatesByOwnerOrFamily(user.uid, familyIdToQuery),
        getChildProfilesForAttribution(user.uid, currentContext),
        getChildRewardInstancesForContext(user.uid, familyIdToQuery)
      ]);
      
      setRewardTemplates(fetchedTemplates);
      setChildren(fetchedChildren);
      setRewardInstances(fetchedInstances);
    } catch (err) {
      console.error("Error refetching rewards data:", err);
      toast({ title: "Erro ao atualizar dados", variant: "destructive" });
    }
  }, [user, currentContext, toast]);

  const handleRewardModeChange = async (newMode: 'automatic' | 'manual') => {
      if (!user) return;
      
      const userDocRef = doc(db, 'users', user.uid);
      try {
          await updateDoc(userDocRef, {
              'settings.rewardMode': newMode
          });
          toast({
              title: "Modo de Estratégia Atualizado!",
              description: `Você agora está no modo ${newMode === 'automatic' ? 'Automático' : 'Manual'}.`
          });
          // Optimistically update the state
          const updatedUser = { ...user, settings: { ...user.settings, rewardMode: newMode } };
          // This is a bit of a hack since we can't update the user context directly here
          // A full page reload or context refresh would be ideal but this provides immediate UI feedback
      } catch (error) {
          console.error("Failed to update reward mode:", error);
          toast({ title: "Erro ao salvar", description: "Não foi possível alterar sua estratégia de recompensas.", variant: "destructive"});
      }
  };

  const allIdeasWithStatus = useMemo(() => {
    const userTemplateTitles = new Set(rewardTemplates.map(t => t.title.toLowerCase().trim()));
    return predefinedRewardGroups.flatMap(group => 
      group.items.map(idea => ({
        ...idea,
        isAdded: userTemplateTitles.has(idea.title.toLowerCase().trim())
      }))
    );
  }, [rewardTemplates]);

  const getCategoryDetails = (categoryId: RewardTemplate['category']): RewardCategoryDetails | undefined => {
    return rewardCategories.find(cat => cat.id === categoryId);
  };

  const handleDeleteConfirm = async () => {
    if (!templateToDelete || !user) return;
    setIsProcessingAction(true);
    try {
      await deleteRewardTemplate(user, templateToDelete.id);
      toast({ title: "Recompensa Removida do Catálogo!", description: `A recompensa "${templateToDelete.title}" foi removida.` });
      fetchData();
    } catch (error) {
      console.error("Error deleting reward template:", error);
      toast({ title: "Erro ao Excluir Recompensa", description: "Não foi possível remover a recompensa.", variant: "destructive" });
    } finally {
      setTemplateToDelete(null);
      setIsProcessingAction(false);
    }
  };
  
  const handleUseIdea = (idea: (typeof allIdeasWithStatus)[0]) => {
    if (idea.isAdded) {
      toast({ title: "Recompensa já existe", description: "Esta recompensa já está no seu catálogo. Você pode editá-la lá." });
      const existingTemplate = rewardTemplates.find(t => t.title.toLowerCase().trim() === idea.title.toLowerCase().trim());
      if (existingTemplate) {
        router.push(`/dashboard/rewards/edit-template/${existingTemplate.id}`);
      }
      return;
    }
    const queryParams = new URLSearchParams();
    queryParams.append('title', idea.title);
    if (idea.description) queryParams.append('description', idea.description);
    queryParams.append('category', idea.suggestedAppCategory);
    if (idea.starsCost) queryParams.append('starsCost', String(idea.starsCost));
    if (idea.isMaterialSuggestion) queryParams.append('isMaterial', 'true');
    router.push(`/dashboard/rewards/new?${queryParams.toString()}`);
  };

  const handleOpenAssignDialog = (template: RewardTemplate) => {
    setTemplateToAssign(template);
    setIsAssignDialogOpen(true);
  };
  
  const currentContextName = useMemo(() => {
    if (currentContext === 'my-space') return 'Meu Catálogo Pessoal';
    const contextData = availableContexts.find(c => c.id === currentContext);
    return `Catálogo da Aliança: ${contextData?.name || ''}`;
  }, [currentContext, availableContexts]);

  const renderRewardCard = (template: RewardTemplate) => {
    const categoryDetails = getCategoryDetails(template.category);
    
    return (
      <Card key={template.id} className="shadow-sm hover:shadow-md transition-shadow flex flex-col bg-card h-full">
        <CardHeader>
          <div className="flex items-center gap-2">
            {categoryDetails?.icon && <categoryDetails.icon className="h-4 w-4 text-muted-foreground" />}
            <CardTitle className="text-base line-clamp-2">{template.title}</CardTitle>
          </div>
          {template.description && <CardDescription className="text-xs pt-1 line-clamp-2">{template.description}</CardDescription>}
        </CardHeader>
        <CardContent className="flex flex-col flex-grow p-6 pt-0">
          <div className="space-y-2">
            <Badge variant="secondary" className="font-semibold"><StarIcon className="h-4 w-4 mr-1.5 text-yellow-400 fill-yellow-400" /> {template.starsCost}</Badge>
          </div>
          <div className="flex-grow" />
           <div className="pt-4">
              <Separator className="mb-3" />
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5">
                  <Users className="h-4 w-4" /> Desbloqueado por:
                </h4>
                <div className="flex flex-wrap items-center gap-2 min-h-[32px]">
                {children.length > 0 ? (
                  children.map(child => {
                    const canAfford = child.stars >= template.starsCost;
                    const progress = canAfford ? 100 : (child.stars / template.starsCost) * 100;
                    return (
                       <TooltipProvider key={child.id} delayDuration={100}>
                        <Tooltip>
                          <TooltipTrigger>
                              <div className="relative">
                                  <Avatar className={cn("h-8 w-8", !canAfford && "opacity-40")}>
                                      <AvatarImage src={child.avatar} alt={child.name} />
                                      <AvatarFallback style={{backgroundColor: child.color}} className="text-xs">{getInitials(child.name)}</AvatarFallback>
                                  </Avatar>
                                  {!canAfford && (
                                    <svg className="h-8 w-8 absolute top-0 left-0" viewBox="0 0 36 36">
                                      <path
                                        className="stroke-muted"
                                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                        strokeWidth="2"
                                        fill="none"
                                      />
                                      <path
                                        className="stroke-primary"
                                        strokeDasharray={`${progress}, 100`}
                                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                        strokeWidth="2"
                                        fill="none"
                                      />
                                    </svg>
                                  )}
                              </div>
                          </TooltipTrigger>
                          <TooltipContent><p>{child.name}: {child.stars}/{template.starsCost} estrelas</p></TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )
                  })
                ) : (
                  <p className="text-xs text-muted-foreground italic">Nenhum herói neste espaço.</p>
                )}
                </div>
              </div>
            </div>
        </CardContent>
        <CardFooter className="flex items-center gap-2">
           <Button variant="default" className="w-full" onClick={() => handleOpenAssignDialog(template)} disabled={!canEdit}>
                <Users className="mr-2 h-4 w-4" /> Gerenciar
            </Button>
            <TooltipProvider>
                <Tooltip><TooltipTrigger asChild>
                    <Button variant="outline" size="icon" onClick={() => router.push(`/dashboard/rewards/edit-template/${template.id}`)} disabled={!canEdit} className="flex-shrink-0">
                        <Edit3 className="h-4 w-4" />
                    </Button>
                </TooltipTrigger><TooltipContent><p>Editar Recompensa</p></TooltipContent></Tooltip>
            </TooltipProvider>
            <TooltipProvider>
                <Tooltip><TooltipTrigger asChild>
                    <Button variant="outline" size="icon" onClick={() => setTemplateToDelete(template)} disabled={isProcessingAction || !canEdit} className="flex-shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </TooltipTrigger><TooltipContent><p>Excluir Recompensa</p></TooltipContent></Tooltip>
            </TooltipProvider>
        </CardFooter>
      </Card>
    );
  };
  
  const renderCatalogView = () => (
    <div className="space-y-6">
      <Card>
          <CardHeader>
              <CardTitle>{currentContextName}</CardTitle>
              <CardDescription>
                  {rewardTemplates.length > 0
                  ? "Estas são as recompensas que você criou ou personalizou. Elas aparecem na loja para seus heróis."
                  : "Seu catálogo está vazio. Adicione recompensas das ideias abaixo ou crie uma do zero."
                  }
              </CardDescription>
          </CardHeader>
          {rewardTemplates.length > 0 && (
            <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {rewardTemplates.map(renderRewardCard)}
                  </div>
            </CardContent>
          )}
      </Card>

       <Card>
        <CardHeader>
            <CardTitle>Ideias de Recompensas</CardTitle>
            <CardDescription>Inspire-se com estas sugestões. Clique em "Usar Ideia" para adicioná-la ao seu catálogo e poder atribuí-la.</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="space-y-6">
              {predefinedRewardGroups.map(group => (
                <section key={group.userCategory}>
                  <h3 className="text-xl font-headline font-bold mb-3">{group.userCategory}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {allIdeasWithStatus.filter(idea => idea.userCategory === group.userCategory).map((idea, idx) => (
                      <Card key={idx} className={cn("shadow-sm flex flex-col h-full", idea.isAdded && "bg-muted/40")}>
                        <CardHeader>
                           <CardTitle className="text-base">{idea.title}</CardTitle>
                           {idea.description && <CardDescription className="text-xs pt-1">{idea.description}</CardDescription>}
                        </CardHeader>
                        <CardContent className="flex-grow">
                          <Badge variant="secondary" className="font-semibold"><StarIcon className="h-4 w-4 mr-1.5 text-yellow-400 fill-yellow-400" /> {idea.starsCost}</Badge>
                        </CardContent>
                        <CardFooter>
                           <Button size="sm" className="w-full" onClick={() => handleUseIdea(idea)} disabled={!canEdit}>
                                {idea.isAdded ? "Editar no Catálogo" : "Usar Ideia"}
                            </Button>
                        </CardFooter>
                      </Card>
                    ))}
                  </div>
                </section>
              ))}
            </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="space-y-8 pb-10">
      <Card className="shadow-lg">
          <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                  <div>
                      <CardTitle className="text-3xl font-headline flex items-center">
                          <Gift className="mr-3 h-8 w-8 text-primary" />
                          Quadro de Recompensas
                      </CardTitle>
                      <CardDescription>
                          Inspire-se, crie e gerencie as recompensas para o seu espaço.
                      </CardDescription>
                  </div>
                  <Link href="/dashboard/rewards/new">
                      <Button className="w-full sm:w-auto" disabled={!canEdit}>
                          <PlusCircle className="mr-2 h-4 w-4" /> Criar Nova Recompensa
                      </Button>
                  </Link>
              </div>
          </CardHeader>
           <CardContent>
             <Accordion type="single" collapsible className="w-full" defaultValue="strategy">
                <AccordionItem value="strategy" className="border rounded-lg bg-card text-card-foreground shadow-sm">
                  <AccordionTrigger className="p-6 hover:no-underline w-full group text-left">
                    <div className="flex items-center gap-4">
                      <Info className="h-8 w-8 text-primary" />
                      <div>
                          <h2 className="text-2xl font-headline font-bold">Estratégia de Recompensas</h2>
                          <p className="text-sm text-muted-foreground font-normal mt-1">Escolha como as recompensas são disponibilizadas para seus heróis.</p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="p-6 pt-0">
                     <RadioGroup value={rewardMode} onValueChange={(v) => handleRewardModeChange(v as any)} className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                        <Label htmlFor="mode-auto" className="flex items-start gap-4 rounded-lg border p-4 transition-all has-[:checked]:border-primary has-[:checked]:ring-1 has-[:checked]:ring-primary cursor-pointer">
                            <RadioGroupItem value="automatic" id="mode-auto" className="mt-1" />
                            <div className="flex-grow">
                              <p className="font-semibold text-foreground">Automático (Recomendado)</p>
                              <p className="text-sm text-muted-foreground">O sistema notifica quando o herói pode resgatar. Você aprova, e pronto. Menos trabalho para você!</p>
                            </div>
                        </Label>
                        <Label htmlFor="mode-manual" className="flex items-start gap-4 rounded-lg border p-4 transition-all has-[:checked]:border-primary has-[:checked]:ring-1 has-[:checked]:ring-primary cursor-pointer">
                            <RadioGroupItem value="manual" id="mode-manual" className="mt-1" />
                            <div className="flex-grow">
                                <p className="font-semibold text-foreground">Manual</p>
                                <p className="text-sm text-muted-foreground">Você tem controle total e atribui manualmente cada recompensa do catálogo para cada criança.</p>
                            </div>
                        </Label>
                     </RadioGroup>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
           </CardContent>
      </Card>
      
      {renderCatalogView()}

      {templateToDelete && (
        <AlertDialog open={!!templateToDelete} onOpenChange={() => setTemplateToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir Recompensa do Catálogo</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja remover a recompensa "{templateToDelete.title}"? Esta ação removerá a recompensa do catálogo e de todos os heróis para os quais ela estava ativa.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isProcessingAction}>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive hover:bg-destructive/90" disabled={isProcessingAction}>
                {isProcessingAction ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Sim, Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {templateToAssign && (
        <AssignRewardDialog
          template={templateToAssign}
          isOpen={isAssignDialogOpen}
          onOpenChange={setIsAssignDialogOpen}
          onAssigned={fetchData}
        />
      )}
    </div>
  );
}

export default function RewardsHubPageWrapper() {
  const { user, loading: authLoading } = useAuth();
  const { currentContext, isLoading: isFamilyLoading } = useFamily();
  const [initialData, setInitialData] = useState<{ templates: RewardTemplate[], children: ChildProfile[], instances: ChildRewardInstance[], rewardMode: 'automatic' | 'manual' } | null>(null);

  const fetchData = useCallback(async () => {
    if (!user) return;
    const familyIdToQuery = currentContext === 'my-space' ? null : currentContext;
    try {
        const [templates, children, instances] = await Promise.all([
            getRewardTemplatesByOwnerOrFamily(user.uid, familyIdToQuery),
            getChildProfilesForAttribution(user.uid, currentContext),
            getChildRewardInstancesForContext(user.uid, familyIdToQuery),
        ]);
        setInitialData({ templates, children, instances, rewardMode: user.settings?.rewardMode || 'automatic' });
    } catch (err) {
        console.error("Error fetching initial data for rewards page:", err);
    }
  }, [user, currentContext]);

  useEffect(() => {
    if (!authLoading && !isFamilyLoading) {
      fetchData();
    }
  }, [authLoading, isFamilyLoading, fetchData]);

  if (authLoading || isFamilyLoading || !initialData) {
    return <Loading />;
  }

  return (
    <Suspense fallback={<Loading />}>
        <RewardsHubContent initialData={initialData} />
    </Suspense>
  );
}

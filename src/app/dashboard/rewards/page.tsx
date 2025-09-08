
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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Gift, PlusCircle, Star as StarIcon, PackageSearch, Loader2, MoreHorizontal, Edit3, Trash2, Users, Info, Sparkles, HelpCircle, User, Lightbulb, Puzzle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useFamily } from '@/contexts/FamilyContext';
import { 
  getRewardTemplatesByOwnerOrFamily, 
  deleteRewardTemplate,
  getChildProfilesForAttribution,
} from '@/lib/firebase/firestore';
import type { RewardTemplate, RewardCategoryDetails, ChildProfile, FamilyRole, RewardCategory } from '@/lib/types';
import { rewardCategories } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { AssignRewardDialog } from '@/components/dashboard/rewards/AssignRewardDialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, getInitials } from '@/lib/utils';
import { predefinedRewardGroups } from '@/lib/predefined-reward-ideas';
import type { PredefinedRewardIdea } from '@/lib/predefined-reward-ideas';
import Loading from './loading';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { PopoverClose } from '@radix-ui/react-popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';


function RewardsHubContent() {
  const { user, loading: authLoading } = useAuth();
  const { currentContext, currentRole, isLoading: isFamilyLoading } = useFamily();
  const { toast } = useToast();
  const router = useRouter();

  const [rewardTemplates, setRewardTemplates] = useState<RewardTemplate[]>([]);
  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(true);
  
  const [templateToDelete, setTemplateToDelete] = useState<RewardTemplate | null>(null);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [templateToAssign, setTemplateToAssign] = useState<RewardTemplate | null>(null);
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  
   const canEdit = useMemo(() => {
    if (currentContext === 'my-space') return true;
    if (!currentRole) return false;
    const editableRoles: FamilyRole[] = ['Owner', 'Co-Owner', 'Guardian'];
    return editableRoles.includes(currentRole as FamilyRole);
  }, [currentContext, currentRole]);
  
  const refetchData = useCallback(async () => {
    if (!user) {
        setIsDataLoading(false);
        return;
    }
    setIsDataLoading(true);
    try {
        const familyIdToQuery = currentContext === 'my-space' ? null : currentContext;
        const [templates, childrenData] = await Promise.all([
          getRewardTemplatesByOwnerOrFamily(user.uid, familyIdToQuery),
          getChildProfilesForAttribution(user.uid, currentContext),
        ]);
        setRewardTemplates(templates);
        setChildren(childrenData);
    } catch (err) {
      console.error("Error refetching rewards data:", err);
      toast({ title: "Erro ao atualizar dados", variant: 'destructive' });
    } finally {
      setIsDataLoading(false);
    }
  }, [user, currentContext, toast]);
  
  useEffect(() => {
    if (!authLoading && !isFamilyLoading) {
        refetchData();
    }
  }, [authLoading, isFamilyLoading, refetchData]);


  const existingTemplateTitles = useMemo(() => {
    return new Set(rewardTemplates.map(t => t.title.toLowerCase().trim()));
  }, [rewardTemplates]);

  const allIdeasWithStatus = useMemo(() => {
    return predefinedRewardGroups.flatMap(group => 
      group.items.map(idea => ({
        ...idea,
        isAdded: existingTemplateTitles.has(idea.title.toLowerCase().trim())
      }))
    );
  }, [rewardTemplates, existingTemplateTitles]);
  
  const customTemplates = useMemo(() => {
    return rewardTemplates.filter(template => template.source === 'custom');
  }, [rewardTemplates]);

  const customTemplatesByCategory = useMemo(() => {
    const grouped = customTemplates.reduce((acc, template) => {
        if (!acc[template.category]) {
            acc[template.category] = [];
        }
        acc[template.category].push(template);
        return acc;
    }, {} as Record<RewardCategory, RewardTemplate[]>);

    return rewardCategories
        .map(catInfo => ({
            ...catInfo,
            items: grouped[catInfo.id] || []
        }))
        .filter(group => group.items.length > 0);

  }, [customTemplates]);

  const handleDeleteConfirm = async () => {
    if (!templateToDelete || !user) return;
    setIsProcessingAction(true);
    try {
      await deleteRewardTemplate(user, templateToDelete);
      toast({ title: "Recompensa Removida do Catálogo!", description: `A recompensa "${templateToDelete.title}" foi removida.` });
      refetchData();
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
      const existingTemplate = rewardTemplates.find(t => t.title.toLowerCase().trim() === idea.title.toLowerCase().trim());
      if (existingTemplate) {
        handleOpenAssignDialog(existingTemplate);
      } else {
        toast({ title: "Recompensa já existe", description: "Esta recompensa já está no seu catálogo. Você pode editá-la lá." });
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
  
  const getCategoryDetails = (categoryId: RewardTemplate['category']): RewardCategoryDetails | undefined => {
    return rewardCategories.find(cat => cat.id === categoryId);
  };
  
  if (isDataLoading || isFamilyLoading) {
    return <Loading />;
  }

  return (
    <div className="space-y-8 pb-10">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-4">
             <div className="flex w-full sm:w-auto gap-2">
                <Button asChild className="w-full sm:w-auto" disabled={!canEdit}>
                    <Link href="/dashboard/rewards/new">
                        <PlusCircle className="mr-2 h-4 w-4" /> Criar Recompensa Personalizada
                    </Link>
                </Button>
            </div>
        </div>

        <Tabs defaultValue="ideas" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="ideas"><Lightbulb className="mr-2 h-4 w-4"/>Ideias de Recompensas</TabsTrigger>
                <TabsTrigger value="custom"><User className="mr-2 h-4 w-4"/>Personalizadas</TabsTrigger>
            </TabsList>
            <TabsContent value="ideas" className="mt-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Inspire-se para Novas Aventuras</CardTitle>
                        <CardDescription>Clique em "Usar Ideia" para adicioná-la ao seu catálogo de recompensas e poder atribuí-la aos seus heróis.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Accordion type="multiple" className="w-full space-y-4">
                            {predefinedRewardGroups.map((group) => (
                                <AccordionItem value={group.userCategory} key={group.userCategory} className="border rounded-lg shadow-sm">
                                    <AccordionTrigger className="p-4 hover:no-underline">
                                        <div className="flex items-center gap-3">
                                            <group.icon className="h-6 w-6 text-primary" />
                                            <span className="text-lg font-semibold">{group.userCategory}</span>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="p-4 pt-0">
                                        <p className="text-sm text-muted-foreground mb-4">{group.description}</p>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                                                            {idea.isAdded ? "Atribuir ao Herói" : "Usar esta Ideia"}
                                                        </Button>
                                                    </CardFooter>
                                                </Card>
                                            ))}
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    </CardContent>
                </Card>
            </TabsContent>
            <TabsContent value="custom" className="mt-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><User className="h-5 w-5 text-primary"/>Recompensas Criadas por Você</CardTitle>
                        <CardDescription>
                            Recompensas que você criou ou editou. Elas aparecem na loja para seus heróis.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {customTemplatesByCategory.length === 0 ? (
                            <p className="text-center text-muted-foreground py-6">Seu catálogo de recompensas personalizadas está vazio.</p>
                        ) : (
                            <Accordion type="multiple" defaultValue={customTemplatesByCategory.map(g => g.id)} className="w-full space-y-4">
                            {customTemplatesByCategory.map((group) => {
                                const CategoryIcon = group.icon;
                                return (
                                    <AccordionItem value={group.id} key={group.id} className="border rounded-lg shadow-sm">
                                        <AccordionTrigger className="p-4 hover:no-underline">
                                            <div className="flex items-center gap-3">
                                                {CategoryIcon && <CategoryIcon className={cn("h-6 w-6", group.colorClasses.split(" ")[1])} />}
                                                <span className="text-lg font-semibold">{group.label}</span>
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent className="p-4 pt-0">
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                                {group.items.map(template => (
                                                    <Card key={template.id} className="shadow-sm hover:shadow-md transition-shadow flex flex-col bg-card h-full">
                                                        <CardHeader>
                                                            <CardTitle className="text-base line-clamp-2">{template.title}</CardTitle>
                                                        </CardHeader>
                                                        <CardContent className="flex-grow pt-0 flex flex-col">
                                                            <div className="flex flex-wrap gap-2 items-center mb-3">
                                                                <Badge variant="outline" className="text-purple-700 border-purple-500/30 bg-purple-500/10">
                                                                    <Puzzle className="mr-1.5 h-3 w-3" />
                                                                    Personalizada
                                                                </Badge>
                                                                <Badge variant="secondary" className="font-semibold text-xs"><StarIcon className="h-3 w-3 mr-1.5 text-yellow-400 fill-yellow-400" /> {template.starsCost}</Badge>
                                                                <Badge variant={template.status === 'active' ? 'default' : 'secondary'} className="capitalize">
                                                                    {template.status === 'active' ? 'Ativa' : 'Arquivada'}
                                                                </Badge>
                                                            </div>
                                                            <div className="flex-grow" />
                                                            <div className="pt-2">
                                                                <p className="text-xs text-muted-foreground">{template.description || "Sem descrição."}</p>
                                                            </div>
                                                        </CardContent>
                                                        <CardFooter className="flex items-center gap-2">
                                                        <Button variant="default" className="w-full" onClick={() => handleOpenAssignDialog(template)} disabled={!canEdit || template.status === 'archived'}>
                                                                <Users className="mr-2 h-4 w-4" /> Atribuir ao Herói
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
                                                ))}
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                )
                            })}
                            </Accordion>
                        )}
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
        
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
              <AlertDialogAction
                onClick={handleDeleteConfirm}
                className="bg-destructive hover:bg-destructive/90"
                disabled={isProcessingAction}
              >
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
          onAssigned={refetchData}
        />
      )}
    </div>
  );
}

export default function RewardsHubPageWrapper() {
    return (
        <Suspense fallback={<Loading />}>
            <RewardsHubContent />
        </Suspense>
    );
}

    

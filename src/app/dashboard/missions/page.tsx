
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
import { Gift, PlusCircle, Star as StarIcon, PackageSearch, Loader2, MoreHorizontal, Edit3, Trash2, Users, Info, Sparkles, HelpCircle, Target, User, Puzzle, Lightbulb } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useFamily } from '@/contexts/FamilyContext';
import { 
  getMissionTemplatesByOwnerOrFamily, 
  deleteMissionTemplateAndInstances,
  getChildProfilesForAttribution,
  getMissionInstancesForContext
} from '@/lib/firebase/firestore';
import type { MissionTemplate, MissionCategoryDetails, ChildProfile, FamilyRole, MissionInstance } from '@/lib/types';
import { missionCategories } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { AssignMissionDialog } from '@/components/dashboard/missions/AssignMissionDialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, getInitials } from '@/lib/utils';
import Loading from './loading';
import { predefinedMissionGroups } from '@/lib/predefined-missions';
import type { PredefinedMissionIdea } from '@/lib/predefined-missions';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';


function MissionsHubContent() {
  const { user, loading: authLoading } = useAuth();
  const { currentContext, currentRole, isLoading: isFamilyLoading } = useFamily();
  const { toast } = useToast();
  const router = useRouter();

  const [missionTemplates, setMissionTemplates] = useState<MissionTemplate[]>([]);
  const [missionInstances, setMissionInstances] = useState<MissionInstance[]>([]);
  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(true);
  
  const [templateToDelete, setTemplateToDelete] = useState<MissionTemplate | null>(null);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [templateToAssign, setTemplateToAssign] = useState<MissionTemplate | null>(null);
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
    };
    setIsDataLoading(true);
    try {
        const familyIdToQuery = currentContext === 'my-space' ? null : currentContext;
        const [templates, childrenData, instances] = await Promise.all([
            getMissionTemplatesByOwnerOrFamily(user.uid, familyIdToQuery),
            getChildProfilesForAttribution(user.uid, currentContext),
            getMissionInstancesForContext(user.uid, familyIdToQuery)
        ]);
        setMissionTemplates(templates);
        setChildren(childrenData);
        setMissionInstances(instances.filter(i => i.status === 'pending')); 
    } catch (err) {
      console.error("Error refetching missions data:", err)
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
  
  const customTemplates = useMemo(() => {
    return missionTemplates.filter(template => template.source === 'custom');
  }, [missionTemplates]);

  const existingTemplateTitles = useMemo(() => {
    return new Set(missionTemplates.map(t => t.title.toLowerCase().trim()));
  }, [missionTemplates]);

  const handleDeleteConfirm = async () => {
    if (!templateToDelete || !user) return;
    setIsProcessingAction(true);
    try {
      await deleteMissionTemplateAndInstances(user, templateToDelete.id);
      toast({ title: "Missão e Agendamentos Removidos!", description: `A missão "${templateToDelete.title}" e suas atribuições foram removidas.` });
      refetchData();
    } catch (error) {
      console.error("Error deleting mission template:", error);
      toast({ title: "Erro ao Excluir Missão", description: "Não foi possível remover a missão.", variant: "destructive" });
    } finally {
      setTemplateToDelete(null);
      setIsProcessingAction(false);
    }
  };

  const handleOpenAssignDialog = (template: MissionTemplate) => {
    setTemplateToAssign(template);
    setIsAssignDialogOpen(true);
  };
  
  const handleUseIdea = (idea: PredefinedMissionIdea) => {
    const existingTemplate = missionTemplates.find(t => t.title.toLowerCase().trim() === idea.title.toLowerCase().trim());
    if (existingTemplate) {
      handleOpenAssignDialog(existingTemplate);
      return;
    }
    const queryParams = new URLSearchParams();
    queryParams.append('title', idea.title);
    queryParams.append('emoji', idea.emoji);
    queryParams.append('category', idea.suggestedAppCategory);
    queryParams.append('starsReward', String(idea.starsReward));
    queryParams.append('xpReward', String(idea.xpReward));
    router.push(`/dashboard/missions/new?${queryParams.toString()}`);
  };

  const getStatusBadgeVariant = (status: MissionTemplate['status']): "default" | "secondary" | "outline" => {
    switch (status) {
      case 'active': return 'default';
      case 'archived': return 'secondary'; 
      default: return 'outline';
    }
  };

  const getCategoryDetails = (categoryId: MissionTemplate['category']): MissionCategoryDetails | undefined => {
    return missionCategories.find(cat => cat.id === categoryId);
  };

  if (isDataLoading || isFamilyLoading) {
      return <Loading />;
  }

  return (
    <div className="space-y-8 pb-10">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-4">
             <div className="flex w-full sm:w-auto gap-2">
                <Button asChild className="w-full sm:w-auto" disabled={!canEdit}>
                    <Link href="/dashboard/missions/new">
                        <PlusCircle className="mr-2 h-4 w-4" /> Criar Missão Personalizada
                    </Link>
                </Button>
            </div>
        </div>

        <Tabs defaultValue="ideas" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="ideas">
                    <Lightbulb className="mr-2 h-4 w-4"/>Ideias de Missões
                </TabsTrigger>
                <TabsTrigger value="custom">
                    <User className="mr-2 h-4 w-4"/>Personalizadas
                </TabsTrigger>
            </TabsList>
            <TabsContent value="ideas" className="mt-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Ideias de Missões</CardTitle>
                        <CardDescription>Inspire-se com estas sugestões. Clique em "Usar Ideia" para adicioná-la ao seu catálogo e poder atribuí-la.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Accordion type="multiple" className="w-full space-y-4">
                            {predefinedMissionGroups.map((group) => (
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
                                            {group.items.map(idea => {
                                                const isAdded = existingTemplateTitles.has(idea.title.toLowerCase().trim());
                                                return (
                                                    <Card key={idea.title} className={cn("flex flex-col", isAdded && "bg-muted/40")}>
                                                        <CardHeader>
                                                            <CardTitle className="text-base flex items-center gap-2">
                                                                <span className="text-2xl">{idea.emoji}</span>
                                                                {idea.title}
                                                            </CardTitle>
                                                        </CardHeader>
                                                        <CardContent className="flex-grow">
                                                            <Badge variant="secondary" className="font-semibold text-xs"><StarIcon className="h-3 w-3 mr-1.5 text-yellow-400 fill-yellow-400" /> {idea.starsReward}</Badge>
                                                        </CardContent>
                                                        <CardFooter>
                                                            <Button size="sm" className="w-full" onClick={() => handleUseIdea(idea)} disabled={!canEdit}>
                                                                {isAdded ? "Gerenciar Missão" : "Usar esta Ideia"}
                                                            </Button>
                                                        </CardFooter>
                                                    </Card>
                                                )
                                            })}
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
                        <CardTitle className="flex items-center gap-2"><User className="h-5 w-5 text-primary"/>Missões Criadas por Você</CardTitle>
                        <CardDescription>
                            Estas são as missões que você criou do zero. Clique em "Gerenciar" para atribuí-las.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {customTemplates.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {customTemplates.map(template => {
                                    const categoryDetails = getCategoryDetails(template.category);
                                    return (
                                        <Card key={template.id} className="shadow-sm hover:shadow-md transition-shadow flex flex-col bg-card h-full">
                                            <CardHeader>
                                                <div className="flex items-start gap-2">
                                                    <span className="text-2xl mt-1">{template.emoji}</span>
                                                    <CardTitle className="text-base leading-tight">
                                                        {template.title}
                                                    </CardTitle>
                                                </div>
                                            </CardHeader>
                                            <CardContent className="flex-grow pt-0 flex flex-wrap gap-2 items-center">
                                               {categoryDetails && (
                                                    <Badge variant="outline" className={cn("text-xs", categoryDetails.colorClasses)}>
                                                      {categoryDetails.icon && <categoryDetails.icon className="mr-1.5 h-3 w-3" />}
                                                      {categoryDetails.label}
                                                    </Badge>
                                                )}
                                               <Badge variant="outline" className="text-purple-700 border-purple-500/30 bg-purple-500/10">
                                                  <Puzzle className="mr-1.5 h-3 w-3" />
                                                  Personalizada
                                               </Badge>
                                               <Badge variant="secondary" className="font-semibold text-xs"><StarIcon className="h-3 w-3 mr-1.5 text-yellow-400 fill-yellow-400" /> {template.starsReward}</Badge>
                                               <Badge variant={getStatusBadgeVariant(template.status)} className="capitalize">
                                                {template.status === 'active' ? 'Ativa' : 'Arquivada'}
                                               </Badge>
                                            </CardContent>
                                            <CardFooter className="flex items-center gap-2">
                                               <Button variant="default" className="w-full" onClick={() => handleOpenAssignDialog(template)} disabled={!canEdit || template.status === 'archived'}>
                                                    <Users className="mr-2 h-4 w-4" /> Gerenciar
                                                </Button>
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button variant="outline" size="icon" onClick={() => router.push(`/dashboard/missions/edit/${template.id}`)} disabled={!canEdit} className="flex-shrink-0">
                                                                <Edit3 className="h-4 w-4" />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent><p>Editar Missão</p></TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button variant="outline" size="icon" onClick={() => setTemplateToDelete(template)} disabled={isProcessingAction || !canEdit} className="flex-shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive">
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent><p>Excluir Missão</p></TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            </CardFooter>
                                        </Card>
                                    )
                                })}
                            </div>
                        ) : (
                            <div className="text-center py-10 text-muted-foreground">
                                <PackageSearch className="h-12 w-12 mx-auto mb-4 text-primary" />
                                <p className="font-semibold">Nenhuma missão personalizada encontrada.</p>
                                <p className="text-sm mt-1">Clique em "Criar Missão" para adicionar uma que não esteja nas ideias.</p>
                            </div>
                        )}
                    </CardContent>
                 </Card>
            </TabsContent>
        </Tabs>
        
        {templateToDelete && (
            <AlertDialog open={!!templateToDelete} onOpenChange={() => setTemplateToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>Excluir Missão do Catálogo</AlertDialogTitle>
                    <AlertDialogDescription>
                        Tem certeza que deseja remover a missão "{templateToDelete.title}"? Isso removerá a missão do catálogo e de TODAS as agendas em que ela foi atribuída. Esta ação não pode ser desfeita.
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
                        Sim, Excluir Tudo
                    </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        )}

        {templateToAssign && (
            <AssignMissionDialog
                template={templateToAssign}
                isOpen={isAssignDialogOpen}
                onOpenChange={setIsAssignDialogOpen}
                onAssigned={refetchData}
            />
        )}
    </div>
  );
}

export default function MissionsHubPageWrapper() {
    return (
        <Suspense fallback={<Loading />}>
            <MissionsHubContent />
        </Suspense>
    );
}

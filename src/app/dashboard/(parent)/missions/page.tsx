
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
import { Gift, PlusCircle, Star as StarIcon, PackageSearch, Loader2, MoreHorizontal, Edit3, Trash2, Users, Info, Sparkles, HelpCircle, Target, User, Puzzle, Lightbulb, Share2, CalendarDays } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useFamily } from '@/contexts/FamilyContext';
import { 
  getMissionTemplatesByOwnerOrFamily, 
  deleteMissionTemplateAndInstances,
  getChildProfilesForAttribution,
  getMissionInstancesForContext
} from '@/lib/supabase/db';
import type { MissionTemplate, MissionCategoryDetails, ChildProfile, FamilyRole, MissionInstance } from '@/lib/types';
import { missionCategories } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { AssignMissionDialog } from '@/components/dashboard/missions/AssignMissionDialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, getInitials } from '@/lib/utils';
import Loading from './loading';
import { predefinedMissionGroups } from '@/lib/predefined-missions';
import type { PredefinedMissionIdea } from '@/lib/predefined-missions';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ShareMissionDialog } from '@/components/dashboard/missions/ShareMissionDialog';
import { PostAssignmentSuccessDialog } from '@/components/dashboard/missions/PostAssignmentSuccessDialog';


function MissionsHubContent() {
  const { user, loading: authLoading } = useAuth();
  const { currentContext, currentRole, isLoading: isFamilyLoading } = useFamily();
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [missionTemplates, setMissionTemplates] = useState<MissionTemplate[]>([]);
  const [missionInstances, setMissionInstances] = useState<MissionInstance[]>([]);
  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(true);
  
  const [templateToDelete, setTemplateToDelete] = useState<MissionTemplate | null>(null);
  const [affectedChildrenNames, setAffectedChildrenNames] = useState<string[]>([]);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [templateToAssign, setTemplateToAssign] = useState<MissionTemplate | null>(null);
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [templateToShare, setTemplateToShare] = useState<MissionTemplate | null>(null);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);

  // State for the success dialog
  const [successDialogData, setSuccessDialogData] = useState<{ child: ChildProfile; template: MissionTemplate } | null>(null);
  
  const activeTab = searchParams.get('tab') || 'ideas';

  const handleTabChange = (value: string) => {
    const newParams = new URLSearchParams(searchParams.toString());
    newParams.set('tab', value);
    router.replace(`${pathname}?${newParams.toString()}`, { scroll: false });
  };

  const canEdit = useMemo(() => {
    if (currentContext === 'my-space') return true;
    if (!currentRole) return false;
    const editableRoles: FamilyRole[] = ['Owner', 'Co-Owner', 'Guardian'];
    return editableRoles.includes(currentRole as FamilyRole);
  }, [currentContext, currentRole]);
  
  const allPredefinedMissionTitles = useMemo(() => 
    new Set(predefinedMissionGroups.flatMap(g => g.items.map(i => i.title.toLowerCase().trim())))
  , []);
  
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
  }, [authLoading, isFamilyLoading, refetchData, activeTab]);
  
  const customTemplates = useMemo(() => {
    const predefinedTitles = new Set(predefinedMissionGroups.flatMap(g => g.items).map(i => i.title.toLowerCase().trim()));
    return missionTemplates.filter(template => {
        const isCustomSource = template.source === 'custom';
        const isNotInPredefined = !predefinedTitles.has(template.title.toLowerCase().trim());
        return isCustomSource && isNotInPredefined;
    }).sort((a, b) => a.title.localeCompare(b.title));
  }, [missionTemplates]);

  const existingTemplateTitles = useMemo(() => {
    return new Set(missionTemplates.map(t => t.title.toLowerCase().trim()));
  }, [missionTemplates]);

  const childrenMap = useMemo(() => new Map(children.map(child => [child.id, child])), [children]);

  const assignmentsByTemplate = useMemo(() => {
    const assignments = new Map<string, ChildProfile[]>();
    missionInstances.forEach(instance => {
      const child = childrenMap.get(instance.childId);
      if (child) {
        const existing = assignments.get(instance.templateId) || [];
        if (!existing.find(c => c.id === child.id)) {
          assignments.set(instance.templateId, [...existing, child]);
        }
      }
    });
    return assignments;
  }, [missionInstances, childrenMap]);

  const handleDeleteClick = (template: MissionTemplate) => {
    const children = assignmentsByTemplate.get(template.id) || [];
    setAffectedChildrenNames(children.map(c => c.name));
    setTemplateToDelete(template);
  };

  const handleDeleteConfirm = async () => {
    if (!templateToDelete || !user) return;
    setIsProcessingAction(true);
    
    // Optimistic UI Update
    const originalTemplates = [...missionTemplates];
    setMissionTemplates(prev => prev.filter(t => t.id !== templateToDelete.id));

    try {
      await deleteMissionTemplateAndInstances(user, templateToDelete.id);
      toast({ title: "Missão e Agendamentos Removidos!", description: `A missão "${templateToDelete.title}" e suas atribuições foram removidas.` });
    } catch (error) {
      console.error("Error deleting mission template:", error);
      toast({ title: "Erro ao Excluir Missão", description: "Não foi possível remover a missão. A lista foi restaurada.", variant: "destructive" });
      setMissionTemplates(originalTemplates); // Revert on error
    } finally {
      setTemplateToDelete(null);
      setAffectedChildrenNames([]);
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
    router.push(`/dashboard/missions/new?${queryParams.toString()}`);
  };

  const handleShareClick = (template: MissionTemplate) => {
    setTemplateToShare(template);
    setIsShareDialogOpen(true);
  }

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
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
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
                        <CardDescription>Inspire-se com estas sugestões. Clique em "Usar Ideia" para adicionar a missão ao seu catálogo de missões personalizadas e poder atribuí-la aos seus heróis.</CardDescription>
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
                                                                {isAdded ? "Personalizar Missão" : "Usar esta Ideia"}
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
                        <CardTitle className="flex items-center gap-2"><User className="h-5 w-5 text-primary"/>Missões Personalizadas</CardTitle>
                        <CardDescription>
                            {customTemplates.length > 0
                            ? "Estas são as missões que você criou do zero ou personalizou a partir de uma ideia."
                            : "Seu catálogo de missões personalizadas está vazio."
                            }
                        </CardDescription>
                    </CardHeader>
                    {customTemplates.length > 0 && (
                        <CardContent>
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
                                                    <CalendarDays className="mr-2 h-4 w-4" /> Agendar
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
                                                    <Tooltip><TooltipTrigger asChild>
                                                        <Button variant="outline" size="icon" onClick={() => handleShareClick(template)} disabled={!canEdit} className="flex-shrink-0">
                                                            <Share2 className="h-4 w-4" />
                                                        </Button>
                                                    </TooltipTrigger><TooltipContent><p>Compartilhar com outros espaços</p></TooltipContent></Tooltip>
                                                </TooltipProvider>
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button variant="outline" size="icon" onClick={() => handleDeleteClick(template)} disabled={isProcessingAction || !canEdit} className="flex-shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive">
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
                        </CardContent>
                    )}
                </Card>
            </TabsContent>
        </Tabs>
        
        {templateToDelete && (
            <AlertDialog open={!!templateToDelete} onOpenChange={() => setTemplateToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>Excluir Missão do Catálogo</AlertDialogTitle>
                    <AlertDialogDescription>
                        Tem certeza que deseja remover a missão "{templateToDelete.title}"? Isso removerá a missão do catálogo e de TODAS as agendas em que ela foi atribuída.
                        {affectedChildrenNames.length > 0 && (
                            <span className="block mt-2 font-semibold text-foreground">
                                Herois afetados: {affectedChildrenNames.join(', ')}.
                            </span>
                        )}
                        <br/>
                        Esta ação não pode ser desfeita.
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
                onAssigned={(child, template) => {
                    refetchData();
                    setSuccessDialogData({ child, template });
                }}
            />
        )}
        
        {successDialogData && (
          <PostAssignmentSuccessDialog
            isOpen={!!successDialogData}
            onDone={() => setSuccessDialogData(null)}
            child={successDialogData.child}
            template={successDialogData.template}
          />
        )}

        {templateToShare && (
            <ShareMissionDialog
                template={templateToShare}
                isOpen={isShareDialogOpen}
                onOpenChange={setIsShareDialogOpen}
                onShared={refetchData}
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

    
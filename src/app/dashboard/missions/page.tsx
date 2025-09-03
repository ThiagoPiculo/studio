
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
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Gift, PlusCircle, Star as StarIcon, PackageSearch, Loader2, MoreHorizontal, Edit3, Trash2, Users, Info, Sparkles, HelpCircle, Target } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useFamily } from '@/contexts/FamilyContext';
import { 
  getMissionTemplatesByOwnerOrFamily, 
  deleteMissionTemplateAndInstances,
} from '@/lib/firebase/firestore';
import type { MissionTemplate, MissionCategoryDetails, ChildProfile, FamilyRole } from '@/lib/types';
import { missionCategories } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { AssignMissionDialog } from '@/components/dashboard/missions/AssignMissionDialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, getInitials } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import Loading from './loading';
import { predefinedMissionGroups } from '@/lib/predefined-missions';
import type { PredefinedMissionIdea } from '@/lib/predefined-missions';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';

function MissionsHubContent() {
  const { user, loading: authLoading } = useAuth();
  const { currentContext, currentRole, isLoading: isFamilyLoading } = useFamily();
  const { toast } = useToast();
  const router = useRouter();

  const [missionTemplates, setMissionTemplates] = useState<MissionTemplate[]>([]);
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
        const templates = await getMissionTemplatesByOwnerOrFamily(user.uid, familyIdToQuery);
        setMissionTemplates(templates);
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

  if (isDataLoading || isFamilyLoading) {
      return <Loading />;
  }

  return (
    <div className="space-y-8 pb-10">
      
      {missionTemplates.length > 0 && (
         <Card>
            <CardHeader>
                <CardTitle>Seu Catálogo de Missões</CardTitle>
                <CardDescription>
                  As missões que você já criou. Clique em "Gerenciar" para atribuí-las.
                </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {missionTemplates.map(template => (
                    <Card key={template.id} className="shadow-sm hover:shadow-md transition-shadow flex flex-col bg-card h-full">
                        <CardHeader>
                            <div className="flex items-start gap-2">
                                <span className="text-2xl mt-1">{template.emoji}</span>
                                <CardTitle className="text-base leading-tight">
                                    {template.title}
                                </CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="flex-grow pt-0">
                           <Badge variant={getStatusBadgeVariant(template.status)} className="capitalize">
                            {template.status === 'active' ? 'Ativa' : 'Arquivada'}
                           </Badge>
                        </CardContent>
                        <CardFooter className="flex items-center gap-2">
                           <Button variant="default" className="w-full" onClick={() => handleOpenAssignDialog(template)} disabled={!canEdit || template.status === 'archived'}>
                                <Users className="mr-2 h-4 w-4" /> Gerenciar
                            </Button>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="icon" className="flex-shrink-0">
                                        <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onSelect={() => router.push(`/dashboard/missions/edit/${template.id}`)} disabled={!canEdit}>
                                        <Edit3 className="mr-2 h-4 w-4" /> Editar Missão
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onSelect={() => setTemplateToDelete(template)} disabled={!canEdit} className="text-destructive focus:text-destructive">
                                        <Trash2 className="mr-2 h-4 w-4" /> Excluir Missão
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </CardFooter>
                    </Card>
                ))}
            </CardContent>
         </Card>
      )}

      <Card>
          <CardHeader>
              <CardTitle>Ideias de Missões</CardTitle>
              <CardDescription>Inspire-se com estas sugestões. Clique em "Usar Ideia" para adicioná-la ao seu catálogo.</CardDescription>
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

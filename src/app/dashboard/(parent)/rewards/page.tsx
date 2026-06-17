
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
  getRewardTemplatesByOwnerOrFamily,
  deleteRewardTemplate,
} from '@/lib/supabase/db';
import type { RewardTemplate, RewardCategoryDetails, FamilyRole } from '@/lib/types';
import { rewardCategories } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { AssignRewardDialog } from '@/components/dashboard/rewards/AssignRewardDialog';
import { ShareRewardDialog } from '@/components/dashboard/rewards/ShareRewardDialog';
import { cn } from '@/lib/utils';
import Loading from './loading';
import { predefinedRewardGroups } from '@/lib/predefined-reward-ideas';
import type { PredefinedRewardIdea } from '@/lib/predefined-reward-ideas';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';


function RewardsHubContent() {
  const { user, loading: authLoading } = useAuth();
  const { currentContext, currentRole, isLoading: isFamilyLoading } = useFamily();
  const { toast } = useToast();
  const router = useRouter();

  const [rewardTemplates, setRewardTemplates] = useState<RewardTemplate[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(true);
  
  const [templateToDelete, setTemplateToDelete] = useState<RewardTemplate | null>(null);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [templateToAssign, setTemplateToAssign] = useState<RewardTemplate | null>(null);
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [templateToShare, setTemplateToShare] = useState<RewardTemplate | null>(null);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const searchParams = useSearchParams();
  const pathname = usePathname();
  
  const activeTab = searchParams.get('tab') || 'ideas';

  const handleTabChange = (value: string) => {
    const newParams = new URLSearchParams(searchParams.toString());
    newParams.set('tab', value);
    router.replace(`${pathname}?${newParams.toString()}`);
  };

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
        const templates = await getRewardTemplatesByOwnerOrFamily(user.uid, familyIdToQuery);
        setRewardTemplates(templates);
    } catch (err) {
      console.error("Error refetching rewards data:", err)
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
    return rewardTemplates.filter(template => template.source === 'custom').sort((a, b) => a.title.localeCompare(b.title));
  }, [rewardTemplates]);

  const existingTemplateTitles = useMemo(() => {
    return new Set(rewardTemplates.map(t => t.title.toLowerCase().trim()));
  }, [rewardTemplates]);

  const handleDeleteClick = (template: RewardTemplate) => {
    setTemplateToDelete(template);
  };

  const handleDeleteConfirm = async () => {
    if (!templateToDelete || !user) return;
    setIsProcessingAction(true);
    
    try {
      await deleteRewardTemplate(user, templateToDelete);
      toast({ title: "Recompensa Removida!", description: `A recompensa "${templateToDelete.title}" foi removida do catálogo.` });
      refetchData();
    } catch (error) {
      console.error("Error deleting reward template:", error);
      toast({ title: "Erro ao Excluir Recompensa", description: "Não foi possível remover a recompensa.", variant: "destructive" });
    } finally {
      setTemplateToDelete(null);
      setIsProcessingAction(false);
    }
  };

  const handleOpenAssignDialog = (template: RewardTemplate) => {
    setTemplateToAssign(template);
    setIsAssignDialogOpen(true);
  };
  
  const handleUseIdea = (idea: PredefinedRewardIdea) => {
    const queryParams = new URLSearchParams();
    queryParams.append('title', idea.title);
    if(idea.description) queryParams.append('description', idea.description);
    queryParams.append('category', idea.suggestedAppCategory);
    if(idea.starsCost) queryParams.append('starsCost', String(idea.starsCost));
    if(idea.isMaterialSuggestion) queryParams.append('isMaterial', String(idea.isMaterialSuggestion));
    router.push(`/dashboard/rewards/new?${queryParams.toString()}`);
  };

  const handleShareClick = (template: RewardTemplate) => {
    setTemplateToShare(template);
    setIsShareDialogOpen(true);
  }

  const getStatusBadgeVariant = (status: RewardTemplate['status']): "default" | "secondary" | "outline" => {
    switch (status) {
      case 'active': return 'default';
      case 'archived': return 'secondary'; 
      default: return 'outline';
    }
  };

  const getCategoryDetails = (categoryId: RewardTemplate['category']): RewardCategoryDetails | undefined => {
    return rewardCategories.find(cat => cat.id === categoryId);
  };

  if (isDataLoading || isFamilyLoading) {
      return <Loading />;
  }

  return (
    <div className="space-y-8 pb-10">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="ideas">
                    <Lightbulb className="mr-2 h-4 w-4"/>Ideias de Recompensas
                </TabsTrigger>
                <TabsTrigger value="custom">
                    <User className="mr-2 h-4 w-4"/>Personalizadas
                </TabsTrigger>
            </TabsList>
            <TabsContent value="ideas" className="mt-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Ideias de Recompensas</CardTitle>
                        <CardDescription>Inspire-se com estas sugestões. Clique em "Usar Ideia" para adicionar a recompensa ao seu catálogo de recompensas personalizadas e poder atribuí-la aos seus heróis.</CardDescription>
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
                                            {group.items.map(idea => {
                                                const isAdded = existingTemplateTitles.has(idea.title.toLowerCase().trim());
                                                return (
                                                    <Card key={idea.title} className={cn("flex flex-col", isAdded && "bg-muted/40")}>
                                                        <CardHeader>
                                                            <CardTitle className="text-base flex items-center gap-2">
                                                                {idea.title}
                                                            </CardTitle>
                                                        </CardHeader>
                                                        <CardContent className="flex-grow">
                                                            <Badge variant="secondary" className="font-semibold text-xs"><StarIcon className="h-3 w-3 mr-1.5 text-yellow-400 fill-yellow-400" /> {idea.starsCost}</Badge>
                                                        </CardContent>
                                                        <CardFooter>
                                                            <Button size="sm" className="w-full" onClick={() => handleUseIdea(idea)} disabled={!canEdit}>
                                                                {isAdded ? "Personalizar Recompensa" : "Usar esta Ideia"}
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
                        <CardTitle className="flex items-center gap-2"><User className="h-5 w-5 text-primary"/>Recompensas Personalizadas</CardTitle>
                        <CardDescription>
                            {customTemplates.length > 0
                            ? "Estas são as recompensas que você criou do zero ou personalizou a partir de uma ideia."
                            : "Seu catálogo de recompensas personalizadas está vazio."
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
                                                <Badge variant="secondary" className="font-semibold text-xs"><StarIcon className="h-3 w-3 mr-1.5 text-yellow-400 fill-yellow-400" /> {template.starsCost}</Badge>
                                               <Badge variant={getStatusBadgeVariant(template.status)} className="capitalize">
                                                {template.status === 'active' ? 'Ativa' : 'Arquivada'}
                                               </Badge>
                                            </CardContent>
                                            <CardFooter className="grid grid-cols-3 gap-1">
                                               <Button variant="default" size="sm" onClick={() => handleOpenAssignDialog(template)} disabled={!canEdit || template.status === 'archived'}>
                                                    <Users className="mr-2 h-4 w-4" /> Atribuir
                                                </Button>
                                                <Button variant="outline" size="icon" onClick={() => router.push(`/dashboard/rewards/edit-template/${template.id}`)} disabled={!canEdit}>
                                                    <Edit3 className="h-4 w-4" />
                                                </Button>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="outline" size="icon" disabled={!canEdit}><MoreHorizontal className="h-4 w-4" /></Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onSelect={() => handleShareClick(template)}><Share2 className="mr-2 h-4 w-4" /> Compartilhar</DropdownMenuItem>
                                                        <DropdownMenuItem onSelect={() => handleDeleteClick(template)} className="text-destructive focus:bg-destructive focus:text-destructive-foreground"><Trash2 className="mr-2 h-4 w-4" /> Excluir</DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
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
                    <AlertDialogTitle>Excluir Recompensa do Catálogo</AlertDialogTitle>
                    <AlertDialogDescription>
                        Tem certeza que deseja remover permanentemente a recompensa "{templateToDelete.title}" do seu catálogo? Isso não afetará as recompensas já atribuídas aos heróis.
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
        
        {templateToShare && (
            <ShareRewardDialog
                template={templateToShare}
                isOpen={isShareDialogOpen}
                onOpenChange={setIsShareDialogOpen}
                onShared={refetchData}
            />
        )}
    </div>
  );
}

export default function RewardsHubPage() {
    return (
        <Suspense fallback={<Loading />}>
            <RewardsHubContent />
        </Suspense>
    );
}


"use client";

import React, { useEffect, useState, useMemo, useCallback } from 'react';
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
import { Label } from '@/components/ui/label';
import { Gift, PlusCircle, Star as StarIcon, Loader2, Edit3, Trash2, ArrowRight, Users, Info, PackageSearch } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useFamily } from '@/contexts/FamilyContext';
import { 
  getRewardTemplatesByOwnerOrFamily, 
  deleteRewardTemplate,
  getChildProfilesForAttribution,
  getChildRewardInstancesForContext,
  populateInitialRewardTemplates
} from '@/lib/firebase/firestore';
import type { RewardTemplate, RewardCategoryDetails, ChildProfile, ChildRewardInstance, UserProfile } from '@/lib/types';
import { rewardCategories } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { AssignRewardDialog } from '@/components/dashboard/rewards/AssignRewardDialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useUserRole } from '@/hooks/useUserRole';
import { Skeleton } from '@/components/ui/skeleton';
import { db } from '@/lib/firebase/config';
import { doc, updateDoc } from 'firebase/firestore';
import { Separator } from '@/components/ui/separator';

export default function RewardsHubPage() {
  const { user } = useAuth();
  const { currentContext, availableContexts } = useFamily();
  const { canEdit, isLoading: isRoleLoading } = useUserRole();
  const { toast } = useToast();
  const router = useRouter();

  const [rewardTemplates, setRewardTemplates] = useState<RewardTemplate[]>([]);
  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [rewardInstances, setRewardInstances] = useState<ChildRewardInstance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPopulating, setIsPopulating] = useState(false);
  
  const [templateToDelete, setTemplateToDelete] = useState<RewardTemplate | null>(null);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [templateToAssign, setTemplateToAssign] = useState<RewardTemplate | null>(null);
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  const rewardMode = user?.settings?.rewardMode || 'automatic';

  const fetchData = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const familyIdToQuery = currentContext === 'my-space' ? null : currentContext;
      const [templates, children, instances] = await Promise.all([
        getRewardTemplatesByOwnerOrFamily(user.uid, familyIdToQuery),
        getChildProfilesForAttribution(user.uid, currentContext),
        getChildRewardInstancesForContext(user.uid, familyIdToQuery)
      ]);
      
      // Check for existing users with no templates
      if (templates.length === 0 && children.length > 0) {
        setIsPopulating(true);
        await populateInitialRewardTemplates(user.uid);
        // Refetch after populating
        const newTemplates = await getRewardTemplatesByOwnerOrFamily(user.uid, familyIdToQuery);
        setRewardTemplates(newTemplates);
        setIsPopulating(false);
      } else {
        setRewardTemplates(templates);
      }
      
      setChildren(children);
      setRewardInstances(instances.filter(i => i.status === 'active'));
    } catch (err) {
      console.error("Error fetching rewards data:", err);
      toast({ title: "Erro ao buscar recompensas", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [user, currentContext, toast]);


  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const groupedAndSortedTemplates = useMemo(() => {
    const grouped: Record<string, RewardTemplate[]> = {};
    rewardTemplates.forEach(template => {
        if (!grouped[template.category]) {
            grouped[template.category] = [];
        }
        grouped[template.category].push(template);
    });

    for (const category in grouped) {
        grouped[category].sort((a, b) => a.starsCost - b.starsCost);
    }

    // Return as an array of categories with items, ordered by our predefined category order
    return rewardCategories
        .map(categoryInfo => ({
            ...categoryInfo,
            items: grouped[categoryInfo.id] || []
        }))
        .filter(group => group.items.length > 0);
  }, [rewardTemplates]);
  
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
          // The AuthProvider's onSnapshot will update the user state automatically.
      } catch (error) {
          console.error("Failed to update reward mode:", error);
          toast({ title: "Erro ao salvar", description: "Não foi possível alterar sua estratégia de recompensas.", variant: "destructive"});
      }
  };

  const childrenMap = useMemo(() => new Map(children.map(child => [child.id, child])), [children]);

  const assignmentsByTemplate = useMemo(() => {
    const assignments = new Map<string, ChildProfile[]>();
    rewardInstances.forEach(instance => {
      const child = childrenMap.get(instance.childId);
      if (child) {
        const existing = assignments.get(instance.templateId) || [];
        if (!existing.find(c => c.id === child.id)) {
          assignments.set(instance.templateId, [...existing, child]);
        }
      }
    });
    return assignments;
  }, [rewardInstances, childrenMap]);

  const getInitials = (name?: string | null) => {
    if (!name) return "MH"; 
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

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

  const handleOpenAssignDialog = (template: RewardTemplate) => {
    setTemplateToAssign(template);
    setIsAssignDialogOpen(true);
  };
  
  if (isLoading || isRoleLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-48 w-full" />
        <Card>
           <CardHeader>
             <Skeleton className="h-6 w-1/2" />
          </CardHeader>
           <CardContent className="text-center py-10">
              <div className="flex justify-center mb-4">
                <Loader2 className="h-16 w-16 text-primary animate-spin" />
              </div>
              <p className="text-lg text-muted-foreground font-semibold">Carregando a lojinha...</p>
              <p className="text-sm text-muted-foreground mt-1">
                  Buscando as melhores recompensas para seus heróis.
              </p>
            </CardContent>
        </Card>
      </div>
    );
  }
  
  if (isPopulating) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-48 w-full" />
        <Card>
           <CardHeader>
             <Skeleton className="h-6 w-1/2" />
          </CardHeader>
           <CardContent className="text-center py-10">
              <div className="flex justify-center mb-4">
                <Loader2 className="h-16 w-16 text-primary animate-spin" />
              </div>
              <p className="text-lg text-muted-foreground font-semibold">Preparando seu catálogo inicial...</p>
              <p className="text-sm text-muted-foreground mt-1">
                  As recompensas padrão estão sendo adicionadas. Isto pode levar um momento.
              </p>
            </CardContent>
        </Card>
      </div>
    )
  }

  const renderRewardCard = (template: RewardTemplate) => {
    const categoryDetails = getCategoryDetails(template.category);
    const assignedChildren = assignmentsByTemplate.get(template.id) || [];
    return (
      <Card key={template.id} className="shadow-md hover:shadow-lg transition-shadow flex flex-col bg-card">
        <CardHeader>
          <div className="flex items-center gap-2">
            {categoryDetails?.icon && <categoryDetails.icon className="h-5 w-5 text-muted-foreground" />}
            <CardTitle className="text-xl line-clamp-2">{template.title}</CardTitle>
          </div>
          {template.description && <CardDescription className="text-xs pt-1 line-clamp-2">{template.description}</CardDescription>}
        </CardHeader>
        <CardContent className="flex flex-col flex-grow p-6 pt-0">
          <div className="space-y-2">
            <Badge variant="secondary" className="font-semibold"><StarIcon className="h-4 w-4 mr-1.5 text-yellow-400 fill-yellow-400" /> {template.starsCost}</Badge>
          </div>
          <div className="flex-grow" />
          {rewardMode === 'manual' && (
            <div className="pt-4">
              <Separator className="mb-3" />
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5">
                  <Users className="h-4 w-4" /> Atribuído a:
                </h4>
                {assignedChildren.length > 0 ? (
                  <div className="flex -space-x-2">
                    {assignedChildren.slice(0, 5).map(child => (
                      <TooltipProvider key={child.id} delayDuration={100}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Avatar className="h-8 w-8 border-2 border-background">
                              <AvatarImage src={child.avatar} alt={child.name} />
                              <AvatarFallback style={{backgroundColor: child.color}} className="text-xs">{getInitials(child.name)}</AvatarFallback>
                            </Avatar>
                          </TooltipTrigger>
                          <TooltipContent><p>{child.name}</p></TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ))}
                    {assignedChildren.length > 5 && <span className="text-xs font-medium text-muted-foreground pl-3 self-center">+ {assignedChildren.length - 5}</span>}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">Ninguém no momento.</p>
                )}
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex items-center gap-2">
           <Button variant="default" className="w-full" onClick={() => handleOpenAssignDialog(template)} disabled={!canEdit}>
                <Users className="mr-2 h-4 w-4" /> {rewardMode === 'automatic' ? 'Gerenciar' : 'Atribuir'}
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
  
  const renderCatalogView = (
      <div className="space-y-8">
        {groupedAndSortedTemplates.map(group => {
            const GroupIcon = group.icon;
            return (
                <section key={group.userCategory} aria-labelledby={`category-title-${group.id}`}>
                    <div className="flex items-center gap-3 mb-4">
                        <GroupIcon className="h-8 w-8 text-primary" />
                        <h2 id={`category-title-${group.id}`} className="text-2xl font-headline font-bold">
                            {group.userCategory}
                        </h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {group.items.map(renderRewardCard)}
                    </div>
                </section>
            );
        })}
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
                          Lojinha de Recompensas
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
      </Card>

      <Card>
          <CardHeader>
              <CardTitle>Estratégia de Recompensas</CardTitle>
              <CardDescription>Escolha como as recompensas são disponibilizadas para seus heróis.</CardDescription>
          </CardHeader>
          <CardContent>
              <RadioGroup value={rewardMode} onValueChange={(v) => handleRewardModeChange(v as 'automatic' | 'manual')} className="space-y-2">
                  <Label htmlFor="mode-auto" className="flex items-start gap-4 rounded-lg border p-4 transition-all has-[:checked]:border-primary has-[:checked]:ring-1 has-[:checked]:ring-primary">
                       <RadioGroupItem value="automatic" id="mode-auto" className="mt-1" />
                       <div className="flex-grow">
                          <p className="font-semibold text-foreground">Automático (Recomendado)</p>
                          <p className="text-sm text-muted-foreground">O app sugere recompensas e notifica você para aprová-las quando a criança atingir as estrelas necessárias. Menos trabalho para você!</p>
                       </div>
                  </Label>
                   <Label htmlFor="mode-manual" className="flex items-start gap-4 rounded-lg border p-4 transition-all has-[:checked]:border-primary has-[:checked]:ring-1 has-[:checked]:ring-primary">
                       <RadioGroupItem value="manual" id="mode-manual" className="mt-1" />
                       <div className="flex-grow">
                           <p className="font-semibold text-foreground">Manual</p>
                           <p className="text-sm text-muted-foreground">Você tem controle total e atribui manualmente cada recompensa do catálogo para cada criança.</p>
                       </div>
                  </Label>
              </RadioGroup>
          </CardContent>
      </Card>

      <Card>
        <CardHeader>
            <CardTitle>Catálogo de Recompensas</CardTitle>
            <CardDescription>
                {rewardMode === 'automatic'
                    ? "Esta é a lista de recompensas que o sistema usará para sugerir e notificar você. Gerencie as atribuições para ajustar a experiência."
                    : "No modo manual, você cria e atribui cada recompensa. Estas são as que você já criou."
                }
            </CardDescription>
        </CardHeader>
        <CardContent>
            {groupedAndSortedTemplates.length > 0 ? (
                renderCatalogView
            ) : rewardMode === 'automatic' ? (
                 <div className="text-center py-10 border-2 border-dashed border-muted-foreground/30 rounded-lg">
                    <Loader2 className="mx-auto h-16 w-16 text-muted-foreground mb-4 animate-spin" />
                    <p className="text-lg text-muted-foreground">Populando seu catálogo inicial...</p>
                    <p className="text-sm text-muted-foreground mt-1">
                        As recompensas padrão estão sendo adicionadas. Isto pode levar um momento.
                    </p>
                </div>
            ) : (
                <div className="text-center py-10 border-2 border-dashed border-muted-foreground/30 rounded-lg">
                    <PackageSearch className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
                    <p className="text-lg text-muted-foreground">Seu catálogo de recompensas está vazio.</p>
                    <p className="text-sm text-muted-foreground mt-1">
                        Clique em "Criar Nova Recompensa" para começar a adicionar prêmios.
                    </p>
                </div>
            )}
        </CardContent>
      </Card>

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

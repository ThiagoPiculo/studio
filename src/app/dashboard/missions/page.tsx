
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Gift, PlusCircle, Star as StarIcon, PackageSearch, Loader2, MoreHorizontal, Edit3, Trash2, PackagePlus, Sparkles, ArrowRight, Users, Filter, Search, Tag, Coins, Info, AlertTriangle, Lightbulb, BadgeCheck, CalendarDays, Target, HelpCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useFamily } from '@/contexts/FamilyContext';
import { 
  getMissionTemplatesByOwnerOrFamily, 
  deleteMissionTemplate,
  getChildProfilesForAttribution,
  getMissionInstancesForContext,
  deleteMissionTemplateAndInstances,
} from '@/lib/firebase/firestore';
import type { MissionTemplate, MissionCategoryDetails, ChildProfile, MissionInstance, FamilyRole } from '@/lib/types';
import { missionCategories } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { AssignMissionDialog } from '@/components/dashboard/missions/AssignMissionDialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { HeroSelector } from '@/components/dashboard/dashboard/HeroSelector';
import Loading from './loading';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { PopoverClose } from '@radix-ui/react-popover';


function MissionsHubContent() {
  const { user } = useAuth();
  const { currentContext, availableContexts, currentRole, isLoading: isFamilyLoading } = useFamily();
  const { toast } = useToast();
  const router = useRouter();

  const [missionTemplates, setMissionTemplates] = useState<MissionTemplate[]>([]);
  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [missionInstances, setMissionInstances] = useState<MissionInstance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<MissionTemplate | null>(null);
  const [alsoDeleteInstances, setAlsoDeleteInstances] = useState(false);
  
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [templateToAssign, setTemplateToAssign] = useState<MissionTemplate | null>(null);
  
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);

  const canEdit = useMemo(() => {
    if (currentContext === 'my-space') return true;
    if (!currentRole) return false;
    const editableRoles: FamilyRole[] = ['Owner', 'Co-Owner', 'Guardian'];
    return editableRoles.includes(currentRole as FamilyRole);
  }, [currentContext, currentRole]);
  
  const refetchAllData = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
        const familyIdToQuery = currentContext === 'my-space' ? null : currentContext;
        const [templates, children, instances] = await Promise.all([
          getMissionTemplatesByOwnerOrFamily(user.uid, familyIdToQuery),
          getChildProfilesForAttribution(user.uid, currentContext),
          getMissionInstancesForContext(user.uid, familyIdToQuery)
        ]);
        setMissionTemplates(templates);
        setChildren(children);
        setMissionInstances(instances.filter(i => i.status === 'pending'));
    } catch (err) {
      console.error("Error refetching missions data:", err)
      toast({ title: "Erro ao atualizar dados", variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [user, currentContext, toast]);

  useEffect(() => {
    refetchAllData();
  }, [refetchAllData]);
  
  const childrenMap = useMemo(() => {
    return new Map(children.map(child => [child.id, child]));
  }, [children]);

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
  
  const getInitials = (name?: string | null) => {
    if (!name) return "MH"; 
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  const getCategoryDetails = (categoryId: MissionTemplate['category']): MissionCategoryDetails | undefined => {
    return missionCategories.find(cat => cat.id === categoryId);
  };
  
  const currentContextText = useMemo(() => {
    if (currentContext === 'my-space') return "o seu Espaço Pessoal";
    const family = availableContexts.find(f => f.id === currentContext);
    return family ? `a Aliança ${family.name}` : "o contexto atual";
  }, [availableContexts, currentContext]);
  
  const filteredTemplates = useMemo(() => {
    let templates = [...missionTemplates];

    if (selectedChildId) {
        const assignedTemplateIds = new Set(
            missionInstances
                .filter(inst => inst.childId === selectedChildId)
                .map(inst => inst.templateId)
        );
        templates = templates.filter(template => assignedTemplateIds.has(template.id));
    }

    return templates;
  }, [missionTemplates, missionInstances, selectedChildId]);

  const handleDeleteConfirm = async () => {
    if (!templateToDelete || !user) return;
    setIsProcessingAction(true);
    try {
      if (alsoDeleteInstances) {
        await deleteMissionTemplateAndInstances(user, templateToDelete.id);
        toast({ title: "Missão e Agendamentos Removidos!", description: `A missão "${templateToDelete.title}" e suas atribuições foram removidas.` });
      } else {
        await deleteMissionTemplate(user, templateToDelete.id);
        toast({ title: "Missão Removida do Catálogo!", description: `A missão "${templateToDelete.title}" foi removida. As atribuições existentes não foram afetadas.` });
      }
      refetchAllData();
    } catch (error) {
      console.error("Error deleting mission template:", error);
      toast({ title: "Erro ao Excluir Missão", description: "Não foi possível remover a missão.", variant: "destructive" });
    } finally {
      setTemplateToDelete(null);
      setAlsoDeleteInstances(false);
      setIsProcessingAction(false);
    }
  };

  const getStatusBadgeVariant = (status: MissionTemplate['status']): "default" | "secondary" | "outline" => {
    switch (status) {
      case 'active': return 'default';
      case 'archived': return 'secondary'; 
      default: return 'outline';
    }
  };

  const handleOpenAssignDialog = (template: MissionTemplate) => {
    setTemplateToAssign(template);
    setIsAssignDialogOpen(true);
  };

  const assignedChildrenForDeletion = templateToDelete ? assignmentsByTemplate.get(templateToDelete.id) || [] : [];

  if (isLoading || isFamilyLoading) {
      return <Loading />;
  }

  return (
    <div className="space-y-6">
        <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                    <Target className="h-8 w-8 text-primary" />
                    <h2 className="text-3xl font-headline font-bold whitespace-nowrap">Quadro de Missões</h2>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                                <HelpCircle className="h-5 w-5" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80">
                            <div className="space-y-3">
                                <h4 className="font-medium leading-none">O Motor da Aventura: Missões</h4>
                                <p className="text-sm text-muted-foreground">
                                    Se as recompensas são o "tesouro", as missões são o mapa e os desafios que levam até ele. Esta tela é o seu <strong>catálogo central</strong>, onde você cria os "modelos" de todas as missões possíveis para seus heróis.
                                </p>
                                <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-4">
                                    <li><strong>Crie Primeiro Aqui:</strong> Antes de poder agendar uma missão, você precisa criá-la neste quadro.</li>
                                    <li><strong>Gerencie os Detalhes:</strong> Edite o título, a descrição e as recompensas de cada modelo de missão.</li>
                                    <li><strong>Atribua aos Herois:</strong> Use o botão "Atribuir" em um card para agendar a missão na rotina de um ou mais heróis.</li>
                                </ul>
                                 <p className="text-sm text-muted-foreground">
                                    Em resumo, aqui você constrói o seu arsenal de missões. Na <strong>"Rotina de Missões"</strong>, você as coloca em ação!
                                 </p>
                                <PopoverClose asChild>
                                    <Button className="w-full">Entendi 👍</Button>
                                </PopoverClose>
                            </div>
                        </PopoverContent>
                    </Popover>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    {children.length > 1 && (
                      <HeroSelector
                          heroes={children}
                          selectedHeroId={selectedChildId}
                          onSelectHero={setSelectedChildId}
                          showAllOption={true}
                      />
                    )}
                    <Link href="/dashboard/missions/new">
                        <Button className="w-full sm:w-auto bg-accent text-accent-foreground hover:bg-accent/90" disabled={!canEdit}>
                            <PlusCircle className="mr-2 h-5 w-5" /> Criar Nova Missão
                        </Button>
                    </Link>
                </div>
            </div>
            <div className="flex flex-wrap gap-4">
                <Link href="/dashboard/agenda">
                  <Button variant="outline" className="w-full sm:w-auto">
                    <CalendarDays className="mr-2 h-5 w-5" /> Agenda de Missões
                  </Button>
                </Link>
                <Link href="/dashboard/missions/ideas">
                  <Button variant="secondary" className="w-full sm:w-auto">
                    <Lightbulb className="mr-2 h-5 w-5" /> Ideias de Missões
                  </Button>
                </Link>
            </div>
        </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Missões do Catálogo</CardTitle>
          <CardDescription>Abaixo estão as missões que você já criou para {currentContextText}.</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredTemplates.length === 0 ? (
            <div className="text-center py-10 border-2 border-dashed border-muted-foreground/30 rounded-lg">
              <Target className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-lg text-muted-foreground">Nenhuma missão encontrada com os filtros atuais.</p>
              <p className="text-sm text-muted-foreground mt-1">
                Tente outro filtro ou <Link href="/dashboard/missions/new" className="text-primary hover:underline font-semibold">crie uma nova missão</Link>.
              </p>
            </div>
          ) : (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTemplates.map((template) => {
                const categoryDetails = getCategoryDetails(template.category);
                const CategoryIconComponent = categoryDetails?.icon;
                const assignedChildren = assignmentsByTemplate.get(template.id) || [];
                
                return (
                  <Card key={template.id} className="shadow-md hover:shadow-lg transition-shadow flex flex-col bg-card">
                    <CardHeader>
                      <div className="flex items-start gap-3 pr-2 min-h-14">
                        {template.emoji && <span className="text-2xl mt-1">{template.emoji}</span>}
                        <CardTitle className="text-xl line-clamp-2">
                          {template.title}
                        </CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="flex flex-col flex-grow p-6 pt-0">
                      <div className="space-y-2">
                        {categoryDetails && (
                          <div className="flex items-center gap-2">
                            {CategoryIconComponent && <CategoryIconComponent className="h-4 w-4 text-muted-foreground" />}
                            <Badge variant="outline" className={categoryDetails.colorClasses}>
                              {categoryDetails.label}
                            </Badge>
                          </div>
                        )}
                        <div className="flex items-center text-sm text-muted-foreground">
                          <StarIcon className="h-5 w-5 mr-1.5 text-yellow-400 fill-yellow-400" />
                          Recompensa: {template.starsReward} estrelas
                        </div>
                        <div className="flex items-center text-sm text-muted-foreground">
                          <BadgeCheck className="h-5 w-5 mr-1.5 text-blue-500" />
                          Experiência (XP): {template.xpReward}
                        </div>
                      </div>

                      <div className="flex-grow" />

                      <div className="pt-4">
                        <Separator className="mb-3" />
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                              <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5">
                                <Users className="h-4 w-4" />
                                Atribuído a:
                              </h4>
                              <Badge variant={getStatusBadgeVariant(template.status)} className="capitalize flex-shrink-0">
                                {template.status === 'active' ? 'Ativa' : 'Arquivada'}
                              </Badge>
                          </div>
                          {assignedChildren.length > 0 ? (
                              <div className="flex items-center space-x-2">
                                  <div className="flex -space-x-2">
                                      {assignedChildren.slice(0, 5).map(child => (
                                          <TooltipProvider key={child.id} delayDuration={100}>
                                              <Tooltip>
                                                  <TooltipTrigger asChild>
                                                      <Avatar
                                                        className="h-8 w-8 border-2 border-background ring-1 ring-offset-background ring-[var(--ring-color)]"
                                                        style={child.color ? { '--ring-color': child.color } as React.CSSProperties : {}}
                                                      >
                                                          <AvatarImage src={child.avatar} alt={child.name} />
                                                          <AvatarFallback
                                                            className="text-xs"
                                                            style={{ backgroundColor: child.color }}
                                                          >
                                                              {getInitials(child.name)}
                                                          </AvatarFallback>
                                                      </Avatar>
                                                  </TooltipTrigger>
                                                  <TooltipContent>
                                                      <p>{child.name}</p>
                                                  </TooltipContent>
                                              </Tooltip>
                                          </TooltipProvider>
                                      ))}
                                  </div>
                                  {assignedChildren.length > 5 && (
                                      <span className="text-xs font-medium text-muted-foreground">
                                          + {assignedChildren.length - 5}
                                      </span>
                                  )}
                              </div>
                          ) : (
                              <p className="text-xs text-muted-foreground italic">Nenhum heroi com esta missão ativa.</p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="flex items-center gap-2 pt-4">
                      <Button
                        variant="default"
                        className="w-full"
                        disabled={isProcessingAction || template.status === 'archived' || !canEdit}
                        onClick={() => handleOpenAssignDialog(template)}
                      >
                        <Users className="mr-2 h-4 w-4" /> Atribuir
                      </Button>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => router.push(`/dashboard/missions/edit/${template.id}`)}
                              disabled={isProcessingAction || !canEdit}
                              className="flex-shrink-0"
                            >
                              <Edit3 className="h-4 w-4" />
                              <span className="sr-only">Editar Missão</span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Editar Missão</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => setTemplateToDelete(template)}
                              disabled={isProcessingAction || !canEdit}
                              className="flex-shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                              <span className="sr-only">Excluir Missão</span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Excluir Missão</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {templateToDelete && (
        <AlertDialog open={!!templateToDelete} onOpenChange={() => setTemplateToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir Missão do Catálogo</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja remover a missão "{templateToDelete.title}"?
              </AlertDialogDescription>
            </AlertDialogHeader>

            {assignedChildrenForDeletion.length > 0 && (
                <div className="my-4 space-y-3">
                    <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/20">
                        <AlertTriangle className="h-5 w-5 text-destructive mt-1 flex-shrink-0" />
                        <div>
                            <h4 className="font-semibold text-destructive">Atenção: Missão em uso!</h4>
                            <p className="text-xs text-destructive/90">Esta missão está atualmente atribuída aos seguintes heróis:</p>
                        </div>
                    </div>
                    <ScrollArea className="h-32 rounded-md border p-2">
                        <div className="space-y-2">
                        {assignedChildrenForDeletion.map(child => {
                            const instance = missionInstances.find(inst => inst.templateId === templateToDelete.id && inst.childId === child.id);
                            return (
                                <div key={child.id} className="flex items-center gap-2">
                                     <Avatar className="h-8 w-8">
                                        <AvatarImage src={child.avatar} alt={child.name} />
                                        <AvatarFallback className="text-xs" style={{ backgroundColor: child.color }}>{getInitials(child.name)}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="font-medium text-sm">{child.name}</p>
                                    </div>
                                </div>
                            );
                        })}
                        </div>
                    </ScrollArea>
                    <div className="flex items-center space-x-2 mt-2 p-2 rounded-md bg-muted/50">
                        <Checkbox id="delete-instances-checkbox" checked={alsoDeleteInstances} onCheckedChange={(checked) => setAlsoDeleteInstances(!!checked)} />
                        <Label htmlFor="delete-instances-checkbox" className="text-xs font-normal text-foreground cursor-pointer">
                            Sim, também remover esta missão da agenda de todos os heróis listados.
                        </Label>
                    </div>
                </div>
            )}
            
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => { setTemplateToDelete(null); setAlsoDeleteInstances(false); }} disabled={isProcessingAction}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteConfirm}
                className="bg-destructive hover:bg-destructive/90"
                disabled={isProcessingAction}
              >
                {isProcessingAction ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {alsoDeleteInstances ? "Excluir Tudo" : "Excluir do Catálogo"}
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
          onAssigned={refetchAllData}
        />
      )}
    </div>
  );
}

export default function MissionsHubPage() {
    return (
        <Suspense fallback={<Loading />}>
            <MissionsHubContent />
        </Suspense>
    );
}

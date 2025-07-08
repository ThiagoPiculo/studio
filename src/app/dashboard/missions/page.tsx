
"use client";

import React, { useEffect, useState, useMemo } from 'react';
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
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Target, PlusCircle, Star as StarIcon, PackageSearch, Loader2, Edit3, Trash2, Lightbulb, BadgeCheck, Repeat, Users, Info, Sun, CloudSun, Moon, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useFamily } from '@/contexts/FamilyContext';
import { 
  getMissionTemplatesByOwnerOrFamily, 
  deleteMissionTemplate,
  getChildProfilesForAttribution,
  getMissionInstancesForContext,
  deleteMissionTemplateAndInstances,
} from '@/lib/firebase/firestore';
import type { MissionTemplate, MissionCategoryDetails, ChildProfile, MissionInstance } from '@/lib/types';
import { missionCategories } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { AssignMissionDialog } from '@/components/dashboard/missions/AssignMissionDialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

export default function MissionsHubPage() {
  const { user } = useAuth();
  const { currentContext, availableContexts } = useFamily();
  const { toast } = useToast();
  const router = useRouter();

  const [missionTemplates, setMissionTemplates] = useState<MissionTemplate[]>([]);
  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [missionInstances, setMissionInstances] = useState<MissionInstance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<MissionTemplate | null>(null);
  const [alsoDeleteInstances, setAlsoDeleteInstances] = useState(false);
  
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [templateToAssign, setTemplateToAssign] = useState<MissionTemplate | null>(null);
  const [isAboutDialogOpen, setIsAboutDialogOpen] = useState(false);
  
  const [recurrenceFilter, setRecurrenceFilter] = useState<'all' | 'unique' | 'recurring'>('all');

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    const familyIdToQuery = currentContext === 'my-space' ? null : currentContext;

    Promise.all([
      getMissionTemplatesByOwnerOrFamily(user.uid, familyIdToQuery),
      getChildProfilesForAttribution(user.uid, currentContext),
      getMissionInstancesForContext(user.uid, familyIdToQuery)
    ]).then(([templates, children, instances]) => {
      setMissionTemplates(templates);
      setChildren(children);
      setMissionInstances(instances.filter(i => i.status === 'pending')); // Only care about active assignments
    }).catch((err) => {
      console.error("Error fetching missions data:", err);
      setError("Não foi possível carregar as missões. Tente atualizar a página.");
    }).finally(() => setIsLoading(false));
  }, [user, currentContext]);

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

  const templatesDescription = `Catálogo de missões em ${currentContextText}. Crie e gerencie missões para atribuir aos seus Mini Herois.`;
  
  const filteredTemplates = useMemo(() => {
    return missionTemplates
      .filter(template => {
        if (recurrenceFilter === 'unique') return !template.isRecurring;
        if (recurrenceFilter === 'recurring') return template.isRecurring;
        return true;
      })
      .sort((a, b) => (a.isRecurring ? 1 : 0) - (b.isRecurring ? 1 : 0));
  }, [missionTemplates, recurrenceFilter]);

  const handleDeleteConfirm = async () => {
    if (!templateToDelete) return;
    setIsProcessingAction(true);
    try {
      if (alsoDeleteInstances) {
        await deleteMissionTemplateAndInstances(templateToDelete.id);
        toast({ title: "Missão e Agendamentos Removidos!", description: `A missão "${templateToDelete.title}" e suas atribuições foram removidas.` });
      } else {
        await deleteMissionTemplate(templateToDelete.id);
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

  const refetchAllData = () => {
    if (user) {
      setIsLoading(true);
      const familyIdToQuery = currentContext === 'my-space' ? null : currentContext;
      Promise.all([
        getMissionTemplatesByOwnerOrFamily(user.uid, familyIdToQuery),
        getChildProfilesForAttribution(user.uid, currentContext),
        getMissionInstancesForContext(user.uid, familyIdToQuery)
      ]).then(([templates, children, instances]) => {
        setMissionTemplates(templates);
        setChildren(children);
        setMissionInstances(instances.filter(i => i.status === 'pending'));
      }).catch(err => console.error("Error refetching instances:", err))
      .finally(() => setIsLoading(false));
    }
  };

  const assignedChildrenForDeletion = templateToDelete ? assignmentsByTemplate.get(templateToDelete.id) || [] : [];

  return (
    <div className="space-y-8">
      <Dialog open={isAboutDialogOpen} onOpenChange={setIsAboutDialogOpen}>
        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
              <div>
                <CardTitle className="text-3xl font-headline flex items-center">
                  <Target className="mr-3 h-8 w-8 text-primary" />
                  Central de Missões
                </CardTitle>
                <CardDescription>
                  {templatesDescription}
                </CardDescription>
              </div>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full sm:w-auto flex-shrink-0">
                    <Info className="mr-2 h-4 w-4" /> Sobre Missões
                </Button>
              </DialogTrigger>
            </div>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-4">
            <Link href="/dashboard/missions/new">
              <Button className="w-full sm:w-auto bg-accent text-accent-foreground hover:bg-accent/90">
                <PlusCircle className="mr-2 h-5 w-5" /> Criar Nova Missão
              </Button>
            </Link>
            <Link href="/dashboard/missions/ideas">
              <Button variant="secondary" className="w-full sm:w-auto">
                <Lightbulb className="mr-2 h-5 w-5" /> Ver Ideias de Missões
              </Button>
            </Link>
          </CardContent>
        </Card>

        <DialogContent className="sm:max-w-xl">
            <DialogHeader>
                <DialogTitle className="text-2xl font-headline flex items-center gap-2">
                    <Target className="h-6 w-6 text-primary" />
                    O Motor da Aventura: Missões
                </DialogTitle>
                <DialogDescription className="pt-2">
                  Se as recompensas são o "tesouro", as missões são o mapa e os desafios que levam até ele.
                </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh] pr-4">
              <div className="space-y-4 text-sm text-muted-foreground pb-4">
                <p>Em termos simples, as missões são as tarefas, os hábitos e as responsabilidades que você quer incentivar no dia a dia da criança.</p>
                <p>Elas transformam deveres em uma jornada heroica, e seu propósito é multifacetado:</p>
                <ul className="list-disc pl-5 space-y-3">
                    <li><strong className="text-foreground">Criar Estrutura e Rotina:</strong> Missões como "Arrumar a cama" dão previsibilidade e uma estrutura clara para o dia da criança, o que é fundamental para o desenvolvimento.</li>
                    <li><strong className="text-foreground">Ensinar Responsabilidade:</strong> É a forma prática de ensinar sobre autocuidado (escovar os dentes), colaboração familiar (pôr a mesa) ou compromissos (estudar).</li>
                    <li><strong className="text-foreground">Gerar Valor e Esforço (O "Trabalho"):</strong> Para conquistar recompensas, o heroi ganha Estrelas (⭐) e XP ao completar missões. As missões são o "trabalho" que gera o "salário" para alcançar seus objetivos.</li>
                    <li><strong className="text-foreground">Tornar Grandes Hábitos Gerenciáveis:</strong> Um objetivo como "ser mais organizado" é quebrado em passos pequenos: "Guardar os sapatos", "Organizar a mochila". Cada missão concluída é uma pequena vitória.</li>
                    <li><strong className="text-foreground">Dar um Propósito Claro:</strong> Em vez de uma ordem genérica, a criança tem um objetivo: "Preciso completar a 'Missão X' para ganhar 5 estrelas e ficar mais perto do meu prêmio".</li>
                </ul>
                <p className="pt-2">Em resumo, as missões são a base da gamificação. Elas são as ações que impulsionam o progresso, geram as recompensas e transformam a rotina de obrigações em uma jornada de conquistas e crescimento.</p>
              </div>
            </ScrollArea>
            <DialogFooter className="mt-4">
              <DialogClose asChild>
                <Button variant="outline" className="w-full">Entendido!</Button>
              </DialogClose>
            </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Card>
        <CardHeader>
          <CardTitle>Missões do Catálogo</CardTitle>
          <CardDescription>Abaixo estão as missões que você já criou para {currentContextText}.</CardDescription>
           <div className="pt-4">
            <Label className="text-sm font-medium text-muted-foreground">Filtrar por tipo de recorrência:</Label>
            <RadioGroup
                value={recurrenceFilter}
                onValueChange={(v) => setRecurrenceFilter(v as 'all' | 'unique' | 'recurring')}
                className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-2"
            >
                <div className="flex items-center space-x-2">
                    <RadioGroupItem value="all" id="filter-all" />
                    <Label htmlFor="filter-all" className="cursor-pointer font-normal">Todas</Label>
                </div>
                <div className="flex items-center space-x-2">
                    <RadioGroupItem value="unique" id="filter-unique" />
                    <Label htmlFor="filter-unique" className="cursor-pointer font-normal">Únicas</Label>
                </div>
                <div className="flex items-center space-x-2">
                    <RadioGroupItem value="recurring" id="filter-recurring" />
                    <Label htmlFor="filter-recurring" className="cursor-pointer font-normal">Recorrentes</Label>
                </div>
            </RadioGroup>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="ml-3 text-muted-foreground">Carregando missões...</p>
            </div>
          ) : error ? (
            <p className="text-destructive text-center py-10">{error}</p>
          ) : filteredTemplates.length === 0 ? (
            <div className="text-center py-10 border-2 border-dashed border-muted-foreground/30 rounded-lg">
              <PackageSearch className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-lg text-muted-foreground">Nenhuma missão encontrada com os filtros atuais.</p>
              <p className="text-sm text-muted-foreground mt-1">
                Tente limpar os filtros ou <Link href="/dashboard/missions/new" className="text-primary hover:underline">crie uma nova missão</Link>.
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
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3 pr-2">
                           {template.emoji && <span className="text-2xl">{template.emoji}</span>}
                          <CardTitle className="text-xl">
                            {template.title}
                          </CardTitle>
                        </div>
                        <Badge variant={getStatusBadgeVariant(template.status)} className="capitalize flex-shrink-0">
                            {template.status === 'active' ? 'Ativa' : 'Arquivada'}
                        </Badge>
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
                           <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5">
                              <Users className="h-4 w-4" />
                              Atribuído a:
                          </h4>
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
                        disabled={isProcessingAction || template.status === 'archived'}
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
                              disabled={isProcessingAction}
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
                              disabled={isProcessingAction}
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
                disabled={isProcessingAction || (assignedChildrenForDeletion.length > 0 && !alsoDeleteInstances)}
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


"use client";

import { useEffect, useState, useMemo, useCallback, Fragment, Suspense } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { regenerateChildAccessCode, deleteChildProfile, updateChildRewardInstance, deleteChildRewardInstance, updateChildProfile, getMissionInstancesByChild, deleteMissionInstance, reactivateMissionInstance, getChildRewardInstancesByChild, resetChildProgress, redeemChildRewardInstance, getChildProfileById, checkAndAwardBadges, recalculateAndSyncBadges, getSchoolScheduleForChild, moveChildToNewContext, deleteSchoolScheduleEntry, getChildProfilesForAttribution, getFamilyMembers, getFamilyMemberships, getRewardTemplatesByOwnerOrFamily, undoRewardRedemption, addChildRewardInstance } from '@/lib/supabase/db';
import type { ChildProfile, ChildRewardInstance, RewardCategoryDetails, MissionInstance, MissionCategoryDetails, SchoolScheduleEntry, UserProfile, FamilyMembership, FamilyRole, RewardTemplate } from '@/lib/types';
import { rewardCategories, missionCategories, weekdays, weekdayLabels, familyRoles } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, User, Star as StarIcon, Edit3, Loader2, Trash2, RefreshCw, Gift, EllipsisVertical, CheckCircle, XCircle, ExternalLink, MoreHorizontal, Info, CheckSquare, Trophy, Clock, BadgeCheck, PlusCircle, CalendarDays, CheckCircle2, Repeat, Undo2, Medal, RotateCcw, Target, Lock, Sun, CloudSun, Moon, NotebookPen, Move, Edit, Smile, HelpCircle, Contact, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { EditChildProfileForm } from '@/components/dashboard/EditChildProfileForm';
import { Badge } from '@/components/ui/badge';
import { AddMissionDialog } from '@/components/dashboard/missions/AddMissionDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { PopoverClose } from '@radix-ui/react-popover';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { format, differenceInYears, isSameDay, parse, formatDistanceToNowStrict, startOfDay, differenceInDays, eachDayOfInterval, subDays, isValid, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatRecurrenceSummary, isMissionScheduledForDate, getDateObject, getPeriodOfDay, isMissionCompletedForDate } from '@/lib/calendar-utils';
import { cn } from '@/lib/utils';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useFamily } from '@/contexts/FamilyContext';
import { Select, SelectItem, SelectTrigger, SelectContent, SelectValue } from '@/components/ui/select';
import { AssignMissionDialog } from '@/components/dashboard/missions/AssignMissionDialog';
import { EditScheduleEntryDialog } from '@/components/dashboard/school-schedule/EditScheduleEntryDialog';
import { LevelUpPath } from '@/components/dashboard/LevelUpPath';
import { HeroSelector } from '@/components/dashboard/dashboard/HeroSelector';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { UnlockedRewards } from '@/components/dashboard/dashboard/UnlockedRewards';
import { RecentMedals } from '@/components/dashboard/dashboard/RecentMedals';
import Loading from '@/app/dashboard/(parent)/mural/loading';
import { predefinedRewardGroups } from '@/lib/predefined-reward-ideas';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

type Activity =
    | (MissionInstance & { type: 'mission', scheduledFor: Date, missionTypeLabel: string, completionLogEntry: { completedAt: string, stars: number, actorId?: string, actorName?: string } })
    | (ChildRewardInstance & { type: 'reward', completedAt: string, actorId?: string, actorName?: string, childId: string });

function MissionCard({ instance, onManage, onDelete }: { instance: MissionInstance, onManage: (instance: MissionInstance) => void, onDelete: (instance: MissionInstance) => void }) {
    const categoryDetails = missionCategories.find(cat => cat.id === instance.category);
    const scheduleDate = getDateObject(instance.isRecurring ? instance.startDate : instance.dueDate);
    const time = scheduleDate ? format(scheduleDate, 'HH:mm') : null;
    const period = scheduleDate ? getPeriodOfDay(scheduleDate) : null;
    const periodIcons = { Manhã: Sun, Tarde: CloudSun, Noite: Moon };
    const PeriodIcon = period ? periodIcons[period] : null;

    return (
        <Card key={instance.id} className="shadow-sm flex flex-col transition-all h-full">
            <CardHeader className="p-4">
                <div className="flex justify-between items-start">
                    <CardTitle className="text-base font-semibold leading-tight pr-2 flex items-center gap-2">
                      {instance.emoji && <span className="text-xl">{instance.emoji}</span>}
                      <span>{instance.title}</span>
                    </CardTitle>
                </div>
            </CardHeader>
            <CardContent className="space-y-2 flex-grow text-xs p-4 pt-0">
                {categoryDetails && (
                    <div className="flex items-center">
                        <Badge variant="outline" className={cn("text-xs", categoryDetails.colorClasses)}>
                            {categoryDetails.label}
                        </Badge>
                    </div>
                )}
                 <div className="space-y-1">
                    <div className="flex items-center text-muted-foreground font-medium">
                        {instance.isRecurring ? (
                          <Repeat className="h-4 w-4 mr-1.5 text-purple-500 shrink-0" />
                        ) : (
                          <Target className="h-4 w-4 mr-1.5 text-chart-2 shrink-0" />
                        )}
                        <span className="truncate">{formatRecurrenceSummary(instance)}{time ? `, às ${time}` : ''}</span>
                    </div>
                    {period && PeriodIcon && (
                        <div className={cn("flex items-center font-medium",
                            period === 'Manhã' && "text-yellow-700 dark:text-yellow-400",
                            period === 'Tarde' && "text-orange-700 dark:text-orange-400",
                            period === 'Noite' && "text-indigo-700 dark:text-indigo-400"
                        )}>
                            <PeriodIcon className={cn("h-4 w-4 mr-1.5 shrink-0",
                                period === 'Manhã' && "text-yellow-500",
                                period === 'Tarde' && "text-orange-500",
                                period === 'Noite' && "text-indigo-500"
                            )} />
                            <span>{period}</span>
                        </div>
                    )}
                </div>
                <div className="border-t pt-2 mt-2">
                    <div className="space-y-1 text-xs text-muted-foreground">
                       {instance.status === 'completed' && instance.updatedAt && (
                            <div className="flex items-center font-medium text-green-600">
                                <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                                <span>Concluída</span>
                            </div>
                        )}
                        {instance.isRecurring && instance.recurrenceRule?.count ? (
                            <div className="flex items-center font-medium text-muted-foreground">
                                <CheckSquare className="h-3.5 w-3.5 mr-1.5" />
                                <span>Progresso: {Object.keys(instance.completionLog || {}).length}/{instance.recurrenceRule.count}</span>
                            </div>
                        ) : instance.dueDate && (
                             <div className="flex items-center font-medium text-destructive/80">
                                <Clock className="h-3.5 w-3.5 mr-1.5" />
                                <span>Vence em: {getDateObject(instance.dueDate)?.toLocaleDateString('pt-BR')}</span>
                            </div>
                        )}
                    </div>
                </div>
            </CardContent>
            <CardFooter className="p-3">
                 <div className="flex w-full items-center gap-2">
                    <Button
                        size="sm"
                        className="flex-grow"
                        onClick={() => onManage(instance)}
                    >
                        <CalendarDays className="mr-2 h-4 w-4" />
                        Ver na Rotina
                    </Button>
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    size="icon"
                                    variant="destructive"
                                    className="h-9 w-9"
                                    onClick={() => onDelete(instance)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Remover Atribuição</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
            </CardFooter>
        </Card>
    );
}

export function MuralCompletoPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const { currentContext, availableContexts, setCurrentContext, currentRole, isLoading: isFamilyLoading, selectedChildId, setSelectedChildId } = useFamily();

  // Primary data states
  const [child, setChild] = useState<ChildProfile | null>(null);
  const [allChildrenInContext, setAllChildrenInContext] = useState<ChildProfile[]>([]);
  const [missionInstances, setMissionInstances] = useState<MissionInstance[]>([]);
  const [childRewards, setChildRewards] = useState<ChildRewardInstance[]>([]);
  const [schoolSchedule, setSchoolSchedule] = useState<SchoolScheduleEntry[]>([]);
  const [collaborators, setCollaborators] = useState<UserProfile[]>([]);
  const [memberships, setMemberships] = useState<FamilyMembership[]>([]);
  const [rewardTemplates, setRewardTemplates] = useState<RewardTemplate[]>([]);

  // Loading and action states
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRegeneratingCode, setIsRegeneratingCode] = useState(false);
  const [isMoveDialogOpen, setIsMoveDialogOpen] = useState(false);
  const [selectedMoveContext, setSelectedMoveContext] = useState<string>('');
  const [isMoving, setIsMoving] = useState(false);
  const [isLoadingSecondaryData, setIsLoadingSecondaryData] = useState(true);

  const activeTab = searchParams.get('tab') || 'overview';

  const handleTabChange = (newTab: string) => {
    const current = new URLSearchParams(Array.from(searchParams.entries()));
    current.set('tab', newTab);
    router.replace(`${pathname}?${current.toString()}`, { scroll: false });
  };


  // Mission-specific states
  const [recurrenceFilter, setRecurrenceFilter] = useState<'all' | 'unique' | 'recurring'>('all');
  const [isAddMissionDialogOpen, setIsAddMissionDialogOpen] = useState(false);
  const [instanceToEdit, setInstanceToEdit] = useState<MissionInstance | null>(null);
  const [isAssignMissionDialogOpen, setIsAssignMissionDialogOpen] = useState(false);
  const [missionToDelete, setMissionToDelete] = useState<MissionInstance | null>(null);

  // Reward-specific states
  const [instanceToManage, setInstanceToManage] = useState<ChildRewardInstance | null>(null);
  const [isRedeemConfirmOpen, setIsRedeemConfirmOpen] = useState(false);
  const [isUndoConfirmOpen, setIsUndoConfirmOpen] = useState(false);
  const [isDeleteInstanceConfirmOpen, setIsDeleteInstanceConfirmOpen] = useState(false);
  const [rewardSubTab, setRewardSubTab] = useState('available');

  // School Schedule States
  const [isEntryDialogOpen, setIsEntryDialogOpen] = useState(false);
  const [entryToEdit, setEntryToEdit] = useState<SchoolScheduleEntry | null>(null);
  const [entryToDelete, setEntryToDelete] = useState<SchoolScheduleEntry | null>(null);

  // Badge states
  const [isResettingProgress, setIsResettingProgress] = useState(false);

  const canEdit = useMemo(() => {
    if (!currentRole) return false;
    if (currentContext === 'my-space') return true;
    const editableRoles: FamilyRole[] = ['Owner', 'Co-Owner', 'Guardian'];
    return editableRoles.includes(currentRole as FamilyRole);
  }, [currentContext, currentRole]);


  const periodIcons = {
    Manhã: Sun,
    Tarde: CloudSun,
    Noite: Moon,
  };

  const fetchDataForChild = useCallback(async (childIdToFetch: string) => {
    if (!user) return;
    
    setIsLoadingSecondaryData(true);
    try {
        const familyIdToQuery = currentContext !== 'my-space' ? currentContext : null;
        
        const [childData, missions, rewards, schedule, collaborators, memberships, templates] = await Promise.all([
            getChildProfileById(childIdToFetch),
            getMissionInstancesByChild(childIdToFetch),
            getChildRewardInstancesByChild(childIdToFetch),
            getSchoolScheduleForChild(childIdToFetch),
            familyIdToQuery ? getFamilyMembers(familyIdToQuery) : Promise.resolve([user as UserProfile]),
            familyIdToQuery ? getFamilyMemberships(familyIdToQuery) : Promise.resolve([] as FamilyMembership[]),
            getRewardTemplatesByOwnerOrFamily(user.uid, familyIdToQuery),
        ]);
        
        setChild(childData);
        setMissionInstances(missions);
        setChildRewards(rewards.sort((a, b) => {
            if (a.status === 'active' && b.status !== 'active') return -1;
            if (a.status !== 'active' && b.status === 'active') return 1;
            if (a.status === 'disabled' && b.status === 'redeemed') return -1;
            if (a.status === 'redeemed' && b.status === 'disabled') return 1;
            const timeA = a.assignedAt ? new Date(a.assignedAt).getTime() : 0;
            const timeB = b.assignedAt ? new Date(b.assignedAt).getTime() : 0;
            return timeB - timeA;
        }));
        setSchoolSchedule(schedule.sort((a,b) => a.startTime.localeCompare(b.startTime)));
        setCollaborators(collaborators);
        setMemberships(memberships);
        setRewardTemplates(templates);

    } catch (error) {
        console.error("Error fetching secondary child data:", error);
        toast({ title: "Erro ao Carregar Detalhes", description: "Não foi possível carregar os dados complementares do herói.", variant: "destructive" });
    } finally {
        setIsLoadingSecondaryData(false);
    }
  }, [user, currentContext, toast]);


  // Effect to decide which child to fetch data for
  useEffect(() => {
    if (authLoading || isFamilyLoading || !user) return;

    setIsLoading(true);

    const initializeContext = async () => {
        try {
            const profilesInContext = await getChildProfilesForAttribution(user.uid, currentContext);
            setAllChildrenInContext(profilesInContext);

            if (profilesInContext.length === 0) {
                setChild(null);
                setIsLoading(false);
                setIsLoadingSecondaryData(false);
                return;
            }
            
            const targetChildId = selectedChildId && profilesInContext.some(c => c.id === selectedChildId)
                ? selectedChildId
                : profilesInContext[0].id;
            
            if (targetChildId !== selectedChildId) {
                setSelectedChildId(targetChildId);
            }

            await fetchDataForChild(targetChildId);
            
        } catch (error) {
            console.error("Error initializing context:", error);
            toast({ title: "Erro ao carregar heróis", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };
    
    initializeContext();
  }, [authLoading, isFamilyLoading, user, currentContext, selectedChildId, fetchDataForChild, toast, setSelectedChildId]);

  const handleHeroSelectionChange = (newChildId: string | null) => {
    if (newChildId) {
        setSelectedChildId(newChildId);
    }
  };

  const calculateAge = (birthDateString?: string): number | null => {
    if (!birthDateString) return null;
    const birthDate = new Date(birthDateString);
    if (!isValid(birthDate)) return null;
    return differenceInYears(new Date(), birthDate);
  };

  const handleProfileUpdate = useCallback(async (updatedChild: ChildProfile) => {
    toast({ title: "Perfil Atualizado!", description: `As informações do(a) Mini Heroi ${updatedChild?.name || ''} foram salvas.` });
    setChild(updatedChild);
  }, [toast]);

  const handleRegenerateAccessCode = async () => {
    if (!child || !user) return;
    setIsRegeneratingCode(true);
    try {
      const newAccessCode = await regenerateChildAccessCode(child.id, user);
      setChild(prev => prev ? { ...prev, accessCode: newAccessCode } : null);
      toast({
        title: "Novo Código de Acesso Gerado!",
        description: `O novo código para ${child.name} é ${newAccessCode}. Guarde em um local seguro!`,
        duration: 10000,
      });
    } catch (error) {
      console.error("Error regenerating access code:", error);
      toast({ title: "Erro ao Regenerar Código", description: "Não foi possível regenerar o código de acesso. Por favor, tente novamente mais tarde.", variant: "destructive" });
    } finally {
      setIsRegeneratingCode(false);
    }
  };

  const handleDeleteProfile = async () => {
    if (!child || !user) return;
    setIsDeleting(true);
    try {
      await deleteChildProfile(child.id, user);
      toast({ title: "Perfil de Herói Removido", description: `O perfil de ${child.name} e todos os seus dados foram excluídos com sucesso.` });
      router.push('/dashboard/heroes');
    } catch (error) {
      console.error("Error deleting child profile:", error);
      toast({ title: "Erro ao Excluir", description: "Não foi possível excluir o perfil da criança. Por favor, tente novamente mais tarde.", variant: "destructive" });
      setIsDeleting(false);
    }
  };

  const handleManageInAgenda = (instance: MissionInstance) => {
    const redirectUrl = `${pathname}?${searchParams.toString()}`;
    router.push(`/dashboard/missions/edit/${instance.templateId}?redirect=${encodeURIComponent(redirectUrl)}`);
  };


  const handleResetProgress = async () => {
    if (!child || !user) return;
    setIsResettingProgress(true);
    try {
      await resetChildProgress(user, child.id);
      if(child) await fetchDataForChild(child.id); // Re-fetch all data to update the UI
      toast({ title: "Progresso Redefinido!", description: `Os dados de ${child.name} foram zerados com sucesso.` });
    } catch (error: any) {
      console.error("Error resetting child progress:", error);
      toast({ title: "Erro ao Redefinir", description: "Não foi possível redefinir o progresso.", variant: "destructive" });
    } finally {
      setIsResettingProgress(false);
    }
  };

  const handleMoveHeroi = async () => {
    if (!user || !child || !selectedMoveContext) {
      toast({ title: 'Erro', description: 'Dados insuficientes para mover o heroi.', variant: 'destructive' });
      return;
    }
    setIsMoving(true);
    try {
      await moveChildToNewContext(child.id, selectedMoveContext === 'my-space' ? null : selectedMoveContext, user);

      toast({
        title: 'Herói Movido com Sucesso!',
        description: `${child.name} agora pertence a um novo espaço.`,
      });
      // Update global context to reflect the change
      setCurrentContext(selectedMoveContext);
      // Let the natural useEffect of the page handle the refetch
    } catch (error: any) {
      console.error("Error moving child profile:", error);
      toast({ title: 'Erro ao Mover', description: error.message, variant: 'destructive' });
    } finally {
      setIsMoving(false);
      setIsMoveDialogOpen(false);
    }
  };


  const handleDeleteMissionInstance = async () => {
    if (!missionToDelete || !user) return;
    setIsDeleting(true);
    try {
      await deleteMissionInstance(user, missionToDelete.id);
      setMissionInstances(prev => prev.filter(m => m.id !== missionToDelete.id)); // Optimistic update
      toast({
        title: "Missão Removida",
        description: `A missão "${missionToDelete.title}" foi removida da lista de ${child?.name}.`
      });
    } catch (error) {
      console.error("Error deleting mission instance:", error);
      toast({ title: "Erro ao Remover Missão", description: "Não foi possível remover a missão.", variant: "destructive" });
      if (child) await fetchDataForChild(child.id); // Revert on error
    } finally {
      setIsDeleting(false);
      setMissionToDelete(null);
    }
  };

  const getInitials = (name?: string | null) => {
    if (!name) return "MH";
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };
  
  const getRewardStatusBadgeVariant = (status: ChildRewardInstance['status']): "default" | "secondary" | "outline" | "destructive" => {
    switch (status) {
      case 'active': return 'default';
      case 'pending_approval': return 'outline';
      case 'redeemed': return 'secondary';
      case 'disabled': return 'outline';
      default: return 'outline';
    }
  };

  const getRewardStatusText = (status: ChildRewardInstance['status']): string => {
    switch (status) {
      case 'active': return 'Ativa';
      case 'pending_approval': return 'Aguardando Aprovação';
      case 'redeemed': return 'Resgatada';
      case 'disabled': return `Inativa para ${child?.name || 'esta criança'}`;
      default: return 'Desconhecido';
    }
  };

  const getMissionStatusBadgeVariant = (status: MissionInstance['status']): "default" | "secondary" | "destructive" => {
    switch (status) {
        case 'pending': return 'default';
        case 'completed': return 'secondary';
        case 'expired': return 'destructive';
        default: return 'secondary';
    }
  };

  const getMissionStatusText = (status: MissionInstance['status']): string => {
      switch (status) {
          case 'pending': return 'Pendente';
          case 'completed': return 'Concluída';
          case 'expired': return 'Expirada';
          default: return 'Desconhecido';
      }
  };


  const handleMarkAsRedeemed = async () => {
    if (!instanceToManage || !child || !user) return;
    setIsDeleting(true);
    try {
      const actor = { id: user.uid, name: user.name };
      await redeemChildRewardInstance(instanceToManage, child.id, actor);
      
      setChild(prev => prev ? { ...prev, stars: prev.stars - instanceToManage.starsCost } : null);
      setChildRewards(prev => prev.map(r => r.id === instanceToManage.id ? { ...r, status: 'redeemed', redeemedAt: new Date().toISOString() as any } : r));

      toast({ title: "Recompensa Resgatada!", description: `"${instanceToManage.title}" foi resgatada por ${child.name}. Que incrível!` });
    } catch (error: any) {
      console.error("Error marking reward as redeemed:", error);
      toast({ title: "Erro ao Resgatar", description: error.message || "Não foi possível marcar a recompensa como resgatada.", variant: "destructive" });
      if (child) await fetchDataForChild(child.id);
    } finally {
      setIsDeleting(false);
      setIsRedeemConfirmOpen(false);
      setInstanceToManage(null);
    }
  };
  
  const handleUndoRedemption = async () => {
    if (!instanceToManage || !user) return;
    setIsDeleting(true);
    try {
        const updatedChild = await undoRewardRedemption(instanceToManage.id, user);
        if (updatedChild) {
            setChild(updatedChild);
            setChildRewards(prev => prev.map(r => r.id === instanceToManage.id ? { ...r, status: 'active', redeemedAt: undefined } : r));
            toast({ title: "Resgate Desfeito!", description: `As estrelas de "${instanceToManage.title}" foram devolvidas.` });
        }
    } catch (error: any) {
        console.error("Error undoing redemption:", error);
        toast({ title: "Erro ao Desfazer", description: error.message, variant: "destructive" });
    } finally {
        setIsDeleting(false);
        setIsUndoConfirmOpen(false);
        setInstanceToManage(null);
    }
  };

  const handleToggleInstanceStatus = async (instance: ChildRewardInstance, newStatus: 'active' | 'disabled') => {
    setIsDeleting(true);
    try {
      await updateChildRewardInstance(instance.id, { status: newStatus });
      setChildRewards(prev => prev.map(r => r.id === instance.id ? { ...r, status: newStatus } : r));
      toast({
        title: "Status da Recompensa Atualizado",
        description: `A recompensa "${instance.title}" agora está ${newStatus === 'active' ? 'disponível' : 'indisponível'} para ${child?.name}.`
      });
    } catch (error: any) {
      console.error(`Error toggling reward instance status:`, error);
      toast({ title: "Erro ao Atualizar Status", description: "Não foi possível alterar o status da recompensa.", variant: "destructive" });
      if (child) await fetchDataForChild(child.id);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteInstance = async () => {
    if (!instanceToManage || !user) return;
    setIsDeleting(true);
    try {
      await deleteChildRewardInstance(user, instanceToManage.id);
      setChildRewards(prev => prev.filter(r => r.id !== instanceToManage.id));
      toast({ title: "Recompensa Removida", description: `A recompensa "${instanceToManage.title}" foi retirada da lista de ${child?.name}.` });
    } catch (error: any) {
      console.error("Error deleting reward instance:", error);
      toast({ title: "Erro ao Remover Atribuição", description: "Não foi possível remover a recompensa.", variant: "destructive" });
      if (child) await fetchDataForChild(child.id);
    } finally {
      setIsDeleting(false);
      setIsDeleteInstanceConfirmOpen(false);
      setInstanceToManage(null);
    }
  };

  const handleEditEntry = (entry: SchoolScheduleEntry) => {
    setEntryToEdit(entry);
    setIsEntryDialogOpen(true);
  };

  const handleDeleteEntry = async () => {
    if (!entryToDelete || !user) return;
    setIsDeleting(true);
    try {
      await deleteSchoolScheduleEntry(entryToDelete.id, user);
      setSchoolSchedule(prev => prev.filter(e => e.id !== entryToDelete.id));
      toast({ title: "Aula removida", description: `A aula de ${entryToDelete.subject} foi removida.` });
    } catch (error) {
      console.error("Error deleting school schedule entry:", error);
      toast({ title: "Erro ao remover aula", variant: 'destructive' });
      if (child) await fetchDataForChild(child.id);
    } finally {
      setIsDeleting(false);
      setEntryToDelete(null);
      setIsEntryDialogOpen(false);
    }
  };

  const filteredMissions = useMemo(() => {
    if (!missionInstances) return [];
    return missionInstances
      .filter(instance => {
        if (recurrenceFilter === 'all') return true;
        if (recurrenceFilter === 'unique') return !instance.isRecurring;
        if (recurrenceFilter === 'recurring') return !!instance.isRecurring;
        return true;
      })
      .sort((a, b) => {
        if (a.status === 'pending' && b.status !== 'pending') return -1;
        if (a.status !== 'pending' && b.status === 'pending') return 1;
        const dateA = getDateObject(a.isRecurring ? a.startDate : a.dueDate) || new Date(0);
        const dateB = getDateObject(b.isRecurring ? b.startDate : b.dueDate) || new Date(0);
        return dateA.getTime() - dateB.getTime();
      });
  }, [missionInstances, recurrenceFilter]);

  const moveTargetContexts = useMemo(() => {
    return availableContexts.filter(c => c.id !== (child?.familyId || 'my-space'));
  }, [availableContexts, child]);

  const hasRecess = useMemo(() => {
    return schoolSchedule.some(entry => entry.subject === 'Recreio/Intervalo');
  }, [schoolSchedule]);
  
  const availableForRedemptionByCategory = useMemo(() => {
    if (!child) return {};
    const assignedOrPendingTemplateIds = new Set(childRewards.map(cr => cr.templateId));
    
    return predefinedRewardGroups.reduce((acc, group) => {
        const availableItems = group.items.filter(template => {
            return template.starsCost !== undefined &&
                   child.stars >= template.starsCost &&
                   !assignedOrPendingTemplateIds.has(template.title); // Assuming ID is title for predefined
        });
        if(availableItems.length > 0) {
            acc[group.userCategory] = {
                icon: group.icon,
                items: availableItems
            };
        }
        return acc;
    }, {} as Record<string, { icon: React.ElementType, items: typeof predefinedRewardGroups[0]['items'] }>);
  }, [child, predefinedRewardGroups, childRewards]);
  
  const pendingApprovalRewards = useMemo(() => {
      return childRewards.filter(r => r.status === 'pending_approval');
  }, [childRewards]);
  
  const redeemedRewards = useMemo(() => {
      return childRewards.filter(r => r.status === 'redeemed').sort((a, b) => {
          const dateA = getDateObject(a.redeemedAt)?.getTime() || 0;
          const dateB = getDateObject(b.redeemedAt)?.getTime() || 0;
          return dateB - dateA;
      });
  }, [childRewards]);


  if (isLoading || isFamilyLoading) {
    return <Loading />;
  }

  if (!child && !isLoading) {
     return (
        <Card className="text-center py-10 shadow-md bg-gradient-to-br from-card to-secondary/10">
            <CardContent>
              <Smile className="h-20 w-20 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">Nenhum Herói Cadastrado Ainda!</h3>
              <p className="text-muted-foreground mb-6">Parece um pouco vazio por aqui. Comece adicionando o primeiro herói.</p>
              <Link href="/dashboard/assistente">
                  <Button size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90 shadow-lg animate-pulse">
                      <PlusCircle className="mr-2 h-4 w-4" /> Adicione Seu Primeiro Herói
                  </Button>
              </Link>
            </CardContent>
        </Card>
    );
  }

  if (!child) return <Loading />;

  const age = child.birthDate ? calculateAge(child.birthDate as any) : null;

  return (
    <div className="space-y-6 pb-8">
      
      <Card className="shadow-xl overflow-hidden">
        <div className="p-4 bg-gradient-to-br from-primary/10 via-background to-accent/5 relative">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
              {isLoading ? (
                  <Skeleton className="h-24 w-24 rounded-full flex-shrink-0" />
              ) : (
                  <Avatar
                      className="h-24 w-24 text-4xl shadow-md ring-4 ring-offset-2 ring-offset-background"
                      style={{'--ring-color': child.color } as React.CSSProperties}
                  >
                      <AvatarImage src={child.avatar} alt={child.name} />
                      <AvatarFallback
                          className="font-bold"
                          style={{ backgroundColor: child.color }}
                      >
                          {getInitials(child.name)}
                      </AvatarFallback>
                  </Avatar>
              )}
              <div className="flex-grow">
                  <CardTitle className="text-3xl font-headline text-primary">{child.name}</CardTitle>
                  <CardDescription className="text-base mt-1">
                      {age !== null ? `Idade: ${age} Anos` : 'Idade não informada'}
                  </CardDescription>
                  <div className="mt-4 flex items-center justify-center sm:justify-start gap-4">
                      <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                          <StarIcon className="h-7 w-7 fill-current"/>
                          <span className="text-2xl font-bold">{child.stars.toLocaleString('pt-BR')}</span>
                      </div>
                  </div>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-4 font-semibold">
                <div className="w-full">
                    <LevelUpPath currentLevel={child.level} currentTotalStars={child.totalStars} />
                </div>
            </div>
        </div>
      </Card>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 h-auto lg:h-auto bg-muted/50 p-1 rounded-lg">
          <TabsTrigger value="overview" className="text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md lg:flex-col lg:h-auto lg:gap-1 lg:p-2"><User className="h-4 w-4 text-blue-500 lg:h-5 lg:w-5 lg:mb-1" /><span>Visão Geral</span></TabsTrigger>
          <TabsTrigger value="missions" className="text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md lg:flex-col lg:h-auto lg:gap-1 lg:p-2"><Target className="h-4 w-4 text-red-500 lg:h-5 lg:w-5 lg:mb-1" /><span>Missões</span></TabsTrigger>
          <TabsTrigger value="rewards" className="text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md lg:flex-col lg:h-auto lg:gap-1 lg:p-2"><Gift className="h-4 w-4 text-blue-500 lg:h-5 lg:w-5 lg:mb-1" /><span>Recompensas</span></TabsTrigger>
          <TabsTrigger value="school-schedule" className="text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md lg:flex-col lg:h-auto lg:gap-1 lg:p-2"><NotebookPen className="h-4 w-4 text-chart-5 lg:h-5 lg:w-5 lg:mb-1" /><span>Rotina Escolar</span></TabsTrigger>
          <TabsTrigger value="badges" className="text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md lg:flex-col lg:h-auto lg:gap-1 lg:p-2"><Medal className="h-4 w-4 text-purple-500 lg:h-5 lg:w-5 lg:mb-1" /><span>Medalhas</span></TabsTrigger>
          <TabsTrigger value="edit" className="text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md lg:flex-col lg:h-auto lg:gap-1 lg:p-2" disabled={!canEdit}><Edit3 className="h-4 w-4 text-orange-500 lg:h-5 lg:w-5 lg:mb-1" /><span>Editar Perfil</span></TabsTrigger>
        </TabsList>

        <div className="mt-4">
          {isLoadingSecondaryData ? (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[...Array(8)].map((_, i) => (
                    <Card key={i}><CardHeader><Skeleton className="h-20 w-full" /></CardHeader></Card>
                ))}
             </div>
          ) : (
            <>
                <TabsContent value="overview" className="space-y-6">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <UnlockedRewards childrenProfiles={[child]} rewardTemplates={rewardTemplates.map(rt => ({ ...rt, id: rt.title }))} />
                    </div>
                </TabsContent>
                <TabsContent value="missions">
                <Card className="shadow-md">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-2"><Target className="h-5 w-5 text-red-500" />Quadro de Missões de {child.name}</CardTitle>
                            </div>
                            <Button className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => setIsAddMissionDialogOpen(true)} disabled={!canEdit}>
                                <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Nova Missão
                            </Button>
                        </div>
                        <div className="pt-4">
                            <Label className="text-sm font-medium text-muted-foreground">Filtrar por Recorrência</Label>
                            <RadioGroup
                                value={recurrenceFilter}
                                onValueChange={(v) => setRecurrenceFilter(v as 'all' | 'unique' | 'recurring')}
                                className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-2"
                            >
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="all" id="filter-all-missions" />
                                    <Label htmlFor="filter-all-missions" className="cursor-pointer font-normal">Todas</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="unique" id="filter-unique-missions" />
                                    <Label htmlFor="filter-unique-missions" className="cursor-pointer font-normal">Únicas</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="recurring" id="filter-recurring-missions" />
                                    <Label htmlFor="filter-recurring-missions" className="cursor-pointer font-normal">Recorrentes</Label>
                                </div>
                            </RadioGroup>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <Button onClick={() => router.push('/dashboard/missions')} variant="outline" className="shadow-sm">
                            <ExternalLink className="mr-2 h-4 w-4" /> Ir para o Quadro de Missões
                        </Button>
                        {filteredMissions.length === 0 ? (
                        <div className="text-center py-10 border-2 border-dashed border-muted-foreground/30 rounded-lg">
                            <Target className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
                            <p className="text-lg text-muted-foreground">Nenhuma missão encontrada com os filtros atuais.</p>
                            <p className="text-sm text-muted-foreground mt-1">Tente outro filtro ou clique em "Adicionar Nova Missão" para começar a jornada!</p>
                        </div>
                        ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {filteredMissions.map(instance => (
                                <MissionCard key={instance.id} instance={instance} onManage={handleManageInAgenda} onDelete={setMissionToDelete} />
                            ))}
                        </div>
                        )}
                    </CardContent>
                </Card>
                </TabsContent>

                <TabsContent value="rewards">
                    <Tabs defaultValue={rewardSubTab} onValueChange={setRewardSubTab} className="w-full">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="available">Disponíveis</TabsTrigger>
                            <TabsTrigger value="pending">Pendentes</TabsTrigger>
                            <TabsTrigger value="history">Histórico</TabsTrigger>
                        </TabsList>
                        <TabsContent value="available" className="mt-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Disponíveis para Resgate</CardTitle>
                                    <CardDescription>Recompensas que {child.name} já pode resgatar com suas estrelas.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Accordion type="multiple" className="w-full space-y-2">
                                        {Object.keys(availableForRedemptionByCategory).length > 0 ? (
                                            Object.entries(availableForRedemptionByCategory).map(([category, group]) => (
                                                <AccordionItem key={category} value={category} className="border rounded-lg shadow-sm">
                                                    <AccordionTrigger className="p-3 hover:no-underline text-left">
                                                        <div className="flex items-center justify-between w-full">
                                                            <span className="font-semibold flex items-center gap-2">
                                                                <group.icon className="h-5 w-5 text-primary" /> {category}
                                                            </span>
                                                            <Badge variant="secondary" className="mr-2">{group.items.length}</Badge>
                                                        </div>
                                                    </AccordionTrigger>
                                                    <AccordionContent className="p-4 pt-2">
                                                        <div className="space-y-2 border-t pt-3">
                                                            {group.items.map(reward => (
                                                                <div key={reward.title} className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50">
                                                                    <p className="font-medium text-sm">{reward.title}</p>
                                                                    <div className="flex items-center gap-2">
                                                                        <Badge variant="outline" className="font-semibold">{reward.starsCost} <StarIcon className="ml-1.5 h-3 w-3 text-yellow-500" /></Badge>
                                                                        {canEdit && (
                                                                            <Button size="xs" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => {/* Implement Inactivate Logic */}}>Inativar</Button>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </AccordionContent>
                                                </AccordionItem>
                                            ))
                                        ) : (
                                            <p className="text-sm text-muted-foreground text-center py-6">Nenhuma recompensa disponível para o saldo de estrelas atual.</p>
                                        )}
                                    </Accordion>
                                </CardContent>
                            </Card>
                        </TabsContent>
                         <TabsContent value="pending" className="mt-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Aguardando Aprovação</CardTitle>
                                    <CardDescription>Recompensas que {child.name} pediu para resgatar.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                     {pendingApprovalRewards.length > 0 ? (
                                         <div className="space-y-3">
                                             {pendingApprovalRewards.map(instance => (
                                                 <Card key={instance.id} className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-amber-500/10 border-amber-500/20">
                                                     <div>
                                                         <p className="font-semibold">{instance.title}</p>
                                                         <Badge variant="secondary">{instance.starsCost.toLocaleString('pt-BR')} <StarIcon className="ml-1.5 h-3 w-3 text-yellow-500" /></Badge>
                                                     </div>
                                                     {canEdit && (
                                                         <div className="flex gap-2 self-end sm:self-center">
                                                              <Button size="sm" variant="destructive" onClick={() => {/* Implement Decline */}}>Recusar</Button>
                                                             <Button size="sm" onClick={() => { setInstanceToManage(instance); setIsRedeemConfirmOpen(true); }} disabled={isDeleting || child.stars < instance.starsCost}>Aprovar</Button>
                                                         </div>
                                                     )}
                                                 </Card>
                                             ))}
                                         </div>
                                     ) : (
                                         <p className="text-sm text-center text-muted-foreground py-6">Nenhum pedido de resgate pendente.</p>
                                     )}
                                </CardContent>
                            </Card>
                        </TabsContent>
                        <TabsContent value="history" className="mt-4">
                             <Card>
                                <CardHeader>
                                    <CardTitle>Histórico de Resgates</CardTitle>
                                    <CardDescription>Recompensas que {child.name} já conquistou.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                     {redeemedRewards.length > 0 ? (
                                         <div className="space-y-2">
                                             {redeemedRewards.map(instance => (
                                                <div key={instance.id} className="p-3 rounded-md border flex justify-between items-center bg-muted/40">
                                                    <div>
                                                        <p className="font-semibold text-muted-foreground">{instance.title}</p>
                                                        <p className="text-xs text-muted-foreground">Resgatada em: {getDateObject(instance.redeemedAt)?.toLocaleDateString('pt-BR')}</p>
                                                    </div>
                                                    <Badge variant="outline">{instance.starsCost.toLocaleString('pt-BR')} <StarIcon className="ml-1.5 h-3 w-3 text-muted-foreground" /></Badge>
                                                </div>
                                             ))}
                                         </div>
                                     ) : (
                                        <p className="text-sm text-center text-muted-foreground py-6">Nenhuma recompensa foi resgatada ainda.</p>
                                     )}
                                </CardContent>
                             </Card>
                        </TabsContent>
                    </Tabs>
                </TabsContent>
            <TabsContent value="school-schedule">
                <Card className="shadow-md">
                    <CardHeader>
                        <div className="flex flex-col sm:flex-row gap-2 items-start justify-between">
                            <div>
                                <CardTitle>Agenda Escolar de {child.name}</CardTitle>
                                <CardDescription>Veja o horário de aulas da semana.</CardDescription>
                            </div>
                            <div className="flex gap-2 w-full sm:w-auto">
                                <Button asChild variant="outline" className="w-full sm:w-auto flex-1">
                                    <Link href="/dashboard/school-schedule">
                                        <ExternalLink className="mr-2 h-4 w-4" /> Ver Agenda Completa
                                    </Link>
                                </Button>
                                {canEdit && (
                                    <Button
                                    variant="default"
                                    className="w-full sm:w-auto flex-1"
                                    onClick={() => { setEntryToEdit(null); setIsEntryDialogOpen(true); }}
                                    >
                                    <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Aula
                                    </Button>
                                )}
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {schoolSchedule.length === 0 ? (
                            <p className="text-muted-foreground p-4 text-center">Nenhuma aula cadastrada na agenda escolar.</p>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {weekdays.map(day => {
                                    const dayEntries = schoolSchedule.filter(e => e.dayOfWeek === day);
                                    if (dayEntries.length === 0) return null;
                                    return (
                                        <div key={day} className="space-y-3">
                                            <h3 className="font-semibold mb-2">{weekdayLabels[day].long}</h3>
                                            <ul className="space-y-2">
                                                {dayEntries.map(entry => (
                                                    <li key={entry.id} className="group p-3 rounded-md border" style={{ borderLeftColor: entry.color, borderLeftWidth: '4px' }}>
                                                        <div className="flex justify-between items-start">
                                                            <div>
                                                                <p className="font-semibold">{entry.subject}</p>
                                                                <p className="text-sm text-muted-foreground">{entry.startTime} - {entry.endTime}</p>
                                                            </div>
                                                            {canEdit && (
                                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditEntry(entry)}><Edit className="h-4 w-4" /></Button>
                                                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setEntryToDelete(entry)}><Trash2 className="h-4 w-4" /></Button>
                                                            </div>
                                                            )}
                                                        </div>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </TabsContent>
            <TabsContent value="badges">
                <RecentMedals childrenProfiles={[child]} />
            </TabsContent>
            <TabsContent value="edit">
                <Card className="shadow-md">
                <CardHeader>
                    <CardTitle>Editar Perfil de {child.name}</CardTitle>
                    <CardDescription>Atualize as informações do Mini Heroi e configurações.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <EditChildProfileForm
                    child={child}
                    onProfileUpdate={() => fetchDataForChild(child.id)}
                    />
                    <Separator className="my-8" />
                    <div className="space-y-4 rounded-lg border border-destructive/50 bg-destructive/5 p-4">
                    <h3 className="font-semibold text-lg text-destructive">Zona de Perigo</h3>
                    <div className="flex flex-col sm:flex-row gap-2">
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                            <Button type="button" variant="outline" className="w-full border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive" disabled={isDeleting || isResettingProgress || isMoving}>
                                <RotateCcw className="mr-2 h-4 w-4" />
                                Redefinir Progresso
                            </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Redefinir o progresso de {child.name}?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Esta ação é irreversível. Todas as estrelas, XP, níveis, missões concluídas e recompensas resgatadas serão zeradas. O perfil voltará ao estado inicial.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel disabled={isResettingProgress}>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={handleResetProgress} className="bg-destructive hover:bg-destructive/90" disabled={isResettingProgress}>
                                    {isResettingProgress && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Sim, Redefinir
                                </AlertDialogAction>
                            </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                        <Button type="button" variant="outline" className="w-full" onClick={() => setIsMoveDialogOpen(true)} disabled={isDeleting || isResettingProgress || isMoving || moveTargetContexts.length === 0}>
                            <Move className="mr-2 h-4 w-4" />
                            Mover Herói
                        </Button>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                            <Button type="button" variant="destructive" className="w-full" disabled={isDeleting || isResettingProgress || isMoving}>
                                <Trash2 className="mr-2 h-4 w-4" />
                                Excluir Perfil
                            </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                                <AlertDialogDescription>
                                Esta ação não pode ser desfeita. Isso excluirá permanentemente o perfil de {child.name} e todos os seus dados associados (missões, recompensas, progresso, agenda).
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDeleteProfile} className="bg-destructive hover:bg-destructive/90" disabled={isDeleting}>
                                {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Sim, Excluir Perfil
                                </AlertDialogAction>
                            </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                    </div>
                </CardContent>
                </Card>
            </TabsContent>
            </>
          )}
        </div>
      </Tabs>

      {child && (
        <AddMissionDialog
            child={child}
            isOpen={isAddMissionDialogOpen}
            onOpenChange={setIsAddMissionDialogOpen}
            onMissionAdded={() => fetchDataForChild(child.id)}
        />
      )}

      {instanceToEdit && (
        <AssignMissionDialog
          template={null}
          instanceToEdit={instanceToEdit}
          occurrenceDate={new Date()}
          isOpen={isAssignMissionDialogOpen}
          onOpenChange={(isOpen) => {
            if (!isOpen) {
              setInstanceToEdit(null);
            }
            setIsAssignMissionDialogOpen(isOpen);
          }}
          onAssigned={() => fetchDataForChild(child.id)}
        />
      )}

      {entryToEdit !== null && (
          <EditScheduleEntryDialog
            isOpen={isEntryDialogOpen}
            onOpenChange={setIsEntryDialogOpen}
            onSave={() => {
              if (child) fetchDataForChild(child.id);
              setIsEntryDialogOpen(false);
              setEntryToEdit(null);
            }}
            entryToEdit={entryToEdit}
            child={child}
            showRecessHint={!hasRecess}
            onDelete={() => {
              if (entryToEdit) {
                setEntryToDelete(entryToEdit);
                setIsEntryDialogOpen(false);
              }
            }}
          />
      )}

      {entryToDelete && (
        <AlertDialog open={!!entryToDelete} onOpenChange={() => setEntryToDelete(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Excluir Aula?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Tem certeza que deseja remover a aula de "{entryToDelete.subject}" do horário?
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteEntry} className="bg-destructive hover:bg-destructive/90" disabled={isDeleting}>
                        {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                        Sim, Excluir
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      )}

      <AlertDialog open={!!missionToDelete} onOpenChange={(isOpen) => !isOpen && setMissionToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Remover Missão?</AlertDialogTitle>
                <AlertDialogDescription>
                    Tem certeza que deseja remover a missão "{missionToDelete?.title}" da lista de {child.name}? Esta ação não pode ser desfeita.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteMissionInstance} className="bg-destructive hover:bg-destructive/90" disabled={isDeleting}>
                    {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                    Sim, Remover
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {instanceToManage && isRedeemConfirmOpen && child && (
        <AlertDialog open={isRedeemConfirmOpen} onOpenChange={setIsRedeemConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Resgate de Recompensa</AlertDialogTitle>
              <AlertDialogDescription>
                Você tem certeza que deseja marcar a recompensa "{instanceToManage.title}" ({instanceToManage.starsCost.toLocaleString('pt-BR')} estrelas) como resgatada por {child.name}? Isso deduzirá as estrelas do saldo de {child.name}.
                <br/>
                Saldo atual de estrelas de {child.name}: {child.stars.toLocaleString('pt-BR')}.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setIsRedeemConfirmOpen(false)} disabled={isDeleting}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleMarkAsRedeemed}
                className="bg-green-600 hover:bg-green-700"
                disabled={isDeleting || child.stars < instanceToManage.starsCost}
              >
                {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                Sim, Marcar como Resgatada
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {instanceToManage && isUndoConfirmOpen && (
        <AlertDialog open={isUndoConfirmOpen} onOpenChange={setIsUndoConfirmOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Desfazer Resgate?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Isso devolverá {instanceToManage.starsCost} estrelas para {child.name} e tornará a recompensa ativa novamente.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleUndoRedemption} disabled={isDeleting}>
                        {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Confirmar
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      )}

      {instanceToManage && isDeleteInstanceConfirmOpen && (
         <AlertDialog open={isDeleteInstanceConfirmOpen} onOpenChange={setIsDeleteInstanceConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Remoção da Atribuição</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja remover a atribuição da recompensa "{instanceToManage.title}" para {child?.name}? Esta ação não pode ser desfeita para esta criança específica.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setIsDeleteInstanceConfirmOpen(false)} disabled={isDeleting}>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteInstance} className="bg-destructive hover:bg-destructive/90" disabled={isDeleting}>
                {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                Sim, Remover Atribuição
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      <AlertDialog open={isMoveDialogOpen} onOpenChange={setIsMoveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mover {child.name} para outro espaço</AlertDialogTitle>
            <AlertDialogDescription>
              Ao mover, todas as missões, recompensas, progresso e agenda escolar do Mini Heroi serão movidos juntos. Selecione o novo espaço que irá gerenciar este perfil.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Select onValueChange={setSelectedMoveContext} value={selectedMoveContext}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um destino..." />
              </SelectTrigger>
              <SelectContent>
                {moveTargetContexts.map(context => (
                  <SelectItem key={context.id} value={context.id}>
                    {context.id === 'my-space' ? 'Meu Espaço' : `Aliança: ${context.name}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isMoving}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleMoveHeroi} disabled={isMoving || !selectedMoveContext}>
              {isMoving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar Movimentação
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

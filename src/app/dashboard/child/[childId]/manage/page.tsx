

"use client";

import { useEffect, useState, useMemo, useCallback, Fragment } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { regenerateChildAccessCode, deleteChildProfile, updateChildRewardInstance, deleteChildRewardInstance, updateChildProfile, getMissionInstancesByChild, deleteMissionInstance, reactivateMissionInstance, getChildRewardInstancesByChild, resetChildProgress, redeemChildRewardInstance, getChildProfileById, checkAndAwardBadges, recalculateAndSyncBadges } from '@/lib/firebase/firestore';
import type { ChildProfile, ChildRewardInstance, RewardCategoryDetails, MissionInstance, MissionCategoryDetails } from '@/lib/types';
import { rewardCategories, missionCategories } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, User, Star as StarIcon, Edit3, ShieldCheck, Loader2, Trash2, RefreshCw, Gift, PackageSearch, EllipsisVertical, CheckCircle, XCircle, ExternalLink, MoreHorizontal, Info, CheckSquare, Trophy, Clock, BadgeCheck, PlusCircle, CalendarDays, CheckCircle2, Repeat, Undo2, Medal, RotateCcw, Target, Lock, Sun, CloudSun, Moon } from 'lucide-react';
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
import { Timestamp, serverTimestamp } from 'firebase/firestore';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { format, differenceInYears, isSameDay, parse, formatDistanceToNowStrict } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import { formatRecurrenceSummary, isMissionScheduledForDate, getDateObject, getPeriodOfDay } from '@/lib/calendar-utils';
import { predefinedBadgeCategories, type Badge as BadgeType } from '@/lib/badges';
import { cn } from '@/lib/utils';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';

type Activity = 
    | (MissionInstance & { type: 'mission', scheduledFor: Date, completedAt: Timestamp })
    | (ChildRewardInstance & { type: 'reward', completedAt: Timestamp });


export default function ManageChildPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const childId = params.childId as string;

  // Primary data states
  const [child, setChild] = useState<ChildProfile | null>(null);
  const [missionInstances, setMissionInstances] = useState<MissionInstance[]>([]);
  const [childRewards, setChildRewards] = useState<ChildRewardInstance[]>([]);
  
  // Loading and action states
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRegeneratingCode, setIsRegeneratingCode] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  // Mission-specific states
  const [missionStatusFilter, setMissionStatusFilter] = useState<'pending' | 'completed'>('pending');
  const [isAddMissionDialogOpen, setIsAddMissionDialogOpen] = useState(false);
  const [missionToDelete, setMissionToDelete] = useState<MissionInstance | null>(null);
  
  // Reward-specific states
  const [instanceToManage, setInstanceToManage] = useState<ChildRewardInstance | null>(null);
  const [isRedeemConfirmOpen, setIsRedeemConfirmOpen] = useState(false);
  const [isDeleteInstanceConfirmOpen, setIsDeleteInstanceConfirmOpen] = useState(false);
  const [instanceStatusFilter, setInstanceStatusFilter] = useState<'all' | 'active' | 'redeemed' | 'disabled'>('all');
  
  const [selectedBadge, setSelectedBadge] = useState<BadgeType | null>(null);
  const [isResettingProgress, setIsResettingProgress] = useState(false);
  const [isAboutBadgesOpen, setIsAboutBadgesOpen] = useState(false);

  const periodIcons = {
    Manhã: Sun,
    Tarde: CloudSun,
    Noite: Moon,
  };


  // Centralized data fetching function
  const fetchData = useCallback(async () => {
    if (!childId) return;
    setIsLoading(true);
    try {
      const [profile, missions, rewards] = await Promise.all([
        getChildProfileById(childId),
        getMissionInstancesByChild(childId),
        getChildRewardInstancesByChild(childId),
      ]);

      if (profile) {
        setChild(profile);
        setMissionInstances(missions);
        setChildRewards(rewards.sort((a, b) => {
            if (a.status === 'active' && b.status !== 'active') return -1;
            if (a.status !== 'active' && b.status === 'active') return 1;
            if (a.status === 'disabled' && b.status === 'redeemed') return -1;
            if (a.status === 'redeemed' && b.status === 'disabled') return 1;
            return (b.assignedAt as any).seconds - (a.assignedAt as any).seconds;
        }));
      } else {
        toast({ title: "Perfil Não Encontrado", description: "Não encontramos um perfil para este Mini Heroi.", variant: "destructive" });
        router.push('/dashboard/heroes');
      }
    } catch (error) {
      console.error("Error fetching child data:", error);
      toast({ title: "Erro ao Carregar", description: "Não foi possível carregar os dados. Tente novamente.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [childId, router, toast]);

  // Initial data fetch
  useEffect(() => {
    if (childId) {
      fetchData();
    } else {
      router.push('/dashboard/heroes');
    }
  }, [childId, fetchData, router]);

  // Derived data using useMemo for reactivity and performance
  const stats = useMemo(() => {
    if (!child || !missionInstances || !childRewards) {
      return { completedMissions: 0, starsEarned: 0, rewardsRedeemed: 0, pendingMissions: 0, availableRewards: 0, earnedBadges: 0 };
    }

    const totalCompletedOccurrences = missionInstances.reduce((sum, m) => sum + Object.keys(m.completionLog || {}).length, 0);

    const totalStarsEarned = missionInstances
      .flatMap(m => Object.keys(m.completionLog || {}).length > 0 ? Array(Object.keys(m.completionLog || {}).length).fill(m.starsReward) : [])
      .reduce((sum, stars) => sum + (stars || 0), 0);

    const pendingMissionsCount = missionInstances.filter(m => m.status === 'pending').length;
    const redeemedRewardsCount = childRewards.filter(r => r.status === 'redeemed').length;
    const availableRewardsCount = childRewards.filter(r => r.status === 'active').length;
    const earnedBadgesCount = child.earnedBadgeIds?.length || 0;

    return {
      completedMissions: totalCompletedOccurrences,
      starsEarned: totalStarsEarned,
      rewardsRedeemed: redeemedRewardsCount,
      pendingMissions: pendingMissionsCount,
      availableRewards: availableRewardsCount,
      earnedBadges: earnedBadgesCount,
    };
  }, [child, missionInstances, childRewards]);

  const activities = useMemo(() => {
    if (!missionInstances || !childRewards) return [];
    
    const redeemedRewards = childRewards.filter(r => r.status === 'redeemed' && r.redeemedAt);

    const allActivities: Activity[] = [
      ...missionInstances.flatMap(m =>
        Object.entries(m.completionLog || {}).map(([dateStr, completedTimestamp]) => ({
          ...m,
          type: 'mission' as const,
          scheduledFor: parse(dateStr, 'yyyy-MM-dd', new Date()),
          completedAt: completedTimestamp,
        }))
      ),
      ...redeemedRewards.map(r => ({ ...r, type: 'reward' as const, completedAt: r.redeemedAt! })),
    ].sort((a, b) => {
        const timeA = a.completedAt instanceof Timestamp ? a.completedAt.toDate().getTime() : new Date(a.completedAt as any).getTime();
        const timeB = b.completedAt instanceof Timestamp ? b.completedAt.toDate().getTime() : new Date(b.completedAt as any).getTime();
        return timeB - timeA;
    });
    return allActivities.slice(0, 10);
  }, [missionInstances, childRewards]);


  const calculateXpDetails = (level: number, currentXp: number) => {
    let xpForCurrentLevel = 0;
    let xpToLevelUp = 0;

    for (let i = 1; i < level; i++) {
      xpToLevelUp = 100 + (i - 1) * 50;
      xpForCurrentLevel += xpToLevelUp;
    }
    
    const xpForNextLevel = xpForCurrentLevel + (100 + (level - 1) * 50);
    const xpInCurrentLevel = currentXp - xpForCurrentLevel;
    const xpNeededForLevelUp = xpForNextLevel - xpForCurrentLevel;
    
    const progressPercentage = xpNeededForLevelUp > 0 ? (xpInCurrentLevel / xpNeededForLevelUp) * 100 : 0;
    const xpRemaining = xpForNextLevel - currentXp;

    return {
      progressPercentage,
      xpRemaining,
      xpForNextLevel
    };
  };

  const calculateAge = (birthDate: Date): number => {
    return differenceInYears(new Date(), birthDate);
  };

  const handleProfileUpdate = useCallback(async () => {
    await fetchData();
    toast({ title: "Perfil Atualizado!", description: `As informações do(a) Mini Heroi ${child?.name || ''} foram salvas.` });
  }, [fetchData, toast, child?.name]);

  const handleRegenerateAccessCode = async () => {
    if (!child) return;
    setIsRegeneratingCode(true);
    try {
      const newAccessCode = await regenerateChildAccessCode(child.id);
      setChild(prev => prev ? { ...prev, accessCode: newAccessCode } : null);
      toast({
        title: "Nova Chave Secreta Gerada!",
        description: `A nova chave para ${child.name} é ${newAccessCode}. Guarde em um local seguro!`,
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
    if (!child) return;
    setIsDeleting(true);
    try {
      await deleteChildProfile(child.id);
      toast({ title: "Missão Arquivada", description: `O perfil de ${child.name} foi arquivado. Novas aventuras o(a) aguardam!` });
      router.push('/dashboard/heroes');
    } catch (error) {
      console.error("Error deleting child profile:", error);
      toast({ title: "Erro ao Excluir", description: "Não foi possível excluir o perfil da criança. Por favor, tente novamente mais tarde.", variant: "destructive" });
      setIsDeleting(false);
    }
  };
  
  const handleManageInAgenda = (instance: MissionInstance) => {
    const today = new Date();
    // Prioritize today if the mission is scheduled for today, otherwise find the next logical date.
    const isForToday = isMissionScheduledForDate(instance, today);
    const targetDate = isForToday ? today : (instance.startDate?.toDate() || instance.dueDate?.toDate());

    if (!targetDate) {
      toast({ title: 'Data não encontrada', description: 'Não foi possível determinar a data para esta missão.', variant: 'destructive' });
      return;
    }
    
    const year = targetDate.getFullYear();
    const month = (targetDate.getMonth() + 1).toString().padStart(2, '0');
    const day = targetDate.getDate().toString().padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;
    
    const popoverId = `${instance.id}-${dateString}`;

    router.push(`/dashboard/agenda?focus_date=${dateString}&open_popover=${popoverId}`);
  };

  const handleResetProgress = async () => {
    if (!child) return;
    setIsResettingProgress(true);
    try {
      await resetChildProgress(child.id);
      await fetchData(); // Re-fetch all data to update the UI
      toast({ title: "Progresso Redefinido!", description: `Os dados de ${child.name} foram zerados com sucesso.` });
    } catch (error) {
      console.error("Error resetting child progress:", error);
      toast({ title: "Erro ao Redefinir", description: "Não foi possível redefinir o progresso.", variant: "destructive" });
    } finally {
      setIsResettingProgress(false);
    }
  };

  
  const handleDeleteMissionInstance = async () => {
    if (!missionToDelete) return;
    setIsDeleting(true);
    try {
      await deleteMissionInstance(missionToDelete.id);
      await fetchData();
      toast({
        title: "Missão Removida",
        description: `A missão "${missionToDelete.title}" foi removida da lista de ${child?.name}.`
      });
    } catch (error) {
      console.error("Error deleting mission instance:", error);
      toast({ title: "Erro ao Remover Missão", description: "Não foi possível remover a missão.", variant: "destructive" });
    } finally {
      setIsDeleting(false);
      setMissionToDelete(null);
    }
  };

  const getInitials = (name?: string | null) => {
    if (!name) return "MH"; 
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  const getCategoryDetails = (categoryId: ChildRewardInstance['category']): RewardCategoryDetails | undefined => {
    return rewardCategories.find(cat => cat.id === categoryId);
  };
  
  const getMissionCategoryDetails = (categoryId: MissionInstance['category']): MissionCategoryDetails | undefined => {
    return missionCategories.find(cat => cat.id === categoryId);
  };


  const getRewardStatusBadgeVariant = (status: ChildRewardInstance['status']): "default" | "secondary" | "outline" | "destructive" => {
    switch (status) {
      case 'active': return 'default'; 
      case 'redeemed': return 'secondary'; 
      case 'disabled': return 'outline'; 
      default: return 'outline';
    }
  };
  
  const getRewardStatusText = (status: ChildRewardInstance['status']): string => {
    switch (status) {
      case 'active': return 'Ativa';
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
    if (!instanceToManage || !child) return;
    setIsDeleting(true);
    try {
      await redeemChildRewardInstance(instanceToManage.id, child.id);
      await fetchData();
      toast({ title: "Conquista Desbloqueada!", description: `"${instanceToManage.title}" foi resgatada por ${child.name}. Que incrível!` });
    } catch (error: any) {
      console.error("Error marking reward as redeemed:", error);
      toast({ title: "Erro ao Resgatar", description: error.message || "Não foi possível marcar a recompensa como resgatada.", variant: "destructive" });
    } finally {
      setIsDeleting(false);
      setIsRedeemConfirmOpen(false);
      setInstanceToManage(null);
    }
  };

  const handleToggleInstanceStatus = async (instance: ChildRewardInstance, newStatus: 'active' | 'disabled') => {
    setIsDeleting(true);
    try {
      await updateChildRewardInstance(instance.id, { status: newStatus });
      await fetchData();
      toast({ 
        title: "Status da Recompensa Atualizado", 
        description: `A recompensa "${instance.title}" agora está ${newStatus === 'active' ? 'disponível' : 'indisponível'} para ${child?.name}.` 
      });
    } catch (error) {
      console.error(`Error toggling reward instance status:`, error);
      toast({ title: "Erro ao Atualizar Status", description: "Não foi possível alterar o status da recompensa.", variant: "destructive" });
    } finally {
      setIsDeleting(false);
    }
  };
  
  const handleDeleteInstance = async () => {
    if (!instanceToManage) return;
    setIsDeleting(true);
    try {
      await deleteChildRewardInstance(instanceToManage.id);
      await fetchData();
      toast({ title: "Recompensa Removida", description: `A recompensa "${instanceToManage.title}" foi retirada da lista de ${child?.name}.` });
    } catch (error) {
      console.error("Error deleting reward instance:", error);
      toast({ title: "Erro ao Remover Atribuição", description: "Não foi possível remover a recompensa.", variant: "destructive" });
    } finally {
      setIsDeleting(false);
      setIsDeleteInstanceConfirmOpen(false);
      setInstanceToManage(null);
    }
  };

  const filteredChildRewards = useMemo(() => {
    if (instanceStatusFilter === 'all') {
      return childRewards;
    }
    return childRewards.filter(reward => reward.status === instanceStatusFilter);
  }, [childRewards, instanceStatusFilter]);
  
  const pendingMissions = useMemo(() => {
    if (!missionInstances) return [];
    return missionInstances
      .filter(m => m.status === 'pending')
      .sort((a, b) => {
        const dateA = getDateObject(a.isRecurring ? a.startDate : a.dueDate) || new Date(0);
        const dateB = getDateObject(b.isRecurring ? b.startDate : b.dueDate) || new Date(0);
        return dateA.getTime() - dateB.getTime();
      });
  }, [missionInstances]);


  const completedMissions = useMemo(() => {
    return missionInstances
        .filter(m => m.status === 'completed')
        .sort((a, b) => {
            const dateA = a.updatedAt?.toDate() || new Date(0);
            const dateB = b.updatedAt?.toDate() || new Date(0);
            return dateB.getTime() - dateA.getTime();
        });
  }, [missionInstances]);


  const { progressPercentage, xpRemaining, xpForNextLevel } = useMemo(() => 
    child ? calculateXpDetails(child.level, child.xp) : { progressPercentage: 0, xpRemaining: 0, xpForNextLevel: 0 },
    [child]
  );

  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Carregando dados do Mini Heroi...</p>
      </div>
    );
  }

  if (!child) {
     return (
      <div className="flex flex-col justify-center items-center min-h-[calc(100vh-200px)]">
        <p className="text-lg text-destructive">Mini Heroi não encontrado.</p>
        <Button onClick={() => router.push('/dashboard/heroes')} className="mt-4">
            Voltar ao Painel
        </Button>
      </div>
    );
  }

  const age = child.birthDate ? calculateAge(child.birthDate.toDate()) : null;

  const renderMissionCard = (instance: MissionInstance) => {
    const categoryDetails = getMissionCategoryDetails(instance.category);
    const CategoryIconComponent = categoryDetails?.icon;
      
    const scheduleDate = getDateObject(instance.isRecurring ? instance.startDate : instance.dueDate);
    const time = scheduleDate ? format(scheduleDate, 'HH:mm') : null;
    const period = scheduleDate ? getPeriodOfDay(scheduleDate) : null;
    const PeriodIcon = period ? periodIcons[period] : null;

    return (
        <Card key={instance.id} className="shadow-sm flex flex-col transition-all h-full">
            <CardHeader className="p-4">
                <div className="flex justify-between items-start">
                    <CardTitle className="text-base font-semibold leading-tight pr-2">{instance.title}</CardTitle>
                    <Badge variant={getMissionStatusBadgeVariant(instance.status)} className="capitalize text-xs whitespace-nowrap">
                        {getMissionStatusText(instance.status)}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-2 flex-grow text-xs p-4 pt-0">
                {categoryDetails && (
                    <div className="flex items-center">
                        <span className={`mr-2 p-1 rounded-full ${categoryDetails.colorClasses.split(' ')[0]}`}>
                            {CategoryIconComponent && <CategoryIconComponent className={`h-4 w-4 ${categoryDetails.colorClasses.split(' ')[1]}`} />}
                        </span>
                        <Badge variant="outline" className={cn("text-xs", categoryDetails.colorClasses)}>
                            {categoryDetails.label}
                        </Badge>
                    </div>
                )}
                <div className="flex items-center text-muted-foreground font-medium">
                    <StarIcon className="h-4 w-4 mr-1.5 text-yellow-400 fill-yellow-400" />
                    <span>{instance.starsReward} Estrelas</span>
                </div>
                <div className="flex items-center text-muted-foreground font-medium">
                    <BadgeCheck className="h-4 w-4 mr-1.5 text-blue-500" />
                    <span>{instance.xpReward} XP</span>
                </div>
                <div className="flex flex-col gap-1">
                    <div className="flex items-center text-muted-foreground font-medium">
                        <Repeat className="h-4 w-4 mr-1.5 text-purple-500 shrink-0" />
                        <span className="truncate">{formatRecurrenceSummary(instance)}{time ? `, às ${time}` : ''}</span>
                    </div>
                    {period && PeriodIcon && (
                        <div className="flex items-center text-muted-foreground font-medium pl-6">
                            <PeriodIcon className="h-3.5 w-3.5 mr-1.5 text-gray-500 shrink-0" />
                            <span>{period}</span>
                        </div>
                    )}
                </div>
                 <div className="border-t pt-2 mt-2 min-h-[4rem]">
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
                        onClick={() => handleManageInAgenda(instance)}
                    >
                        <CalendarDays className="mr-2 h-4 w-4" />
                        Ver na Agenda
                    </Button>
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    size="icon"
                                    variant="destructive"
                                    className="h-9 w-9"
                                    onClick={() => setMissionToDelete(instance)}
                                    disabled={isDeleting}
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
};


  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => router.back()} className="shadow-sm">
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
        </Button>
      </div>

      <Card className="shadow-xl overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-primary/20 via-background to-accent/10 p-6">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <Avatar
              className="h-28 w-28 text-5xl shadow-md ring-4 ring-offset-2 ring-[var(--ring-color)] ring-offset-background"
              style={{ '--ring-color': child.color } as React.CSSProperties}
            >
              <AvatarImage src={child.avatar} alt={child.name} />
              <AvatarFallback
                className="font-bold"
                style={{ backgroundColor: child.color }}
              >
                {getInitials(child.name)}
              </AvatarFallback>
            </Avatar>
            <div className="text-center sm:text-left flex-grow">
              <CardTitle className="text-4xl font-headline text-primary">{child.name}</CardTitle>
              <CardDescription className="text-base mt-1">
                {age !== null ? `Idade: ${age} Anos` : 'Idade não informada'}
              </CardDescription>
               <div className="mt-2 flex items-center justify-center sm:justify-start space-x-4 text-sm">
                <span className="font-semibold">Nível: {child.level}</span>
                <span className="font-semibold text-accent flex items-center"><StarIcon className="inline-block h-4 w-4 mr-1 fill-accent" /> {child.stars}</span>
                <span className="font-semibold">XP: {child.xp}</span>
              </div>
              <div className="mt-4 border-t border-border/20 pt-4 flex flex-col sm:flex-row flex-wrap justify-center sm:justify-start gap-x-6 gap-y-2">
                <div className="flex items-center gap-1.5 text-sm font-medium" title="Missões">
                    <CheckSquare className="h-4 w-4 text-green-500" />
                    <span>
                        <span className="font-bold text-foreground">{stats.completedMissions}</span>
                        <span className="text-muted-foreground"> Completas</span>
                        <span className="mx-2 text-muted-foreground">|</span>
                        <span className="font-bold text-foreground">{stats.pendingMissions}</span>
                        <span className="text-muted-foreground"> Pendentes</span>
                    </span>
                </div>
                <div className="flex items-center gap-1.5 text-sm font-medium" title="Recompensas">
                    <Trophy className="h-4 w-4 text-orange-500" />
                    <span>
                        <span className="font-bold text-foreground">{stats.availableRewards}</span>
                        <span className="text-muted-foreground"> Disponíveis</span>
                        <span className="mx-2 text-muted-foreground">|</span>
                        <span className="font-bold text-foreground">{stats.rewardsRedeemed}</span>
                        <span className="text-muted-foreground"> Resgatadas</span>
                    </span>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-center sm:justify-start gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground align-middle">
                    <ShieldCheck className="mr-1 h-4 w-4 inline-block text-primary relative -top-px" /> Código:
                  </span>
                  <span className="text-xl font-bold text-accent tracking-wider bg-accent/10 px-2 py-1 rounded-md shadow-sm">
                    {child.accessCode}
                  </span>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleRegenerateAccessCode} 
                  disabled={isRegeneratingCode}
                  className="shadow-sm"
                >
                  {isRegeneratingCode ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                  Regenerar
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 gap-2 h-auto md:grid-cols-5 lg:grid-cols-5 lg:h-10 bg-muted/50 p-1 rounded-lg">
          <TabsTrigger value="overview" className="text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md"><User className="mr-2 h-4 w-4 text-blue-500" />Visão Geral</TabsTrigger>
          <TabsTrigger value="missions" className="text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md"><Target className="mr-2 h-4 w-4 text-red-500" />Central de Missões</TabsTrigger>
          <TabsTrigger value="rewards" className="text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md"><Gift className="mr-2 h-4 w-4 text-green-500" />Recompensas</TabsTrigger>
          <TabsTrigger value="badges" className="text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md"><Medal className="mr-2 h-4 w-4 text-purple-500" />Conquistas</TabsTrigger>
          <TabsTrigger value="edit" className="text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md"><Edit3 className="mr-2 h-4 w-4 text-orange-500" />Editar Perfil</TabsTrigger>
        </TabsList>
        
        <div className="mt-4">
          <TabsContent value="overview" className="space-y-6">
             <Card className="shadow-md">
              <CardHeader>
                <CardTitle className="text-lg">Progresso para o Próximo Nível</CardTitle>
                <CardDescription>
                  {child.xp} / {xpForNextLevel} XP
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Progress value={progressPercentage} className="h-4" aria-label={`${progressPercentage.toFixed(0)}% do progresso de XP`} />
                <p className="text-right text-sm text-muted-foreground mt-2">
                  Faltam {xpRemaining > 0 ? xpRemaining : 0} XP para o próximo nível!
                </p>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="shadow-sm flex flex-col">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Missões Concluídas</CardTitle>
                  <CheckSquare className="h-5 w-5 text-green-500" />
                </CardHeader>
                <CardContent className="flex-grow">
                  <div className="text-2xl font-bold">{stats.completedMissions}</div>
                  <p className="text-xs text-muted-foreground">Total de missões finalizadas</p>
                </CardContent>
                <CardFooter>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => setActiveTab('missions')}
                  >
                    Explorar Central de Missões
                  </Button>
                </CardFooter>
              </Card>
              <Card className="shadow-sm flex flex-col">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total de Estrelas Ganhas</CardTitle>
                  <StarIcon className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                </CardHeader>
                <CardContent className="flex-grow">
                  <div className="text-2xl font-bold">{stats.starsEarned}</div>
                  <p className="text-xs text-muted-foreground">Acumuladas com missões</p>
                </CardContent>
                 <CardFooter>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => setActiveTab('missions')}
                  >
                    Ver Histórico de Ganhos
                  </Button>
                </CardFooter>
              </Card>
              <Card className="shadow-sm flex flex-col">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Recompensas Resgatadas</CardTitle>
                  <Trophy className="h-5 w-5 text-orange-500" />
                </CardHeader>
                <CardContent className="flex-grow">
                  <div className="text-2xl font-bold">{stats.rewardsRedeemed}</div>
                  <p className="text-xs text-muted-foreground">Total de prêmios conquistados</p>
                </CardContent>
                <CardFooter>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      setActiveTab('rewards');
                      setInstanceStatusFilter('redeemed');
                    }}
                  >
                    Explorar Recompensas
                  </Button>
                </CardFooter>
              </Card>
              <Card className="shadow-sm flex flex-col">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Conquistas Desbloqueadas</CardTitle>
                  <Medal className="h-5 w-5 text-blue-500" />
                </CardHeader>
                <CardContent className="flex-grow">
                  <div className="text-2xl font-bold">{stats.earnedBadges}</div>
                  <p className="text-xs text-muted-foreground">Total de conquistas desbloqueadas</p>
                </CardContent>
                <CardFooter>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => setActiveTab('badges')}
                  >
                    Ver Mural de Conquistas
                  </Button>
                </CardFooter>
              </Card>
            </div>
            
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle>Atividades Recentes</CardTitle>
                <CardDescription>O histórico das últimas conquistas de {child.name}.</CardDescription>
              </CardHeader>
              <CardContent>
                {activities.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    <Clock className="h-10 w-10 mx-auto mb-2" />
                    Nenhuma atividade recente registrada.
                  </div>
                ) : (
                  <ul className="space-y-4">
                    {activities.map((activity, index) => {
                      const completedDate = activity.completedAt.toDate();
                      return (
                        <Fragment key={activity.id + completedDate.getTime()}>
                          <li className="flex items-start gap-4">
                            {activity.type === 'mission' ? (
                               <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full">
                                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                              </div>
                            ) : (
                              <div className="p-2 bg-yellow-100 dark:bg-yellow-800/30 rounded-full">
                                <Trophy className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                              </div>
                            )}
                            <div className="grid gap-1 flex-grow">
                              <p className="font-semibold">{activity.title}</p>
                              <p className="text-sm text-muted-foreground">
                                {activity.type === 'mission' ?
                                    `Concluída (ref. a ${format(activity.scheduledFor, 'dd/MM/yyyy')})`
                                    : `Custo: ${activity.starsCost} Estrelas`
                                }
                              </p>
                              <p className="text-xs text-muted-foreground capitalize">
                                {formatDistanceToNowStrict(completedDate, { locale: ptBR, addSuffix: true })}
                              </p>
                            </div>
                          </li>
                          {index < activities.length - 1 && <Separator />}
                        </Fragment>
                      );
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="missions">
            <Card className="shadow-md">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Central de Missões de {child.name}</CardTitle>
                            <CardDescription>Acompanhe, aprove ou atribua novas missões para {child.name}.</CardDescription>
                        </div>
                        <Button className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => setIsAddMissionDialogOpen(true)}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Nova Missão
                        </Button>
                    </div>
                     <div className="pt-4">
                        <Label className="text-sm font-medium text-muted-foreground">Filtrar por Status</Label>
                        <RadioGroup
                            value={missionStatusFilter}
                            onValueChange={(v) => setMissionStatusFilter(v as 'pending' | 'completed')}
                            className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-2"
                        >
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="pending" id="filter-pending-missions" />
                                <Label htmlFor="filter-pending-missions" className="cursor-pointer font-normal">Pendentes</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="completed" id="filter-completed-missions" />
                                <Label htmlFor="filter-completed-missions" className="cursor-pointer font-normal">Concluídas</Label>
                            </div>
                        </RadioGroup>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    {missionStatusFilter === 'pending' && (
                        <>
                          {pendingMissions.length === 0 ? (
                            <div className="text-center py-10 border-2 border-dashed border-muted-foreground/30 rounded-lg">
                                <PackageSearch className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
                                <p className="text-lg text-muted-foreground">Nenhuma missão pendente para {child.name}.</p>
                                <p className="text-sm text-muted-foreground mt-1">Clique em "Adicionar Nova Missão" para começar a jornada!</p>
                            </div>
                          ) : (
                            <div>
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                    {pendingMissions.map(instance => renderMissionCard(instance))}
                                </div>
                            </div>
                          )}
                        </>
                    )}
                    {missionStatusFilter === 'completed' && (
                        <>
                          {completedMissions.length === 0 ? (
                             <div className="text-center py-10 border-2 border-dashed border-muted-foreground/30 rounded-lg">
                                <Trophy className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
                                <p className="text-lg text-muted-foreground">{child.name} ainda não concluiu nenhuma missão.</p>
                                <p className="text-sm text-muted-foreground mt-1">Volte para a aba "Pendentes" para ver o que falta!</p>
                            </div>
                          ) : (
                            <div>
                              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                  {completedMissions.map(instance => renderMissionCard(instance))}
                              </div>
                            </div>
                          )}
                        </>
                    )}
                  </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rewards">
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle>Recompensas Atribuídas a {child.name}</CardTitle>
                <CardDescription>Veja e gerencie as recompensas disponíveis para {child.name}.</CardDescription>
                <div className="pt-4">
                  <Label className="text-sm font-medium text-muted-foreground">Filtrar por Status da Recompensa:</Label>
                  <RadioGroup
                    value={instanceStatusFilter}
                    onValueChange={(value) => setInstanceStatusFilter(value as 'all' | 'active' | 'redeemed' | 'disabled')}
                    className="flex flex-wrap gap-x-4 gap-y-2 pt-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="all" id={`instance-filter-all-${childId}`} />
                      <Label htmlFor={`instance-filter-all-${childId}`} className="cursor-pointer hover:text-primary text-sm font-normal">Todas</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="active" id={`instance-filter-active-${childId}`} />
                      <Label htmlFor={`instance-filter-active-${childId}`} className="cursor-pointer hover:text-primary text-sm font-normal">Ativas</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="redeemed" id={`instance-filter-redeemed-${childId}`} />
                      <Label htmlFor={`instance-filter-redeemed-${childId}`} className="cursor-pointer hover:text-primary text-sm font-normal">Resgatadas</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="disabled" id={`instance-filter-disabled-${childId}`} />
                      <Label htmlFor={`instance-filter-disabled-${childId}`} className="cursor-pointer hover:text-primary text-sm font-normal">Inativas</Label>
                    </div>
                  </RadioGroup>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button onClick={() => router.push('/dashboard/rewards')} variant="outline" className="mb-4 shadow-sm">
                  <ExternalLink className="mr-2 h-4 w-4" /> Ir para o Catálogo (Atribuir Novas)
                </Button>
                {filteredChildRewards.length === 0 ? (
                  <div className="text-center py-10 border-2 border-dashed border-muted-foreground/30 rounded-lg">
                    <PackageSearch className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
                    <p className="text-lg text-muted-foreground">
                      {childRewards.length === 0 
                        ? `${child.name} ainda não tem recompensas atribuídas.`
                        : `Nenhuma recompensa encontrada com o status "${getRewardStatusText(instanceToManage?.status || 'active')}".`
                      }
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {childRewards.length === 0 
                        ? 'Vá ao catálogo para atribuir algumas!'
                        : 'Tente um filtro diferente ou verifique o catálogo.'
                      }
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {filteredChildRewards.map((instance) => {
                      const categoryDetails = getCategoryDetails(instance.category);
                      const CategoryIconComponent = categoryDetails?.icon;
                      return (
                        <Card key={instance.id} className="shadow-sm hover:shadow-md transition-shadow flex flex-col">
                          <CardHeader>
                            <div className="flex justify-between items-start">
                              <CardTitle className="text-lg">{instance.title}</CardTitle>
                              <Badge variant={getRewardStatusBadgeVariant(instance.status)} className="capitalize text-xs">
                                {getRewardStatusText(instance.status)}
                              </Badge>
                            </div>
                            {instance.description && <CardDescription className="text-xs pt-1 line-clamp-2">{instance.description}</CardDescription>}
                          </CardHeader>
                          <CardContent className="space-y-2 flex-grow text-sm">
                            {categoryDetails && (
                              <div className="flex items-center">
                                 <span className={`mr-2 p-1 rounded-full ${categoryDetails.colorClasses.split(' ')[0]}`}>
                                  {CategoryIconComponent && <CategoryIconComponent className={`h-4 w-4 ${categoryDetails.colorClasses.split(' ')[1]}`} />}
                                 </span>
                                <span className={`px-2 py-0.5 rounded-full text-xs border ${categoryDetails.colorClasses}`}>
                                  {categoryDetails.label}
                                </span>
                              </div>
                            )}
                            <div className="flex items-center text-muted-foreground">
                              <StarIcon className="h-4 w-4 mr-1.5 text-yellow-400 fill-yellow-400" />
                              Custo: {instance.starsCost} estrelas
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Atribuída em: {getDateObject(instance.assignedAt)?.toLocaleDateString('pt-BR')}
                            </p>
                            {instance.status === 'redeemed' && instance.redeemedAt && (
                              <p className="text-xs text-green-600 font-medium">
                                Resgatada em: {getDateObject(instance.redeemedAt)?.toLocaleDateString('pt-BR')}
                              </p>
                            )}
                          </CardContent>
                          <CardFooter>
                            {instance.status !== 'redeemed' ? (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="outline" size="sm" className="w-full shadow-sm" disabled={isDeleting}>
                                    <MoreHorizontal className="mr-2 h-4 w-4" /> Ações
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56">
                                  <DropdownMenuLabel>Gerenciar para {child.name}</DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  {instance.status === 'active' && (
                                    <>
                                      <DropdownMenuItem onClick={() => { setInstanceToManage(instance); setIsRedeemConfirmOpen(true); }} disabled={isDeleting}>
                                        <CheckCircle className="mr-2 h-4 w-4 text-green-500" /> Marcar como Resgatada
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => handleToggleInstanceStatus(instance, 'disabled')} disabled={isDeleting}>
                                        <XCircle className="mr-2 h-4 w-4 text-orange-500" /> Tornar Inativa para {child.name}
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                  {instance.status === 'disabled' && (
                                    <DropdownMenuItem onClick={() => handleToggleInstanceStatus(instance, 'active')} disabled={isDeleting}>
                                      <CheckCircle className="mr-2 h-4 w-4 text-green-500" /> Reativar para {child.name}
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem 
                                    onClick={() => { setInstanceToManage(instance); setIsDeleteInstanceConfirmOpen(true); }} 
                                    className="text-destructive focus:text-destructive-foreground focus:bg-destructive"
                                    disabled={isDeleting}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" /> Remover Atribuição
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            ) : (
                              <Button variant="ghost" size="sm" className="w-full text-green-600" disabled>
                                <CheckCircle className="mr-2 h-4 w-4" /> Recompensa Já Resgatada
                              </Button>
                            )}
                          </CardFooter>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="badges" className="space-y-6">
            <Dialog open={isAboutBadgesOpen} onOpenChange={setIsAboutBadgesOpen}>
              <Card className="shadow-md">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Mural de Conquistas de {child.name}</CardTitle>
                            <CardDescription>Todas as conquistas heroicas e troféus especiais ganhos na jornada.</CardDescription>
                        </div>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Info className="mr-2 h-4 w-4" /> Sobre Conquistas
                          </Button>
                        </DialogTrigger>
                    </div>
                </CardHeader>
                <CardContent className="space-y-8">
                  <Dialog open={!!selectedBadge} onOpenChange={(isOpen) => !isOpen && setSelectedBadge(null)}>
                    {predefinedBadgeCategories.map((category, index) => (
                      <Fragment key={category.title}>
                        {index > 0 && <Separator />}
                        <div>
                          <h3 className="text-xl font-headline mt-4 mb-4">{category.title}</h3>
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
                            {category.items.map((badge) => {
                              const isEarned = child.earnedBadgeIds?.includes(badge.id);
                              return (
                                <DialogTrigger asChild key={badge.id} onClick={() => setSelectedBadge(badge)}>
                                  <div className={cn(
                                    "flex flex-col items-center justify-start text-center gap-2 p-4 border rounded-xl transition-all duration-300 transform hover:-translate-y-1 cursor-pointer relative overflow-hidden",
                                    isEarned ? 'shadow-lg bg-card' : 'bg-muted/30'
                                  )}>
                                      {isEarned ? (
                                        <Medal className="absolute top-2 right-2 h-6 w-6 text-amber-500 fill-amber-400 drop-shadow-lg" />
                                      ) : (
                                        <Lock className="absolute top-3 right-3 h-5 w-5 text-muted-foreground/60" />
                                      )}
                                      <div className={cn(
                                        "w-16 h-16 rounded-full flex items-center justify-center shadow-inner relative",
                                        isEarned ? badge.color : 'bg-gray-400 dark:bg-gray-700'
                                      )} style={isEarned ? { backgroundColor: badge.color } : {}}>
                                          <badge.icon className={cn(
                                              "h-9 w-9 text-white",
                                              !isEarned && "opacity-30"
                                          )} />
                                      </div>
                                      <div className="flex-grow h-24 flex flex-col justify-center">
                                          <p className={cn(
                                              "text-sm font-semibold",
                                              isEarned ? 'text-foreground' : 'text-muted-foreground'
                                          )}>{badge.title}</p>
                                          <p className={cn(
                                              "text-xs text-muted-foreground mt-1",
                                              !isEarned && "opacity-70"
                                          )}>
                                              {badge.description}
                                          </p>
                                      </div>
                                  </div>
                                </DialogTrigger>
                              );
                            })}
                          </div>
                        </div>
                      </Fragment>
                    ))}
                    {selectedBadge && (
                      <DialogContent>
                        <DialogHeader className="items-center text-center">
                          <div className="p-4 rounded-full mb-4" style={{ backgroundColor: selectedBadge.color }}>
                              <selectedBadge.icon className="h-12 w-12 text-white" />
                          </div>
                          <DialogTitle className="text-2xl font-headline">{selectedBadge.title}</DialogTitle>
                          <DialogDescription className="text-base text-muted-foreground pt-2">
                            {selectedBadge.description}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="text-center pt-2">
                          {child.earnedBadgeIds?.includes(selectedBadge.id) ? (
                              <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-300 text-sm">
                                  <CheckCircle className="mr-2 h-4 w-4"/>Conquistado!
                              </Badge>
                          ) : (
                              <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-300 text-sm">
                                  Ainda não conquistado!
                              </Badge>
                          )}
                        </div>
                        <DialogFooter>
                            <DialogClose asChild>
                                <Button variant="outline" className="w-full">Fechar</Button>
                            </DialogClose>
                        </DialogFooter>
                      </DialogContent>
                    )}
                  </Dialog>
                </CardContent>
              </Card>

              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-headline flex items-center gap-2">
                        <Medal className="h-6 w-6 text-primary" />
                        O Mural de Conquistas
                    </DialogTitle>
                    <DialogDescription className="pt-2">
                        As conquistas celebram a jornada do seu heroi, reconhecendo desde os primeiros passos até a maestria.
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[60vh] -mx-6 px-6">
                    <div className="space-y-4 text-sm text-muted-foreground pb-4 pr-1">
                        <p>As conquistas no Mini Herois são como troféus especiais que celebram todo tipo de conquista heroica, indo além das recompensas do dia a dia. Elas marcam momentos importantes na jornada da criança, desde o primeiro passo até a maestria, e são divididas em categorias para reconhecer diferentes tipos de esforço.</p>
                        
                        <h4 className="font-bold text-foreground pt-2">Iniciação e Primeiros Passos</h4>
                        <p>Estas são as conquistas de boas-vindas! Elas celebram os primeiros momentos da jornada de um heroi, incentivando-o a começar com o pé direito.</p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li><strong>Heroi Novato:</strong> Conquistada ao completar a primeira missão.</li>
                            <li><strong>Defensor do Sorriso:</strong> Ganha ao fazer a missão "Escovar os dentes" pela primeira vez.</li>
                            <li><strong>Guardião do Descanso:</strong> Recebida ao arrumar a cama pela primeira vez.</li>
                        </ul>

                        <h4 className="font-bold text-foreground pt-2">Consistência e Hábitos</h4>
                        <p>Aqui, o que vale é a dedicação! Estas conquistas recompensam a criação de rotinas e a persistência, que são a base para a formação de hábitos sólidos.</p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li><strong>Guardião da Rotina:</strong> Para quem completa a mesma missão por 7 dias seguidos.</li>
                            <li><strong>Semana Perfeita:</strong> Um grande feito! Para quem completa todas as missões agendadas durante 7 dias consecutivos.</li>
                            <li><strong>Mestre da Persistência:</strong> Uma conquista rara para quem completa a mesma missão por 30 dias seguidos.</li>
                        </ul>

                        <h4 className="font-bold text-foreground pt-2">Maestria e Progresso</h4>
                        <p>Estas conquistas marcam os grandes marcos de progresso, celebrando o acúmulo de experiência e recompensas ao longo do tempo.</p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li><strong>Caçador de Estrelas:</strong> Por acumular um total de 100 estrelas (⭐).</li>
                            <li><strong>Heroi em Ascensão:</strong> Ao atingir o Nível 5 de experiência (XP).</li>
                            <li><strong>Campeão dos Herois:</strong> Uma grande honra, recebida ao alcançar o Nível 10.</li>
                        </ul>
                        
                        <h4 className="font-bold text-foreground pt-2">Exploração e Diversidade</h4>
                        <p>Estas incentivam a curiosidade e a versatilidade, motivando a criança a sair da zona de conforto e experimentar novas responsabilidades.</p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li><strong>Heroi Versátil:</strong> Para quem completa missões de pelo menos 3 categorias diferentes (ex: Casa, Escola e Saúde).</li>
                            <li><strong>Aventureiro Nato:</strong> Desbloqueada ao completar uma missão das categorias Social ou Ambiental pela primeira vez.</li>
                        </ul>

                        <p className="pt-2">Essencialmente, o sistema de conquistas cria um "mural de conquistas" que mostra o crescimento e a evolução do Mini Heroi, valorizando não apenas a conclusão das tarefas, mas também a dedicação, a variedade e o progresso na jornada.</p>
                    </div>
                </ScrollArea>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="outline" className="w-full">Entendido!</Button>
                    </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>
          <TabsContent value="edit">
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle>Editar Perfil de {child.name}</CardTitle>
                <CardDescription>Atualize as informações da criança e configurações.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <EditChildProfileForm 
                  child={child} 
                  onProfileUpdate={handleProfileUpdate}
                  onDeleteProfile={handleDeleteProfile}
                  isDeleting={isDeleting}
                  onResetProgress={handleResetProgress}
                  isResetting={isResettingProgress}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
      
      {child && (
        <AddMissionDialog 
            child={child} 
            isOpen={isAddMissionDialogOpen}
            onOpenChange={setIsAddMissionDialogOpen}
            onMissionAdded={fetchData}
        />
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

      {/* Redeem Confirmation Dialog */}
      {instanceToManage && isRedeemConfirmOpen && child && (
        <AlertDialog open={isRedeemConfirmOpen} onOpenChange={setIsRedeemConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Resgate de Recompensa</AlertDialogTitle>
              <AlertDialogDescription>
                Você tem certeza que deseja marcar a recompensa "{instanceToManage.title}" ({instanceToManage.starsCost} estrelas) como resgatada por {child.name}? Isso deduzirá as estrelas do saldo de {child.name}.
                <br/>
                Saldo atual de estrelas de {child.name}: {child.stars}.
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
      
      {/* Delete Instance Confirmation Dialog */}
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
    </div>
  );
}
    

    

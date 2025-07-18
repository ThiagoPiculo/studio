

"use client";

import { useEffect, useState, useMemo, useCallback, Fragment, Suspense } from 'react';
import { useParams, useRouter, useSearchParams, usePathname } from 'next/navigation';
import { regenerateChildAccessCode, deleteChildProfile, updateChildRewardInstance, deleteChildRewardInstance, updateChildProfile, getMissionInstancesByChild, deleteMissionInstance, reactivateMissionInstance, getChildRewardInstancesByChild, resetChildProgress, redeemChildRewardInstance, getChildProfileById, checkAndAwardBadges, recalculateAndSyncBadges, getSchoolScheduleForChild, moveChildToNewContext } from '@/lib/firebase/firestore';
import type { ChildProfile, ChildRewardInstance, RewardCategoryDetails, MissionInstance, MissionCategoryDetails, SchoolScheduleEntry } from '@/lib/types';
import { rewardCategories, missionCategories, weekdays, weekdayLabels } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, User, Star as StarIcon, Edit3, Loader2, Trash2, RefreshCw, Gift, EllipsisVertical, CheckCircle, XCircle, ExternalLink, MoreHorizontal, Info, CheckSquare, Trophy, Clock, BadgeCheck, PlusCircle, CalendarDays, CheckCircle2, Repeat, Undo2, Medal, RotateCcw, Target, Lock, Sun, CloudSun, Moon, NotebookPen, Move } from 'lucide-react';
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
import { format, differenceInYears, isSameDay, parse, formatDistanceToNowStrict, startOfDay, differenceInDays, eachDayOfInterval, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import { formatRecurrenceSummary, isMissionScheduledForDate, getDateObject, getPeriodOfDay, isMissionCompletedForDate } from '@/lib/calendar-utils';
import { predefinedBadgeCategories, type Badge as BadgeType } from '@/lib/badges';
import { cn } from '@/lib/utils';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useFamily } from '@/contexts/FamilyContext';
import { useUserRole } from '@/hooks/useUserRole';
import { Select, SelectItem, SelectTrigger, SelectContent, SelectValue } from '@/components/ui/select';
import { AssignMissionDialog } from '@/components/dashboard/missions/AssignMissionDialog';

type Activity = 
    | (MissionInstance & { type: 'mission', scheduledFor: Date, completedAt: Timestamp })
    | (ChildRewardInstance & { type: 'reward', completedAt: Timestamp });


function ManageChildPageContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { toast } = useToast();
  const { user } = useAuth();
  const { currentContext, availableContexts, setCurrentContext } = useFamily();
  const { canEdit, isLoading: isRoleLoading } = useUserRole();
  const childId = params.childId as string;

  // Primary data states
  const [child, setChild] = useState<ChildProfile | null>(null);
  const [missionInstances, setMissionInstances] = useState<MissionInstance[]>([]);
  const [childRewards, setChildRewards] = useState<ChildRewardInstance[]>([]);
  const [schoolSchedule, setSchoolSchedule] = useState<SchoolScheduleEntry[]>([]);
  
  // Loading and action states
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRegeneratingCode, setIsRegeneratingCode] = useState(false);
  const [isMoveDialogOpen, setIsMoveDialogOpen] = useState(false);
  const [selectedMoveContext, setSelectedMoveContext] = useState<string>('');
  const [isMoving, setIsMoving] = useState(false);
  
  const activeTab = searchParams.get('tab') || 'overview';
  
  const handleTabChange = (newTab: string) => {
    const current = new URLSearchParams(searchParams.toString());
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
  const [isDeleteInstanceConfirmOpen, setIsDeleteInstanceConfirmOpen] = useState(false);
  const [instanceStatusFilter, setInstanceStatusFilter] = useState<'all' | 'active' | 'redeemed' | 'disabled'>('all');
  
  // Badge states
  const [selectedBadge, setSelectedBadge] = useState<BadgeType | null>(null);
  const [isResettingProgress, setIsResettingProgress] = useState(false);
  const [isAboutBadgesOpen, setIsAboutBadgesOpen] = useState(false);
  const [badgeProgress, setBadgeProgress] = useState({
    longestSingleMissionStreak: 0,
    longestPerfectStreak: 0,
    missionWithLongestStreak: null as MissionInstance | null,
  });
  const [isCalculatingProgress, setIsCalculatingProgress] = useState(true);


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
      const profile = await getChildProfileById(childId);
      
      // Context validation
      const childContextId = profile?.familyId || 'my-space';
      if (profile && childContextId !== currentContext) {
        toast({
          title: "Contexto Atualizado",
          description: `O heroi ${profile.name} não pertence a este espaço. Redirecionando...`,
          variant: "default",
        });
        router.push('/dashboard/heroes');
        return;
      }
      
      const [missions, rewards, schedule] = await Promise.all([
        getMissionInstancesByChild(childId),
        getChildRewardInstancesByChild(childId),
        getSchoolScheduleForChild(childId),
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
        setSchoolSchedule(schedule.sort((a,b) => a.startTime.localeCompare(b.startTime)));
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
  }, [childId, router, toast, currentContext]);


  // Initial data fetch and context validation effect
  useEffect(() => {
    if (childId) {
      fetchData();
    } else {
      router.push('/dashboard/heroes');
    }
  }, [childId, fetchData, currentContext]); // Added currentContext to re-trigger on context change
  
  useEffect(() => {
    if (!missionInstances || missionInstances.length === 0) {
      setIsCalculatingProgress(false);
      return;
    }
    
    setIsCalculatingProgress(true);

    // SINGLE MISSION STREAK CALC
    let overallLongestStreak = 0;
    let missionWithStreak: MissionInstance | null = null;
    missionInstances.forEach(instance => {
        const completionDates = Object.keys(instance.completionLog || {}).map(dateStr => startOfDay(new Date(dateStr))).sort((a, b) => a.getTime() - b.getTime());
        if (completionDates.length === 0) return;

        let currentStreak = 1;
        let longestStreakForThisMission = 1;
        for (let i = 1; i < completionDates.length; i++) {
            if (differenceInDays(completionDates[i], completionDates[i-1]) === 1) {
                currentStreak++;
            } else if (differenceInDays(completionDates[i], completionDates[i-1]) > 1) {
                currentStreak = 1; // Reset if there's a gap
            }
            if (currentStreak > longestStreakForThisMission) {
                longestStreakForThisMission = currentStreak;
            }
        }
        if (longestStreakForThisMission > overallLongestStreak) {
            overallLongestStreak = longestStreakForThisMission;
            missionWithStreak = instance;
        }
    });

    // PERFECT STREAK CALC
    let longestPerfectStreak = 0;
    let currentPerfectStreak = 0;
    const today = startOfDay(new Date());

    const allCompletionDates = new Set(missionInstances.flatMap(inst => Object.keys(inst.completionLog || {})).map(d => startOfDay(new Date(d))));
    if (allCompletionDates.size > 0) {
        const sortedDates = Array.from(allCompletionDates).sort((a, b) => a.getTime() - b.getTime());
        const firstDate = sortedDates[0];
        const daysInInterval = eachDayOfInterval({ start: firstDate, end: today });

        for (const checkDate of daysInInterval) {
            const scheduledMissions = missionInstances.filter(inst => isMissionScheduledForDate(inst, checkDate));
            if (scheduledMissions.length > 0) {
                const allCompleted = scheduledMissions.every(inst => isMissionCompletedForDate(inst, checkDate));
                if (allCompleted) {
                    currentPerfectStreak++;
                } else {
                    if (currentPerfectStreak > longestPerfectStreak) {
                        longestPerfectStreak = currentPerfectStreak;
                    }
                    currentPerfectStreak = 0;
                }
            }
        }
        if (currentPerfectStreak > longestPerfectStreak) {
            longestPerfectStreak = currentPerfectStreak;
        }
    }

    setBadgeProgress({
        longestSingleMissionStreak: overallLongestStreak,
        longestPerfectStreak: longestPerfectStreak,
        missionWithLongestStreak: missionWithStreak,
    });
    
    setIsCalculatingProgress(false);
  }, [missionInstances]);

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
    // If the mission has no schedule, open the edit dialog instead.
    if (!instance.isRecurring && !instance.dueDate) {
        toast({ title: "Missão sem agendamento", description: "Defina um prazo ou uma recorrência para esta missão." });
        setInstanceToEdit(instance);
        setIsAssignMissionDialogOpen(true);
        return;
    }

    const today = new Date();
    let targetDate: Date | null | undefined = null;

    // Priority 1: Check if it's scheduled for today
    if (isMissionScheduledForDate(instance, today)) {
        targetDate = today;
    }

    // Priority 2: Find the next future occurrence
    if (!targetDate) {
        const futureDates = eachDayOfInterval({ start: addDays(today, 1), end: addDays(today, 90) });
        for (const futureDate of futureDates) {
            if (isMissionScheduledForDate(instance, futureDate)) {
                targetDate = futureDate;
                break;
            }
        }
    }

    // Priority 3: Find the most recent past occurrence (within last 30 days)
    if (!targetDate) {
        const pastDates = eachDayOfInterval({ start: subDays(today, 30), end: subDays(today, 1) }).reverse();
        for (const pastDate of pastDates) {
            if (isMissionScheduledForDate(instance, pastDate)) {
                targetDate = pastDate;
                break;
            }
        }
    }

    // Final fallback to start/due date if no occurrence is found in the near past/future
    if (!targetDate) {
        targetDate = instance.startDate?.toDate() || instance.dueDate?.toDate();
    }
    
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
    if (!child || !user) return;
    setIsResettingProgress(true);
    try {
      await resetChildProgress(user.uid, child.id);
      await fetchData(); // Re-fetch all data to update the UI
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
      const newFamilyId = selectedMoveContext === 'my-space' ? null : selectedMoveContext;
      await moveChildToNewContext(child.id, newFamilyId, user.uid);
      
      toast({
        title: 'Heroi Movido com Sucesso!',
        description: `${child.name} agora pertence a um novo espaço.`,
      });
      // Update global context to reflect the change
      setCurrentContext(selectedMoveContext);
      onProfileUpdate(); // Refetch data on parent page
    } catch (error: any) {
      console.error("Error moving child profile:", error);
      toast({ title: 'Erro ao Mover', description: error.message, variant: 'destructive' });
    } finally {
      setIsMoving(false);
    }
  };

  
  const handleDeleteMissionInstance = async () => {
    if (!missionToDelete || !user) return;
    setIsDeleting(true);
    try {
      await deleteMissionInstance(user, missionToDelete.id);
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
    if (!instanceToManage || !child || !user) return;
    setIsDeleting(true);
    try {
      const actor = { id: user.uid, name: user.name };
      await redeemChildRewardInstance(instanceToManage.id, child.id, actor);
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
    if (!instanceToManage || !user) return;
    setIsDeleting(true);
    try {
      await deleteChildRewardInstance(user, instanceToManage.id);
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
        // Pending missions first
        if (a.status === 'pending' && b.status !== 'pending') return -1;
        if (a.status !== 'pending' && b.status === 'pending') return 1;
        
        // Then by date
        const dateA = getDateObject(a.isRecurring ? a.startDate : a.dueDate) || new Date(0);
        const dateB = getDateObject(b.isRecurring ? b.startDate : b.dueDate) || new Date(0);
        return dateA.getTime() - dateB.getTime();
      });
  }, [missionInstances, recurrenceFilter]);


  const { progressPercentage, xpRemaining, xpForNextLevel } = useMemo(() => 
    child ? calculateXpDetails(child.level, child.xp) : { progressPercentage: 0, xpRemaining: 0, xpForNextLevel: 0 },
    [child]
  );

  const renderBadge = (badge: BadgeType) => {
    if (!child) return null;
    const isEarned = child.earnedBadgeIds?.includes(badge.id);
    const hasProgress = !!badge.progressType && !!badge.goal;

    let currentProgress = 0;
    let progressLabel = '';

    if (hasProgress && !isEarned) {
      switch (badge.progressType) {
        case 'singleMissionStreak':
          currentProgress = badgeProgress.longestSingleMissionStreak;
          progressLabel = 'dias';
          break;
        case 'perfectStreak':
          currentProgress = badgeProgress.longestPerfectStreak;
          progressLabel = 'dias';
          break;
        case 'stars':
          currentProgress = child.stars;
          progressLabel = 'estrelas';
          break;
        case 'level':
          currentProgress = child.level;
          progressLabel = 'nível';
          break;
      }
    }
    const progressPercentage = (badge.goal && badge.goal > 0) ? (currentProgress / badge.goal) * 100 : 0;

    return (
      <DialogTrigger asChild key={badge.id} onClick={() => setSelectedBadge(badge)}>
        <div className={cn(
          "flex flex-col items-center justify-start text-center gap-2 p-4 border rounded-xl transition-all duration-300 transform hover:-translate-y-1 cursor-pointer relative overflow-hidden",
          isEarned ? 'shadow-lg bg-card' : 'bg-muted/30'
        )}>
            {isEarned ? (
              <Medal
                className="absolute top-1.5 right-1.5 h-8 w-8 drop-shadow-lg"
                color={badge.color}
              />
            ) : (
              <Lock className="absolute top-3 right-3 h-5 w-5 text-destructive" />
            )}
            <div className={cn(
              "w-16 h-16 rounded-full flex items-center justify-center shadow-inner relative",
              !isEarned && 'bg-gray-400 dark:bg-gray-700'
            )} style={isEarned ? { backgroundColor: badge.color } : {}}>
                <badge.icon className={cn(
                    "h-9 w-9 text-white",
                    !isEarned && "opacity-30"
                )} />
            </div>
            <div className="flex-grow h-24 flex flex-col justify-center w-full">
                <p className={cn(
                    "text-sm font-semibold",
                    isEarned ? 'text-foreground' : 'text-muted-foreground'
                )}>{badge.title}</p>
                
                {hasProgress && !isEarned ? (
                  <div className="mt-2 space-y-1">
                    {isCalculatingProgress && (badge.progressType === 'singleMissionStreak' || badge.progressType === 'perfectStreak') ? (
                      <>
                        <Skeleton className="h-2 w-full" />
                        <Skeleton className="h-3 w-1/2 mx-auto" />
                      </>
                    ) : (
                      <>
                        <Progress value={progressPercentage} className="h-2" />
                        <p className="text-xs text-muted-foreground">{currentProgress} de {badge.goal} {progressLabel}</p>
                      </>
                    )}
                  </div>
                ) : (
                  <p className={cn(
                      "text-xs text-muted-foreground mt-1",
                      !isEarned && "opacity-70"
                  )}>
                      {badge.description}
                  </p>
                )}
            </div>
        </div>
      </DialogTrigger>
    );
  };
  
  const moveTargetContexts = useMemo(() => {
    return availableContexts.filter(c => c.id !== (child?.familyId || 'my-space'));
  }, [availableContexts, child]);

  if (isLoading || isRoleLoading) {
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
      
    const scheduleDate = getDateObject(instance.isRecurring ? instance.startDate : instance.dueDate);
    const time = scheduleDate ? format(scheduleDate, 'HH:mm') : null;
    const period = scheduleDate ? getPeriodOfDay(scheduleDate) : null;
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
                                    disabled={isDeleting || !canEdit}
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
      <Card className="shadow-xl overflow-hidden">
        <div className="p-4 bg-gradient-to-br from-primary/10 via-background to-accent/5 relative">
            <div className="absolute top-2 right-2 z-10 hidden sm:flex flex-col items-end gap-1 flex-shrink-0">
                <span className="text-sm text-muted-foreground align-middle">
                    Chave Secreta do Heroi:
                </span>
                <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-accent tracking-wider bg-accent/10 px-2 py-1 rounded-md shadow-sm">
                      {child.accessCode}
                    </span>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={handleRegenerateAccessCode} 
                            disabled={isRegeneratingCode || !canEdit}
                            className="shadow-sm h-9 w-9"
                          >
                            {isRegeneratingCode ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Regenerar Chave Secreta</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
              <Avatar
                className="h-24 w-24 text-4xl shadow-md ring-4 ring-offset-2 ring-[var(--ring-color)] ring-offset-background flex-shrink-0"
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
              <div className="flex-grow">
                  <CardTitle className="text-3xl font-headline text-primary">{child.name}</CardTitle>
                  <CardDescription className="text-base mt-1">
                      {age !== null ? `Idade: ${age} Anos` : 'Idade não informada'}
                  </CardDescription>
              </div>
            </div>
            
            <div className="flex sm:hidden items-center justify-center gap-2 mt-4">
              <span className="text-sm text-muted-foreground align-middle">
                  Chave Secreta:
              </span>
              <span className="text-lg font-bold text-accent tracking-wider bg-accent/10 px-2 py-1 rounded-md shadow-sm">
                  {child.accessCode}
              </span>
              <TooltipProvider>
                  <Tooltip>
                  <TooltipTrigger asChild>
                      <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={handleRegenerateAccessCode} 
                      disabled={isRegeneratingCode || !canEdit}
                      className="shadow-sm h-9 w-9"
                      >
                      {isRegeneratingCode ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                      </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                      <p>Regenerar Chave Secreta</p>
                  </TooltipContent>
                  </Tooltip>
              </TooltipProvider>
            </div>
            
            <div className="mt-4 flex flex-col gap-4 font-semibold">
                <div className="flex items-end justify-between gap-4">
                  <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                          <StarIcon className="h-7 w-7 fill-current"/>
                          <span className="text-2xl font-bold">{child.stars}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                          <BadgeCheck className="h-7 w-7"/>
                          <span className="text-2xl font-bold">{child.xp}</span>
                          <span className="text-sm font-normal">XP</span>
                      </div>
                  </div>
                   <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-sm">Nível {child.level}</Badge>
                    </div>
                </div>
                <div className="w-full">
                    <Progress value={progressPercentage} className="h-2.5" aria-label={`${progressPercentage.toFixed(0)}% do progresso de XP`} />
                    <p className="text-xs text-muted-foreground text-right mt-1">
                        {xpRemaining} XP para o próximo nível
                    </p>
                </div>
            </div>
        </div>
      </Card>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 h-auto lg:h-10 bg-muted/50 p-1 rounded-lg">
          <TabsTrigger value="overview" className="text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md"><User className="mr-2 h-4 w-4 text-blue-500" />Visão Geral</TabsTrigger>
          <TabsTrigger value="missions" className="text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md"><Target className="mr-2 h-4 w-4 text-red-500" />Mural de Missões</TabsTrigger>
          <TabsTrigger value="rewards" className="text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md"><Gift className="mr-2 h-4 w-4 text-blue-500" />Mural de Recompensas</TabsTrigger>
          <TabsTrigger value="school-schedule" className="text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md"><NotebookPen className="mr-2 h-4 w-4 text-chart-5" />Agenda Escolar</TabsTrigger>
          <TabsTrigger value="badges" className="text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md"><Medal className="mr-2 h-4 w-4 text-purple-500" />Mural de Conquistas</TabsTrigger>
          <TabsTrigger value="edit" className="text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md" disabled={!canEdit}><Edit3 className="mr-2 h-4 w-4 text-orange-500" />Editar Perfil</TabsTrigger>
        </TabsList>
        
        <div className="mt-4">
          <TabsContent value="overview" className="space-y-6">
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="shadow-sm flex flex-col">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Missões Concluídas</CardTitle>
                    <CheckSquare className="h-5 w-5 text-green-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.completedMissions}</div>
                    <p className="text-xs text-muted-foreground">Total de missões finalizadas</p>
                  </CardContent>
                </Card>
                <Card className="shadow-sm flex flex-col">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total de Estrelas Ganhas</CardTitle>
                    <StarIcon className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.starsEarned}</div>
                    <p className="text-xs text-muted-foreground">Acumuladas com missões</p>
                  </CardContent>
                </Card>
                <Card className="shadow-sm flex flex-col">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Recompensas Resgatadas</CardTitle>
                    <Trophy className="h-5 w-5 text-orange-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.rewardsRedeemed}</div>
                    <p className="text-xs text-muted-foreground">Total de prêmios conquistados</p>
                  </CardContent>
                </Card>
                <Card className="shadow-sm flex flex-col">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Conquistas Desbloqueadas</CardTitle>
                    <Medal className="h-5 w-5 text-blue-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.earnedBadges}</div>
                    <p className="text-xs text-muted-foreground">Total de medalhas ganhas</p>
                  </CardContent>
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
                            <CardTitle className="flex items-center gap-2"><Target className="h-5 w-5 text-red-500" />Mural de Missões de {child.name}</CardTitle>
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
                        <ExternalLink className="mr-2 h-4 w-4" /> Ir para o Mural de Missões (Catálogo)
                    </Button>
                    {filteredMissions.length === 0 ? (
                      <div className="text-center py-10 border-2 border-dashed border-muted-foreground/30 rounded-lg">
                          <Target className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
                          <p className="text-lg text-muted-foreground">Nenhuma missão encontrada com os filtros atuais.</p>
                          <p className="text-sm text-muted-foreground mt-1">Tente outro filtro ou clique em "Adicionar Nova Missão" para começar a jornada!</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                          {filteredMissions.map(instance => renderMissionCard(instance))}
                      </div>
                    )}
                  </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rewards">
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle>Mural de Recompensas de {child.name}</CardTitle>
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
                  <ExternalLink className="mr-2 h-4 w-4" /> Ir para o Mural de Recompensas
                </Button>
                {filteredChildRewards.length === 0 ? (
                  <div className="text-center py-10 border-2 border-dashed border-muted-foreground/30 rounded-lg">
                    <Gift className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
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
                            {instance.status !== 'redeemed' && canEdit ? (
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
                                <CheckCircle className="mr-2 h-4 w-4" /> {instance.status === 'redeemed' ? 'Recompensa Já Resgatada' : 'Ações Indisponíveis'}
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
          <TabsContent value="school-schedule">
            <Card className="shadow-md">
                <CardHeader>
                    <CardTitle>Agenda Escolar de {child.name}</CardTitle>
                    <CardDescription>Veja o horário de aulas da semana.</CardDescription>
                    <Button asChild variant="outline" className="w-fit">
                        <Link href="/dashboard/school-schedule">
                            <Edit3 className="mr-2 h-4 w-4" /> Gerenciar Agenda Completa
                        </Link>
                    </Button>
                </CardHeader>
                <CardContent>
                    {schoolSchedule.length === 0 ? (
                        <p className="text-muted-foreground">Nenhuma aula cadastrada na agenda escolar.</p>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {weekdays.map(day => {
                                const dayEntries = schoolSchedule.filter(e => e.dayOfWeek === day);
                                if (dayEntries.length === 0) return null;
                                return (
                                    <div key={day}>
                                        <h3 className="font-semibold mb-2">{weekdayLabels[day].long}</h3>
                                        <ul className="space-y-2">
                                            {dayEntries.map(entry => (
                                                <li key={entry.id} className="p-3 rounded-md border" style={{ borderLeftColor: entry.color, borderLeftWidth: '4px' }}>
                                                    <p className="font-semibold">{entry.subject}</p>
                                                    <p className="text-sm text-muted-foreground">{entry.startTime} - {entry.endTime}</p>
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
                    {predefinedBadgeCategories.map((category, index) => {
                       if (category.title === "Consistência e Hábitos") {
                          const guardiao = category.items.filter(b => b.id.startsWith('guardiao_rotina'));
                          const semana = category.items.filter(b => b.id.startsWith('semana_perfeita'));
                          const mestre = category.items.filter(b => b.id.startsWith('mestre_persistencia'));
                          return (
                            <Fragment key={category.title}>
                                {index > 0 && <Separator />}
                                <div>
                                    <h3 className="text-xl font-headline mt-4 mb-4">{category.title}</h3>
                                    {guardiao.length > 0 && <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6 mb-6">{guardiao.map(badge => renderBadge(badge))}</div>}
                                    {semana.length > 0 && <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6 mb-6">{semana.map(badge => renderBadge(badge))}</div>}
                                    {mestre.length > 0 && <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">{mestre.map(badge => renderBadge(badge))}</div>}
                                </div>
                            </Fragment>
                          );
                       }
                       return (
                          <Fragment key={category.title}>
                            {index > 0 && <Separator />}
                            <div>
                              <h3 className="text-xl font-headline mt-4 mb-4">{category.title}</h3>
                              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
                                {category.items.map((badge) => renderBadge(badge))}
                              </div>
                            </div>
                          </Fragment>
                       );
                    })}
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
                        {selectedBadge.progressType === 'singleMissionStreak' && badgeProgress.missionWithLongestStreak && (
                          <div className="mt-2 text-center border-t pt-4">
                              <p className="text-sm text-muted-foreground">Missão com a maior sequência atual:</p>
                              <p className="font-semibold text-foreground flex items-center justify-center gap-2 mt-1">
                                  {badgeProgress.missionWithLongestStreak.emoji && <span>{badgeProgress.missionWithLongestStreak.emoji}</span>}
                                  <span>{badgeProgress.missionWithLongestStreak.title}</span>
                              </p>
                          </div>
                        )}
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
                <CardDescription>Atualize as informações do Mini Heroi e configurações.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <EditChildProfileForm 
                  child={child} 
                  onProfileUpdate={handleProfileUpdate}
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
                      <Button type="button" variant="outline" className="w-full border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => setIsMoveDialogOpen(true)} disabled={isDeleting || isResettingProgress || isMoving || moveTargetContexts.length === 0}>
                        <Move className="mr-2 h-4 w-4" />
                        Mover Heroi
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
          onAssigned={fetchData}
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
                    {context.id === 'my-space' ? 'Meu Espaço Pessoal' : `Aliança: ${context.name}`}
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

export default function ManageChildPage() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center min-h-[calc(100vh-200px)]"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>}>
            <ManageChildPageContent />
        </Suspense>
    )
}

    

    













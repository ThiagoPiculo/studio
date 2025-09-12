

"use client";

import { useEffect, useState, useMemo, useCallback, Fragment, Suspense } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { regenerateChildAccessCode, deleteChildProfile, updateChildRewardInstance, deleteChildRewardInstance, updateChildProfile, getMissionInstancesByChild, deleteMissionInstance, reactivateMissionInstance, getChildRewardInstancesByChild, resetChildProgress, redeemChildRewardInstance, getChildProfileById, checkAndAwardBadges, recalculateAndSyncBadges, getSchoolScheduleForChild, moveChildToNewContext, deleteSchoolScheduleEntry, getChildProfilesForAttribution, getFamilyMembers, getFamilyMemberships, getRewardTemplatesByOwnerOrFamily } from '@/lib/firebase/firestore';
import type { ChildProfile, ChildRewardInstance, RewardCategoryDetails, MissionInstance, MissionCategoryDetails, SchoolScheduleEntry, UserProfile, FamilyMembership, FamilyRole, RewardTemplate } from '@/lib/types';
import { rewardCategories, missionCategories, weekdays, weekdayLabels, familyRoles } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, User, Star as StarIcon, Edit3, Loader2, Trash2, RefreshCw, Gift, EllipsisVertical, CheckCircle, XCircle, ExternalLink, MoreHorizontal, Info, CheckSquare, Trophy, Clock, BadgeCheck, PlusCircle, CalendarDays, CheckCircle2, Repeat, Undo2, Medal, RotateCcw, Target, Lock, Sun, CloudSun, Moon, NotebookPen, Move, Edit, Smile, HelpCircle, Contact } from 'lucide-react';
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
import Loading from './loading';
import { formatRecurrenceSummary, isMissionScheduledForDate, getDateObject, getPeriodOfDay, isMissionCompletedForDate } from '@/lib/calendar-utils';
import { predefinedBadgeCategories, type Badge as BadgeType } from '@/lib/badges';
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

type Activity =
    | (MissionInstance & { type: 'mission', scheduledFor: Date, missionTypeLabel: string, completionLogEntry: { completedAt: string, stars: number, actorId?: string, actorName?: string } })
    | (ChildRewardInstance & { type: 'reward', completedAt: string, actorId?: string, actorName?: string });

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

function BadgeCard({ badge, child, badgeProgress, isCalculatingProgress, onClick }: { badge: BadgeType, child: ChildProfile, badgeProgress: any, isCalculatingProgress: boolean, onClick: () => void }) {
  const isEarned = child.earnedBadgeIds?.includes(badge.id);
  const hasProgress = !!badge.progressType && !!badge.goal;
  let currentProgress = 0;
  if (hasProgress && !isEarned) {
      switch (badge.progressType) {
          case 'singleMissionStreak': currentProgress = badgeProgress.longestSingleMissionStreak; break;
          case 'perfectStreak': currentProgress = badgeProgress.longestPerfectStreak; break;
          case 'stars': currentProgress = child.totalStars; break;
          case 'level': currentProgress = child.level; break;
      }
  }
  const progressPercentage = (badge.goal && badge.goal > 0) ? (currentProgress / badge.goal) * 100 : 0;

  const getProgressTypeLabel = (type: BadgeType['progressType']): string => {
    switch (type) {
      case 'singleMissionStreak':
      case 'perfectStreak': return 'dias';
      case 'stars': return 'estrelas';
      case 'level': return 'nível';
      default: return '';
    }
  };

  return (
      <div onClick={onClick} className={cn("flex flex-col items-center justify-start text-center gap-2 p-4 border rounded-xl transition-all duration-300 transform hover:-translate-y-1 cursor-pointer relative overflow-hidden", isEarned ? 'shadow-lg bg-card' : 'bg-muted/30')}>
          {isEarned ? (
              <Medal className="absolute top-1.5 right-1.5 h-8 w-8 drop-shadow-lg" style={{ color: badge.color }} />
          ) : (
              <Lock className="absolute top-3 right-3 h-5 w-5 text-destructive" />
          )}
          <div className={cn("w-16 h-16 rounded-full flex items-center justify-center shadow-inner relative", !isEarned && 'bg-gray-400 dark:bg-gray-700')} style={isEarned ? { backgroundColor: badge.color } : {}}>
              <badge.icon className={cn("h-9 w-9 text-white", !isEarned && "opacity-30")} />
          </div>
          <div className="flex-grow h-24 flex flex-col justify-center w-full">
              <p className={cn("text-sm font-semibold", isEarned ? 'text-foreground' : 'text-muted-foreground')}>{badge.title}</p>
              {hasProgress && !isEarned ? (
                  <div className="mt-2 space-y-1">
                      {isCalculatingProgress && (badge.progressType === 'singleMissionStreak' || badge.progressType === 'perfectStreak') ? (
                          <>
                              <div className="h-2 w-full animate-pulse bg-muted-foreground/20 rounded-full" />
                              <div className="h-3 w-1/2 mx-auto animate-pulse bg-muted-foreground/20 rounded-full" />
                          </>
                      ) : (
                          <>
                              <Progress value={progressPercentage} className="h-2" />
                              <p className="text-xs text-muted-foreground">{currentProgress} / {badge.goal} ({getProgressTypeLabel(badge.progressType)})</p>
                          </>
                      )}
                  </div>
              ) : (
                  <p className={cn("text-xs text-muted-foreground mt-1", !isEarned && "opacity-70")}>
                      {badge.description}
                  </p>
              )}
          </div>
      </div>
  );
}


function MuralCompletoPageContent() {
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
  const [rewardTemplates, setRewardTemplates] = useState<RewardTemplate[]>([]);
  const [schoolSchedule, setSchoolSchedule] = useState<SchoolScheduleEntry[]>([]);
  const [collaborators, setCollaborators] = useState<UserProfile[]>([]);
  const [memberships, setMemberships] = useState<FamilyMembership[]>([]);

  // Loading and action states
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRegeneratingCode, setIsRegeneratingCode] = useState(false);
  const [isMoveDialogOpen, setIsMoveDialogOpen] = useState(false);
  const [selectedMoveContext, setSelectedMoveContext] = useState<string>('');
  const [isMoving, setIsMoving] = useState(false);

  // Separate loading state for secondary data (missions, rewards, etc.)
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
  const [isDeleteInstanceConfirmOpen, setIsDeleteInstanceConfirmOpen] = useState(false);
  const [instanceStatusFilter, setInstanceStatusFilter] = useState<'all' | 'active' | 'redeemed' | 'disabled'>('all');

  // School Schedule States
  const [isEntryDialogOpen, setIsEntryDialogOpen] = useState(false);
  const [entryToEdit, setEntryToEdit] = useState<SchoolScheduleEntry | null>(null);
  const [entryToDelete, setEntryToDelete] = useState<SchoolScheduleEntry | null>(null);

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
            getRewardTemplatesByOwnerOrFamily(user.uid, familyIdToQuery)
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
            
            // Set the child ID in context if it changed
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
        // The useEffect above will trigger the data refetch for the new child
    }
  };


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
                        longestPerfectStreak = longestPerfectStreak;
                    }
                    currentPerfectStreak = 0;
                }
            }
        }
    }
    if (currentPerfectStreak > longestPerfectStreak) {
        longestPerfectStreak = longestPerfectStreak;
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

    let totalCompletedOccurrences = 0;
    let totalStarsEarned = 0;

    missionInstances.forEach(m => {
        if (m.completionLog) {
            Object.values(m.completionLog).forEach(logEntry => {
                totalCompletedOccurrences++;
                totalStarsEarned += logEntry.stars || 0;
            });
        }
    });

    const pendingMissionsCount = missionInstances.filter(m => m.status === 'pending').length;
    const redeemedRewardsCount = childRewards.filter(r => r.status === 'redeemed').length;
    const availableRewardsCount = childRewards.filter(r => r.status === 'active').length;
    const earnedBadgesCount = child.earnedBadgeIds?.length || 0;

    return {
      completedMissions: totalCompletedOccurrences,
      starsEarned: child.totalStars,
      rewardsRedeemed: redeemedRewardsCount,
      pendingMissions: pendingMissionsCount,
      availableRewards: availableRewardsCount,
      earnedBadges: earnedBadgesCount,
    };
  }, [child, missionInstances, childRewards]);

  const collaboratorsMap = useMemo(() => {
    const map = new Map(collaborators.map(c => [c.uid, c]));
    if (user && !map.has(user.uid)) {
        map.set(user.uid, user as UserProfile);
    }
    return map;
  }, [collaborators, user]);

  const getMissionTypeLabel = (mission: MissionInstance): string => {
    if (!mission.isRecurring) return "única";
    if (mission.recurrenceRule?.freq === 'DAILY') return "diária";
    if (mission.recurrenceRule?.freq === 'WEEKLY') return "semanal";
    return "recorrente";
  };


  const activities = useMemo((): Activity[] => {
    if (!missionInstances || !childRewards) return [];

    const redeemedRewards: Activity[] = childRewards
      .filter(r => r.status === 'redeemed' && r.redeemedAt)
      .map(r => ({
          ...r,
          type: 'reward' as const,
          completedAt: r.redeemedAt!,
          actorId: r.actorId,
          actorName: r.actorId ? collaboratorsMap.get(r.actorId)?.name : child?.name
      }));

    const completedMissions: Activity[] = missionInstances.flatMap(m =>
      Object.entries(m.completionLog || {}).map(([dateStr, logEntry]) => ({
        ...m,
        type: 'mission' as const,
        scheduledFor: parse(dateStr, 'yyyy-MM-dd', new Date()),
        missionTypeLabel: getMissionTypeLabel(m),
        completionLogEntry: {
          ...logEntry,
          actorId: logEntry.actorId,
          actorName: logEntry.actorId ? collaboratorsMap.get(logEntry.actorId)?.name : child?.name
        }
      }))
    );

    const allActivities: Activity[] = [...redeemedRewards, ...completedMissions];

    allActivities.sort((a, b) => {
        const timeA = a.type === 'mission' ? a.completionLogEntry?.completedAt : a.completedAt;
        const timeB = b.type === 'mission' ? b.completionLogEntry?.completedAt : b.completedAt;

        const dateA = timeA ? new Date(timeA as any).getTime() : 0;
        const dateB = timeB ? new Date(timeB as any).getTime() : 0;

        return dateB - dateA;
    });

    return allActivities.slice(0, 10);
  }, [missionInstances, childRewards, collaboratorsMap, child?.name]);


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
      
      // Optimistic update
      setChild(prev => prev ? { ...prev, stars: prev.stars - instanceToManage.starsCost } : null);
      setChildRewards(prev => prev.map(r => r.id === instanceToManage.id ? { ...r, status: 'redeemed', redeemedAt: new Date().toISOString() as any } : r));

      toast({ title: "Recompensa Resgatada!", description: `"${instanceToManage.title}" foi resgatada por ${child.name}. Que incrível!` });
    } catch (error: any) {
      console.error("Error marking reward as redeemed:", error);
      toast({ title: "Erro ao Resgatar", description: error.message || "Não foi possível marcar a recompensa como resgatada.", variant: "destructive" });
      if (child) await fetchDataForChild(child.id); // Revert on error
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
      setChildRewards(prev => prev.map(r => r.id === instance.id ? { ...r, status: newStatus } : r)); // Optimistic update
      toast({
        title: "Status da Recompensa Atualizado",
        description: `A recompensa "${instance.title}" agora está ${newStatus === 'active' ? 'disponível' : 'indisponível'} para ${child?.name}.`
      });
    } catch (error) {
      console.error(`Error toggling reward instance status:`, error);
      toast({ title: "Erro ao Atualizar Status", description: "Não foi possível alterar o status da recompensa.", variant: "destructive" });
      if (child) await fetchDataForChild(child.id); // Revert on error
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteInstance = async () => {
    if (!instanceToManage || !user) return;
    setIsDeleting(true);
    try {
      await deleteChildRewardInstance(user, instanceToManage.id);
      setChildRewards(prev => prev.filter(r => r.id !== instanceToManage.id)); // Optimistic update
      toast({ title: "Recompensa Removida", description: `A recompensa "${instanceToManage.title}" foi retirada da lista de ${child?.name}.` });
    } catch (error) {
      console.error("Error deleting reward instance:", error);
      toast({ title: "Erro ao Remover Atribuição", description: "Não foi possível remover a recompensa.", variant: "destructive" });
      if (child) await fetchDataForChild(child.id); // Revert on error
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
      setSchoolSchedule(prev => prev.filter(e => e.id !== entryToDelete.id)); // Optimistic update
      toast({ title: "Aula removida", description: `A aula de ${entryToDelete.subject} foi removida.` });
    } catch (error) {
      console.error("Error deleting school schedule entry:", error);
      toast({ title: "Erro ao remover aula", variant: 'destructive' });
      if (child) await fetchDataForChild(child.id); // Revert on error
    } finally {
      setIsDeleting(false);
      setEntryToDelete(null);
      setIsEntryDialogOpen(false); // Close edit dialog if delete is triggered from there
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

  const moveTargetContexts = useMemo(() => {
    return availableContexts.filter(c => c.id !== (child?.familyId || 'my-space'));
  }, [availableContexts, child]);

  const hasRecess = useMemo(() => {
    return schoolSchedule.some(entry => entry.subject === 'Recreio/Intervalo');
  }, [schoolSchedule]);

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
              <Link href="/dashboard/novo-heroi">
                  <Button size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90 shadow-lg animate-pulse">
                      <PlusCircle className="mr-2 h-4 w-4" /> Adicione Seu Primeiro Herói
                  </Button>
              </Link>
            </CardContent>
        </Card>
    );
  }

  // Safeguard against rendering before child data is available.
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
                          <span className="text-2xl font-bold">{child.stars}</span>
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
             <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[...Array(8)].map((_, i) => (
                    <Card key={i}><CardHeader><Skeleton className="h-20 w-full" /></CardHeader></Card>
                ))}
             </div>
          ) : (
            <>
                <TabsContent value="overview" className="space-y-6">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <UnlockedRewards childrenProfiles={[child]} rewardTemplates={rewardTemplates} />
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
                <Card className="shadow-md">
                <CardHeader>
                    <CardTitle>Quadro de Recompensas de {child.name}</CardTitle>
                    <CardDescription>Veja e gerencie as recompensas disponíveis para {child.name}.</CardDescription>
                    <div className="pt-4">
                    <Label className="text-sm font-medium text-muted-foreground">Filtrar por Status da Recompensa:</Label>
                    <RadioGroup
                        value={instanceStatusFilter}
                        onValueChange={(value) => setInstanceStatusFilter(value as 'all' | 'active' | 'redeemed' | 'disabled')}
                        className="flex flex-wrap gap-x-4 gap-y-2 pt-2"
                    >
                        <div className="flex items-center space-x-2">
                        <RadioGroupItem value="all" id={`instance-filter-all-${selectedChildId}`} />
                        <Label htmlFor={`instance-filter-all-${selectedChildId}`} className="cursor-pointer hover:text-primary text-sm font-normal">Todas</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                        <RadioGroupItem value="active" id={`instance-filter-active-${selectedChildId}`} />
                        <Label htmlFor={`instance-filter-active-${selectedChildId}`} className="cursor-pointer hover:text-primary text-sm font-normal">Ativas</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                        <RadioGroupItem value="redeemed" id={`instance-filter-redeemed-${selectedChildId}`} />
                        <Label htmlFor={`instance-filter-redeemed-${selectedChildId}`} className="cursor-pointer hover:text-primary text-sm font-normal">Resgatadas</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                        <RadioGroupItem value="disabled" id={`instance-filter-disabled-${selectedChildId}`} />
                        <Label htmlFor={`instance-filter-disabled-${selectedChildId}`} className="cursor-pointer hover:text-primary text-sm font-normal">Inativas</Label>
                        </div>
                    </RadioGroup>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Button onClick={() => router.push('/dashboard/rewards')} variant="outline" className="mb-4 shadow-sm">
                    <ExternalLink className="mr-2 h-4 w-4" /> Ir para o Quadro de Recompensas
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
            <TabsContent value="badges" className="space-y-6">
                <Dialog open={isAboutBadgesOpen} onOpenChange={setIsAboutBadgesOpen}>
                <Card className="shadow-md">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>Quadro de Medalhas de {child.name}</CardTitle>
                                <CardDescription>Todas as medalhas heroicas e troféus especiais ganhos na jornada.</CardDescription>
                            </div>
                            <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                                <Info className="mr-2 h-4 w-4" /> Sobre as Medalhas
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
                                    {category.items.map((badge) => (
                                        <DialogTrigger asChild key={badge.id}>
                                        <BadgeCard badge={badge} child={child} badgeProgress={badgeProgress} isCalculatingProgress={isCalculatingProgress} onClick={() => setSelectedBadge(badge)} />
                                        </DialogTrigger>
                                    ))}
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
                            O Quadro de Medalhas
                        </DialogTitle>
                        <DialogDescription className="pt-2">
                            As medalhas celebram a jornada do seu heroi, reconhecendo desde os primeiros passos até a maestria.
                        </DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="max-h-[60vh] -mx-6 px-6">
                        <div className="space-y-4 text-sm text-muted-foreground pb-4 pr-1">
                            <p>As medalhas no Mini Herois são como troféus especiais que celebram todo tipo de conquista heroica, indo além das recompensas do dia a dia. Elas marcam momentos importantes na jornada da criança, desde o primeiro passo até a maestria, e são divididas em categorias para reconhecer diferentes tipos de esforço.</p>

                            <h4 className="font-bold text-foreground pt-2">Iniciação e Primeiros Passos</h4>
                            <p>Estas são as medalhas de boas-vindas! Elas celebram os primeiros momentos da jornada de um heroi, incentivando-o a começar com o pé direito.</p>
                            <ul className="list-disc pl-5 space-y-1">
                                <li><strong>Heroi Novato:</strong> Conquistada ao completar a primeira missão.</li>
                                <li><strong>Defensor do Sorriso:</strong> Ganha ao fazer a missão "Escovar os dentes" pela primeira vez.</li>
                                <li><strong>Guardião do Descanso:</strong> Recebida ao arrumar a cama pela primeira vez.</li>
                            </ul>

                            <h4 className="font-bold text-foreground pt-2">Consistência e Hábitos</h4>
                            <p>Aqui, o que vale é a dedicação! Estas medalhas recompensam a criação de rotinas e a persistência, que são a base para a formação de hábitos sólidos.</p>
                            <ul className="list-disc pl-5 space-y-1">
                                <li><strong>Guardião da Rotina:</strong> Para quem completa a mesma missão por 7 dias seguidos.</li>
                                <li><strong>Semana Perfeita:</strong> Um grande feito! Para quem completa todas as missões agendadas durante 7 dias consecutivos.</li>
                                <li><strong>Mestre da Persistência:</strong> Uma medalha rara para quem completa a mesma missão por 30 dias seguidos.</li>
                            </ul>

                            <h4 className="font-bold text-foreground pt-2">Maestria e Progresso</h4>
                            <p>Estas medalhas marcam os grandes marcos de progresso, celebrando o acúmulo de experiência e recompensas ao longo do tempo.</p>
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

                            <p className="pt-2">Em resumo, o sistema de medalhas cria um "mural de honra" que mostra o crescimento e a evolução do Mini Heroi, valorizando não apenas a conclusão das tarefas, mas também a dedicação, a variedade e o progresso na jornada.</p>
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

export default function MuralCompleto() {
    return (
        <Suspense>
            <MuralCompletoPageContent />
        </Suspense>
    )
}

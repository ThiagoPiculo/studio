
"use client";

import { useEffect, useState, useMemo, Suspense, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, Star, PlusCircle, Smile, Loader2, Settings, Gift, ListChecks, NotebookPen, Medal, CheckSquare, Target, ArrowRight, Square, Info, BadgeCheck, RefreshCw, ChevronDown, ChevronUp, Home, Link as LinkIcon, HelpCircle } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { useRouter, useSearchParams } from 'next/navigation';
import type { ChildProfile, MissionTemplate, RewardTemplate, MissionInstance, SchoolScheduleEntry } from "@/lib/types";
import { 
    getChildProfilesForAttribution,
    getMissionInstancesForContext,
    regenerateChildAccessCode,
    getSchoolScheduleForContext,
    getRewardTemplatesByOwnerOrFamily,
} from "@/lib/firebase/firestore";
import type { Timestamp } from "firebase/firestore";
import { GettingStartedGuide } from '@/components/dashboard/GettingStartedGuide';
import { isMissionScheduledForDate, isMissionCompletedForDate, getDateObject, getDayToWeekday } from "@/lib/calendar-utils";
import { cn, getInitials } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { format } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { allBadgesMap } from "@/lib/badges";
import Loading from "./loading";
import { LevelUpPath } from "@/components/dashboard/LevelUpPath";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/contexts/AuthContext';
import { useFamily } from '@/contexts/FamilyContext';
import { HeroSelector } from "@/components/dashboard/dashboard/HeroSelector";
import { Progress } from "@/components/ui/progress";

// This component shows the main hero summary cards
function HeroesSummary({ allChildren, missionInstances, rewardTemplates }: { allChildren: ChildProfile[], missionInstances: MissionInstance[], rewardTemplates: RewardTemplate[] }) {
  const router = useRouter();
  const { toast } = useToast();
  
  const [isRegenerating, setIsRegenerating] = useState<string | null>(null);
  const [expandedHeroes, setExpandedHeroes] = useState<Set<string>>(new Set());
  const [schoolSchedule, setSchoolSchedule] = useState<SchoolScheduleEntry[]>([]);
  const { user, loading: authLoading } = useAuth();
  const { currentContext } = useFamily();
  const [selectedHeroId, setSelectedChildId] = useState<string | null>(null);

  const totalBadgesCount = allBadgesMap.size;

  useEffect(() => {
    if (user) {
        const familyIdToQuery = currentContext === 'my-space' ? null : currentContext;
        getSchoolScheduleForContext(user.uid, familyIdToQuery).then(setSchoolSchedule);
    }
  }, [user, currentContext]);

  const toggleMissionsExpansion = (childId: string) => {
    setExpandedHeroes(prev => {
        const newSet = new Set(prev);
        if (newSet.has(childId)) {
            newSet.delete(childId);
        } else {
            newSet.add(childId);
        }
        return newSet;
    });
  };

  const handleRegenerateAccessCode = async (childId: string, childName: string) => {
    if (isRegenerating) return;
    setIsRegenerating(childId);
    try {
      const newCode = await regenerateChildAccessCode(childId);
      toast({
        title: "Nova Chave Secreta Gerada!",
        description: `A nova chave de ${childName} é ${newCode}.`,
        duration: 10000,
      });
      // The parent component will refetch and update the state.
    } catch (error) {
      console.error("Error regenerating code:", error);
      toast({ title: "Erro ao gerar nova chave", variant: "destructive" });
    } finally {
      setIsRegenerating(null);
    }
  };

  const calculateAge = (birthDate?: Timestamp): number | null => {
    if (!birthDate) return null;
    const today = new Date();
    const birthDateObj = birthDate.toDate();
    let age = today.getFullYear() - birthDateObj.getFullYear();
    const m = today.getMonth() - birthDateObj.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDateObj.getDate())) {
      age--;
    }
    return age;
  };
  
  const todaysSchoolEntries = useMemo(() => {
    const todayWeekday = getDayToWeekday[new Date().getDay()];
    return schoolSchedule
        .filter(entry => entry.dayOfWeek === todayWeekday)
        .sort((a,b) => a.startTime.localeCompare(b.startTime));
  }, [schoolSchedule]);
  
  const today = format(new Date(), 'yyyy-MM-dd');
  
  const filteredChildren = useMemo(() => {
      if (!selectedHeroId) return allChildren;
      return allChildren.filter(c => c.id === selectedHeroId);
  }, [selectedHeroId, allChildren]);

  return (
    <div className="space-y-8">
      {allChildren.length === 0 ? (
          <GettingStartedGuide 
            hasChildren={false}
            hasMissions={false}
            hasRewards={false}
          />
      ) : (
      <section>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <h2 className="text-2xl font-headline">Resumo do Dia</h2>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {allChildren.length > 1 && (
                <HeroSelector
                    heroes={allChildren}
                    selectedHeroId={selectedHeroId}
                    onSelectHero={setSelectedChildId}
                    showAllOption={true}
                />
            )}
            <Link href="/dashboard/onboarding" className="sm:w-auto">
                <Button className="shadow-md w-full"><PlusCircle className="mr-2 h-4 w-4" /> Novo Mini Heroi</Button>
            </Link>
          </div>
        </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {filteredChildren.map((child) => {
              const age = calculateAge(child.birthDate);
              
              const todaysMissions: MissionInstance[] = missionInstances
                .filter(inst => inst.childId === child.id && isMissionScheduledForDate(inst, new Date()))
                .sort((a, b) => {
                    const timeA = a.startDate?.toDate() || a.dueDate?.toDate();
                    const timeB = b.startDate?.toDate() || b.dueDate?.toDate();
                    if (!timeA || !timeB) return 0;
                    const minutesA = timeA.getHours() * 60 + timeA.getMinutes();
                    const minutesB = timeB.getHours() * 60 + timeB.getMinutes();
                    return minutesA - minutesB;
                });
              
              const completedTodaysMissions = todaysMissions.filter(inst => isMissionCompletedForDate(inst, new Date()));
              const todaysMissionsCount = todaysMissions.length;
              const completedTodaysMissionsCount = completedTodaysMissions.length;

              const { starsEarnedToday, xpEarnedToday } = completedTodaysMissions.reduce((acc, mission) => {
                  acc.starsEarnedToday += mission.starsReward;
                  acc.xpEarnedToday += mission.xpReward;
                  return acc;
              }, { starsEarnedToday: 0, xpEarnedToday: 0 });
              
              const availableRewardsCount = rewardTemplates.filter(r => r.status === 'active' && child.stars >= r.starsCost).length;
              const unlockedAchievementsCount = child.earnedBadgeIds?.length || 0;
              
              const isExpanded = expandedHeroes.has(child.id);
              const missionsToShow = isExpanded ? todaysMissions : todaysMissions.slice(0, 5);
             
              return (
              <Card key={child.id} className="shadow-md hover:shadow-lg transition-all duration-300 ease-in-out flex flex-col transform hover:-translate-y-1">
                <CardHeader className="p-4 relative">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                    <Link href={`/dashboard/mural?childId=${child.id}`} className="absolute top-2 right-2 z-10">
                      <Button variant="link" className="h-8 px-2 py-1 text-xs font-medium text-muted-foreground hover:text-primary rounded-full">
                          Painel de Progresso <ArrowRight className="ml-1.5 h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                  <div className="flex items-center gap-4 mt-2">
                     <Avatar
                        className="h-16 w-16 text-2xl shadow-sm ring-2 ring-offset-2 ring-[var(--ring-color)] ring-offset-background"
                        style={child.color ? { '--ring-color': child.color } as React.CSSProperties : {}}
                      >
                        <AvatarImage src={child.avatar} alt={child.name} />
                        <AvatarFallback
                          className="font-bold"
                          style={child.color ? { backgroundColor: child.color } : {}}
                        >
                          {getInitials(child.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-grow overflow-hidden">
                        <CardTitle className="text-2xl font-semibold truncate">{child.name}</CardTitle>
                         <div className="flex flex-col md:flex-row md:items-center md:gap-2 text-muted-foreground text-xs">
                          <div className="flex items-center gap-1 font-mono">
                            <span className="font-sans font-semibold">Chave Secreta:</span>
                            <span className="tracking-wider font-bold text-foreground">{child.accessCode}</span>
                             <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-5 w-5"
                                    onClick={() => handleRegenerateAccessCode(child.id, child.name)}
                                    disabled={isRegenerating === child.id}
                                  >
                                    {isRegenerating === child.id ? <Loader2 className="h-3 w-3 animate-spin"/> : <RefreshCw className="h-3 w-3" />}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>Gerar nova Chave Secreta</p></TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </div>
                      </div>
                  </div>
                </CardHeader>

                <CardContent className="p-4 pt-0">
                   <div className="space-y-4">
                       <div className="flex items-center justify-around gap-4 w-full">
                            <div className="flex items-center gap-1.5">
                               <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground"><Info className="h-4 w-4" /></Button>
                                        </TooltipTrigger>
                                        <TooltipContent className="max-w-xs text-center">
                                            <p>Complete missões para ganhar Estrelas (⭐) para resgatar recompensas e XP (🛡️) para subir de nível!</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                                <Star className="h-5 w-5 fill-amber-400 text-amber-500" />
                                <span className="text-xl font-bold text-amber-600">{child.stars}</span>
                            </div>
                           <div className="flex items-center gap-1.5">
                              <BadgeCheck className="h-5 w-5 text-blue-500" />
                              <span className="text-xl font-bold text-blue-600">{child.xp}</span>
                              <span className="text-xs text-muted-foreground font-semibold">(Nível {child.level})</span>
                           </div>
                       </div>
                       {todaysMissionsCount > 0 ? (
                        <div className="space-y-2 pt-1">
                            <div className="flex justify-between items-baseline text-xs text-muted-foreground">
                                <span className="font-semibold">Missões de Hoje: {completedTodaysMissionsCount} de {todaysMissionsCount}</span>
                            </div>
                            <Progress value={(completedTodaysMissionsCount / todaysMissionsCount) * 100} className="h-3" />
                        </div>
                        ) : (
                        <div className="text-center text-xs text-muted-foreground py-3 px-2 rounded-md bg-muted/50">
                            Dia de descanso do herói! Nenhuma missão hoje.
                        </div>
                        )}
                    </div>
                </CardContent>
                
                <div className="px-4 pb-0 flex-grow">
                   <Tabs defaultValue="missions">
                        <TabsList className="grid w-full grid-cols-2 h-auto p-1 text-xs h-9">
                            <TabsTrigger value="missions" className="py-1.5 text-xs justify-center">Missões de Hoje</TabsTrigger>
                            <TabsTrigger value="school" className="py-1.5 text-xs justify-center">Rotina Escolar</TabsTrigger>
                        </TabsList>
                        <TabsContent value="missions">
                            <div className="h-auto w-full mt-2">
                                <ul className="space-y-1 pr-1">
                                {todaysMissions.length > 0 ? (
                                  missionsToShow.map(item => {
                                    const isCompleted = completedTodaysMissions.some(cm => cm.id === item.id);
                                    const eventTime = item.startDate ? (item.startDate instanceof Date ? item.startDate : item.startDate.toDate()) : new Date(0);
                                    const formattedTime = format(eventTime, 'HH:mm');
                                    const popoverId = `${item.id}-${today}`;
                                    const href = `/dashboard/agenda?view=day&focus_date=${today}&open_popover=${popoverId}`;
                                    
                                    return (
                                        <li key={item.id}>
                                        <Link href={href} className="block">
                                            <div className={cn(
                                            "text-xs flex items-center gap-1.5 p-1.5 rounded-md transition-colors",
                                            isCompleted ? "bg-green-500/10 text-muted-foreground" : "bg-background hover:bg-accent/50"
                                            )}>
                                            {isCompleted ? (
                                                <CheckSquare className="h-3.5 w-3.5 text-green-500 shrink-0" />
                                            ) : (
                                                <Square className="h-3.5 w-3.5 text-primary shrink-0" />
                                            )}
                                            <span className="font-semibold text-foreground/80">{formattedTime}</span>
                                            {item.emoji && <span className="text-sm">{item.emoji}</span>}
                                            <span className={cn("truncate flex-grow", isCompleted ? "line-through font-normal" : "font-semibold")}>
                                                {item.title}
                                            </span>
                                            </div>
                                        </Link>
                                        </li>
                                    );
                                  })
                                ) : (
                                <p className="text-xs text-muted-foreground text-center py-2 px-1">
                                    Dia de descanso do heroi!
                                </p>
                                )}
                                </ul>
                            </div>
                        </TabsContent>
                        <TabsContent value="school">
                             <div className="h-[145px] w-full mt-2">
                                <ul className="space-y-1 pr-3">
                                {todaysSchoolEntries.filter(e => e.childId === child.id).length > 0 ? (
                                    todaysSchoolEntries.filter(e => e.childId === child.id).map(entry => (
                                        <li key={entry.id}>
                                            <div className="text-xs flex items-center gap-1.5 p-1.5 rounded-md" style={{ borderLeft: `4px solid ${entry.color}`}}>
                                                <NotebookPen className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                                <span className="font-semibold text-foreground/80">{entry.startTime}</span>
                                                <span className="truncate flex-grow font-semibold">{entry.subject}</span>
                                            </div>
                                        </li>
                                    ))
                                ) : (
                                    <p className="text-xs text-muted-foreground text-center py-2 px-1">
                                        Nenhuma aula hoje.
                                    </p>
                                )}
                                </ul>
                             </div>
                        </TabsContent>
                    </Tabs>
                </div>

                {todaysMissions.length > 5 && (
                    <button
                        onClick={() => toggleMissionsExpansion(child.id)}
                        className="w-full text-xs font-semibold text-primary p-2 flex items-center justify-center gap-2 hover:bg-primary/5 rounded-b-md cursor-pointer"
                    >
                        {isExpanded ? (
                            <>Ver menos <ChevronUp className="h-4 w-4" /></>
                        ) : (
                            <>+ {todaysMissions.length - 5} missões <ChevronDown className="h-4 w-4" /></>
                        )}
                    </button>
                )}


                <CardFooter className="grid grid-cols-3 gap-1 text-center p-1 border-t bg-muted/20 mt-auto">
                    <div className="p-2 flex flex-col items-center justify-center gap-1">
                        <div className="flex min-h-[36px] items-center justify-center gap-1.5">
                            <span className="font-semibold text-sm text-green-600">+{starsEarnedToday} <span className="text-amber-500">⭐</span></span>
                            <Separator orientation="vertical" className="h-4" />
                            <span className="font-semibold text-sm text-blue-600">+{xpEarnedToday} <span className="font-bold">XP</span></span>
                        </div>
                        <p className="text-xs text-muted-foreground leading-tight">Ganhos do Dia</p>
                    </div>
                    <Link href={`/dashboard/mural?childId=${child.id}&tab=rewards`} className="p-2 rounded-md hover:bg-primary/10 transition-colors flex flex-col items-center justify-center gap-1">
                        <div className="flex min-h-[36px] items-center justify-center gap-1.5">
                            <Gift className="h-5 w-5 text-chart-1" />
                            <span className="font-bold text-lg leading-none">{availableRewardsCount}</span>
                        </div>
                         <p className="text-xs text-muted-foreground leading-tight flex items-center">Recompensas <ArrowRight className="ml-1 h-3 w-3" /></p>
                    </Link>
                    <Link href={`/dashboard/mural?childId=${child.id}&tab=badges`} className="p-2 rounded-md hover:bg-primary/10 transition-colors flex flex-col items-center justify-center gap-1">
                      <div className="flex min-h-[36px] items-center justify-center gap-1.5">
                          <Medal className="h-5 w-5 text-chart-5" />
                          <span className="font-bold text-lg leading-none">{unlockedAchievementsCount}</span>
                           <span className="text-xl text-muted-foreground font-light pb-0.5">/</span>
                           <span className="font-bold text-lg leading-none">{totalBadgesCount}</span>
                      </div>
                       <p className="text-xs text-muted-foreground leading-tight flex items-center">Medalhas <ArrowRight className="ml-1 h-3 w-3" /></p>
                    </Link>
                </CardFooter>
              </Card>
            )})}
          </div>
      </section>
      )}
    </div>
  );
}

// This component shows the context selection cards
function ContextSelector({ allChildren, onContextSelect }: { allChildren: ChildProfile[], onContextSelect: (contextId: string) => void }) {
    const { availableContexts } = useFamily();

    const childrenByContext = useMemo(() => {
        const map = new Map<string, ChildProfile[]>();
        allChildren.forEach(child => {
            const contextId = child.familyId || 'my-space';
            if (!map.has(contextId)) {
                map.set(contextId, []);
            }
            map.get(contextId)!.push(child);
        });
        return map;
    }, [allChildren]);
    
    const renderContextCard = (
      contextId: string, 
      title: string, 
      description: string, 
      Icon: React.ElementType
    ) => {
      const childrenForContext = childrenByContext.get(contextId) || [];
      const hasChildren = childrenForContext.length > 0;

      return (
        <Card key={contextId} className="flex flex-col shadow-md hover:shadow-lg transition-all h-full">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Icon className={cn(contextId === 'my-space' ? "text-primary" : "text-chart-4")}/> {title}
                </CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow space-y-3">
                {hasChildren ? (
                  <div className="flex items-center">
                      <div className="flex -space-x-2">
                          {childrenForContext.slice(0, 5).map(child => (
                              <Avatar key={child.id} className="h-8 w-8 border-2 border-background">
                                  <AvatarImage src={child.avatar} alt={child.name} />
                                  <AvatarFallback style={{backgroundColor: child.color}}>{getInitials(child.name)}</AvatarFallback>
                              </Avatar>
                          ))}
                      </div>
                      {childrenForContext.length > 5 && (
                          <span className="text-xs font-medium text-muted-foreground ml-3">
                              + {childrenForContext.length - 5}
                          </span>
                      )}
                  </div>
                ) : null}
                <p className="text-sm text-muted-foreground">
                    {hasChildren 
                      ? `Contém ${childrenForContext.length} herói(s).`
                      : 'Nenhum herói aqui ainda.'
                    }
                </p>
            </CardContent>
            <CardFooter>
                <Button className="w-full" onClick={() => onContextSelect(contextId)}>
                    Acessar {contextId === 'my-space' ? 'Meu Espaço' : 'Aliança'} <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
            </CardFooter>
        </Card>
      );
    };

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
            <h2 className="text-2xl font-headline">Selecione um Espaço</h2>
            <Popover>
                <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                        <HelpCircle className="h-5 w-5" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72 text-sm">
                    Escolha qual equipe de heróis você deseja visualizar.
                </PopoverContent>
            </Popover>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {renderContextCard(
                'my-space', 
                'Meu Espaço', 
                'Seu espaço privado para gerenciar heróis individualmente.', 
                Home
            )}
            {availableContexts.filter(c => c.id !== 'my-space').map(context =>
              renderContextCard(
                  context.id,
                  `Aliança: ${context.name}`,
                  'Aliança compartilhada com outros responsáveis.',
                  LinkIcon
              )
            )}
        </div>
      </div>
    );
}

function HeroesPageContent() {
  const { user, loading: authLoading } = useAuth();
  const { currentContext, availableContexts, setCurrentContext, isLoading: isFamilyLoading } = useFamily();
  
  const [allChildren, setAllChildren] = useState<ChildProfile[]>([]);
  const [allMissions, setAllMissions] = useState<MissionInstance[]>([]);
  const [allRewards, setAllRewards] = useState<RewardTemplate[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [contextSelected, setContextSelected] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();

  const handleContextSelection = (contextId: string) => {
    setCurrentContext(contextId);
    setContextSelected(true);
  };

  // This is now the definitive data fetcher. It gets everything.
  const fetchData = useCallback(async () => {
    if (!user) {
        setIsLoadingData(false);
        return;
    }
    setIsLoadingData(true);
    
    try {
        const [childrenArrays, missionArrays, rewardArrays] = await Promise.all([
            Promise.all(availableContexts.map(context => getChildProfilesForAttribution(user.uid, context.id))),
            Promise.all(availableContexts.map(context => getMissionInstancesForContext(user.uid, context.id === 'my-space' ? null : context.id))),
            Promise.all(availableContexts.map(context => getRewardTemplatesByOwnerOrFamily(user.uid, context.id === 'my-space' ? null : context.id))),
        ]);
        
        const flatChildren = childrenArrays.flat();
        const uniqueChildren = Array.from(new Map(flatChildren.map(c => [c.id, c])).values());
        
        setAllChildren(uniqueChildren);
        setAllMissions(missionArrays.flat());
        setAllRewards(rewardArrays.flat());
    } catch (error) {
        console.error("Error fetching all dashboard data:", error);
    } finally {
        setIsLoadingData(false);
    }
  }, [user, availableContexts]);
  
  useEffect(() => {
    if (!isFamilyLoading) {
      fetchData();
    }
  }, [fetchData, isFamilyLoading]);

  // Children filtered for the *currently selected* context
  const childrenInCurrentContext = useMemo(() => {
    return allChildren.filter(c => (c.familyId || 'my-space') === currentContext);
  }, [allChildren, currentContext]);

  // Logic to handle initial redirect or view selection
  useEffect(() => {
    if (isFamilyLoading || isLoadingData) return;

    const initialLoad = searchParams.get('initial_load') === 'true';

    if (initialLoad) {
      const preferredPage = user?.settings?.initialPage || 'heroes';
      
      // Navigate away from heroes if it's not the preferred page
      if (preferredPage !== 'heroes') {
        router.replace(`/dashboard/${preferredPage}`);
        return;
      }
      
      // Clean up URL
      const newUrl = new URL(window.location.toString());
      newUrl.searchParams.delete('initial_load');
      window.history.replaceState({}, '', newUrl);
    }
  }, [isFamilyLoading, isLoadingData, user, searchParams, router]);


  // Render logic
  if (authLoading || isFamilyLoading || isLoadingData) {
    return <Loading />;
  }
  
  const hasAlliances = availableContexts.length > 1;

  const missionsForCurrentContext = allMissions.filter(m => {
    const missionContext = m.familyId || 'my-space';
    return missionContext === currentContext;
  });

  const rewardsForCurrentContext = allRewards.filter(r => {
    const rewardContext = r.familyId || 'my-space';
    return rewardContext === currentContext;
  });
  
  // If user has multiple contexts and hasn't chosen one, show selector.
  // Otherwise, show the summary for the current context.
  if (hasAlliances && !contextSelected) {
    return <ContextSelector allChildren={allChildren} onContextSelect={handleContextSelection} />;
  }
  
  return <HeroesSummary allChildren={childrenInCurrentContext} missionInstances={missionsForCurrentContext} rewardTemplates={rewardsForCurrentContext} />;
}


export default function HeroesPage() {
  return (
      <Suspense fallback={<Loading />}>
          <HeroesPageContent />
      </Suspense>
  )
}
